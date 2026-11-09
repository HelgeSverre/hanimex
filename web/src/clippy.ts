import type { Controls, Game, SoundEvent } from "./games";

export const demoScenes = [
  "Chrome 95",
  "Window tunnel",
  "Raster rave",
  "Folder storm",
  "Error cascade",
  "Starfield",
  "Plasma help",
  "Paperclip army",
  "Desktop meltdown",
  "Final assembly",
] as const;
export interface DemoNote {
  voice: "kick" | "snare" | "hat" | "bass" | "lead";
  midi: number;
  length: number;
}
const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(high, n));
const palettes = [
  ["#00d6d6", "#fd54d0", "#ffe36d"],
  ["#ff9c36", "#8188ff", "#b9ff5a"],
];

/** Fictional PC-000 cartridge. Fixed-step visuals and notes share one beat clock. */
export class ClippyDemo implements Game {
  scores = [0, 0];
  ended = false;
  time = 0;
  boot = 0;
  scene: number;
  yaw = 0;
  pitch = 0;
  bend = 0;
  stretch = 1;
  beat = 0;
  pulse = 0;
  glitch = 0;
  auto = true;
  fast = false;
  palette = 0;
  trails = false;
  private autoTime = 0;
  private nextStep = 0;
  private lastFire = [false, false];
  private notes: DemoNote[] = [];
  private trailCanvas?: HTMLCanvasElement;
  private plasmaCanvas?: HTMLCanvasElement;
  readonly reducedMotion: boolean;
  constructor(
    mode = 0,
    reducedMotion = typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  ) {
    this.scene = clamp(Math.floor(mode), 0, 9);
    this.reducedMotion = reducedMotion;
  }
  setScene(mode: number) {
    this.scene = clamp(Math.floor(mode), 0, 9);
    this.boot = 4;
    this.autoTime = 0;
    this.trailCanvas = undefined;
  }
  update(dt: number, input: Controls) {
    this.time += dt * (input.fast ? 164 / 124 : 1);
    this.boot += dt;
    this.fast = input.fast;
    this.auto = input.autoServe;
    this.palette = input.smallLeft ? 1 : 0;
    this.trails = input.smallRight && !this.reducedMotion;
    this.yaw = clamp(this.yaw + input.left.x * dt * 1.8, -Math.PI, Math.PI);
    this.pitch = clamp(this.pitch + input.left.y * dt, -0.8, 0.8);
    this.bend = clamp(this.bend + input.right.x * dt * 1.4, -1, 1);
    this.stretch = clamp(this.stretch - input.right.y * dt, 0.55, 1.8);
    this.pulse = Math.max(0, this.pulse - dt * 2.8);
    this.glitch = Math.max(0, this.glitch - dt * 2);
    const fire = [input.left.fire, input.right.fire];
    if (fire[0] && !this.lastFire[0]) {
      this.pulse = 1;
      this.notes.push({ voice: "kick", midi: 36, length: 0.22 });
    }
    if (fire[1] && !this.lastFire[1]) {
      this.glitch = 1;
      this.notes.push({ voice: "snare", midi: 48, length: 0.16 });
    }
    this.lastFire = fire;
    if (this.boot < 3.5) return;
    this.beat += (dt * (this.fast ? 164 : 124)) / 60;
    if (this.auto) {
      this.autoTime += dt;
      if (this.autoTime >= 12) {
        this.scene = (this.scene + 1) % 10;
        this.autoTime = 0;
      }
    }
    const step = Math.floor(this.beat * 4);
    if (step >= this.nextStep) {
      this.nextStep = step + 1;
      const n = step % 16;
      const root = [40, 36, 43, 38][Math.floor(step / 32) % 4];
      if (n % 4 === 0)
        this.notes.push({ voice: "kick", midi: 36, length: 0.18 });
      if (n % 8 === 4)
        this.notes.push({ voice: "snare", midi: 48, length: 0.12 });
      if (n % 2 === 0)
        this.notes.push({ voice: "hat", midi: 80, length: 0.035 });
      this.notes.push({
        voice: "bass",
        midi: root + (n % 8 === 6 ? 12 : 0),
        length: 0.1,
      });
      const arpeggio = [0, 7, 12, 15, 12, 7, 19, 15];
      if (n % 2 === 0)
        this.notes.push({
          voice: "lead",
          midi: root + 24 + arpeggio[(n / 2 + this.scene) % 8],
          length: 0.12,
        });
    }
  }
  drainSounds(): SoundEvent[] {
    return [];
  }
  drainNotes() {
    return this.notes.splice(0);
  }
  private label(
    c: CanvasRenderingContext2D,
    s: string,
    x: number,
    y: number,
    size = 12,
    color = "#fff",
    bold = false,
  ) {
    c.fillStyle = color;
    c.font = `${bold ? "700 " : ""}${size}px ${size < 13 ? '"Obel Mono", monospace' : "Inter, sans-serif"}`;
    c.textAlign = "left";
    c.fillText(s, x, y);
  }
  private window(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    body = "#c0c0c0",
  ) {
    if (body !== "transparent") {
      c.fillStyle = "#080c28";
      c.fillRect(x + 5, y + 5, w, h);
      c.fillStyle = "#c0c0c0";
      c.fillRect(x, y, w, h);
    } else {
      c.fillStyle = "#c0c0c0";
      c.fillRect(x, y, w, 30);
      c.fillRect(x, y, 5, h);
      c.fillRect(x + w - 5, y, 5, h);
      c.fillRect(x, y + h - 5, w, 5);
    }
    c.strokeStyle = "#fff";
    c.lineWidth = 2;
    c.strokeRect(x + 1, y + 1, w - 2, h - 2);
    c.strokeStyle = "#555";
    c.strokeRect(x + 3, y + 3, w - 6, h - 6);
    c.fillStyle = this.palette ? "#550080" : "#000080";
    c.fillRect(x + 5, y + 5, w - 10, 22);
    this.label(c, title, x + 10, y + 21, 12, "#fff", true);
    c.fillStyle = "#c0c0c0";
    c.fillRect(x + w - 23, y + 8, 15, 15);
    this.label(c, "×", x + w - 21, y + 21, 14, "#111", true);
    if (body !== "transparent") {
      c.fillStyle = body;
      c.fillRect(x + 5, y + 30, w - 10, h - 35);
    }
  }
  private folder(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    rotate = 0,
  ) {
    c.save();
    c.translate(x, y);
    c.rotate(rotate);
    c.scale(scale, scale);
    c.fillStyle = "#8a5c12";
    c.fillRect(-20, -13, 43, 31);
    c.fillStyle = this.palette ? "#b7aaff" : "#ffe47a";
    c.fillRect(-21, -18, 18, 8);
    c.fillRect(-21, -12, 42, 27);
    c.fillStyle = this.palette ? "#8978dd" : "#f6c849";
    c.beginPath();
    c.moveTo(-21, 15);
    c.lineTo(-15, -7);
    c.lineTo(26, -7);
    c.lineTo(20, 15);
    c.fill();
    c.restore();
  }
  private clip(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    spin: number,
    echo = false,
  ) {
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    c.rotate(this.reducedMotion ? 0 : Math.sin(spin * 0.5) * 0.18);
    // A continuous folded wire: outer loop, inner return, hooked free end.
    const project = (px: number, py: number) => [
      px * Math.cos(spin * 0.45 + this.yaw) +
        Math.sin(py * 0.025 + spin) * this.bend * 20,
      py * this.stretch + px * Math.sin(this.pitch) * 0.6,
    ];
    const p = new Path2D();
    const start = project(-28, 55);
    p.moveTo(start[0], start[1]);
    const curve = (
      a: number,
      b: number,
      d: number,
      e: number,
      f: number,
      g: number,
    ) => {
      const q = project(a, b),
        r = project(d, e),
        s = project(f, g);
      p.bezierCurveTo(q[0], q[1], r[0], r[1], s[0], s[1]);
    };
    curve(-30, 95, 42, 100, 43, 48);
    curve(43, 10, 43, -32, 43, -61);
    curve(43, -107, -37, -109, -38, -61);
    curve(-38, -15, -38, 19, -38, 48);
    curve(-38, 79, 20, 79, 20, 46);
    curve(20, 9, 20, -30, 20, -56);
    curve(20, -80, -15, -80, -15, -56);
    curve(-15, -21, -15, 6, -15, 22);
    c.lineCap = "round";
    c.lineJoin = "round";
    if (!echo) {
      c.strokeStyle = "#0009";
      c.lineWidth = 18;
      c.save();
      c.translate(6, 8);
      c.stroke(p);
      c.restore();
    }
    const chrome = c.createLinearGradient(-45, 0, 48, 0);
    chrome.addColorStop(0, "#555b70");
    chrome.addColorStop(0.18, this.palette ? "#ffdfb6" : "#f4ffff");
    chrome.addColorStop(0.4, "#8795af");
    chrome.addColorStop(0.58, "#fff");
    chrome.addColorStop(0.72, "#3d4864");
    chrome.addColorStop(1, "#e3f4ff");
    c.strokeStyle = echo ? palettes[this.palette][1] : "#19213c";
    c.lineWidth = 16;
    c.stroke(p);
    c.strokeStyle = echo ? palettes[this.palette][0] : chrome;
    c.lineWidth = 11;
    c.stroke(p);
    if (!echo) {
      c.strokeStyle = "#ffffffa0";
      c.lineWidth = 2;
      c.stroke(p);
      for (const eye of [-16, 15]) {
        const q = project(eye, -57);
        c.save();
        c.translate(q[0], q[1]);
        c.fillStyle = "#202337";
        c.beginPath();
        c.ellipse(0, 0, 17, 24, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#fffdf3";
        c.beginPath();
        c.ellipse(0, -1, 14, 21, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#141727";
        c.beginPath();
        c.ellipse(
          Math.sin(spin) * 5 + this.bend * 4,
          4 + this.pitch * 6,
          5,
          9,
          0,
          0,
          Math.PI * 2,
        );
        c.fill();
        c.fillStyle = "#fff";
        c.fillRect(
          Math.sin(spin) * 5 + this.bend * 4 - 2,
          0 + this.pitch * 6,
          2,
          3,
        );
        c.restore();
      }
      c.strokeStyle = "#2a2430";
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(-35, -86);
      c.lineTo(-9, -91);
      c.moveTo(6, -91);
      c.lineTo(35, -83);
      c.stroke();
    }
    c.restore();
  }
  private bootScreen(c: CanvasRenderingContext2D) {
    c.fillStyle = this.boot < 1 ? "#08090c" : "#008080";
    c.fillRect(0, 0, 640, 480);
    if (this.boot < 1) {
      this.label(c, "HANIMEX EXPERIMENTAL BIOS", 40, 72, 18);
      this.label(c, "640K ought to be enough for one paperclip.", 40, 110, 12);
      this.label(c, "Found PC-000...", 40, 165, 14);
      this.label(c, "Starting CLIPPY.EXE_", 40, 220, 14);
      return;
    }
    this.window(c, 98, 90, 444, 280, "Starting Windows 95...");
    const colors = ["#ed553d", "#5ca83c", "#457bc4", "#f4ce40"];
    for (let i = 0; i < 4; i++) {
      c.fillStyle = colors[i];
      c.fillRect(252 + (i % 2) * 61, 145 + Math.floor(i / 2) * 51, 55, 45);
    }
    this.label(c, "Windows 95", 214, 285, 28, "#181818", true);
    this.label(c, "Loading unsolicited assistance", 178, 315, 12, "#222");
    c.fillStyle = "#888";
    c.fillRect(166, 333, 308, 13);
    c.fillStyle = "#000080";
    c.fillRect(168, 335, Math.min(304, ((this.boot - 1) / 2.5) * 304), 9);
  }
  draw(c: CanvasRenderingContext2D) {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    if (this.boot < 3.5) {
      this.bootScreen(c);
      c.restore();
      return;
    }
    const t = this.reducedMotion ? 1 : this.time;
    const spin = this.reducedMotion ? 0 : t * 0.55;
    const col = palettes[this.palette];
    const energy = this.reducedMotion
      ? 0
      : Math.max(this.pulse, 0.2 * (1 - (this.beat % 1)));
    c.fillStyle = "#08091f";
    c.fillRect(0, 0, 640, 480);
    if (this.trails && this.trailCanvas) {
      c.globalAlpha = 0.55;
      c.drawImage(this.trailCanvas, -3, -2, 646, 484);
      c.globalAlpha = 1;
    }
    switch (this.scene) {
      case 0:
      case 9: {
        const horizon = 220 + this.pitch * 35;
        const bg = c.createLinearGradient(0, 0, 0, 480);
        bg.addColorStop(0, "#050620");
        bg.addColorStop(0.6, this.scene === 9 ? "#471256" : "#062f53");
        bg.addColorStop(1, "#071018");
        c.fillStyle = bg;
        c.fillRect(0, 0, 640, 480);
        c.strokeStyle = col[0];
        c.lineWidth = 1;
        c.globalAlpha = 0.45;
        for (let i = -12; i <= 12; i++) {
          c.beginPath();
          c.moveTo(320 + this.yaw * 45, horizon);
          c.lineTo(320 + i * 100, 480);
          c.stroke();
        }
        for (let i = 0; i < 12; i++) {
          const yy = horizon + ((i * 23 + t * 20) % (480 - horizon));
          c.beginPath();
          c.moveTo(0, yy);
          c.lineTo(640, yy);
          c.stroke();
        }
        c.globalAlpha = 1;
        this.label(
          c,
          this.scene === 9 ? "ASSISTANCE IS INEVITABLE" : "CLIPPY.EXE",
          this.scene === 9 ? 124 : 138,
          84,
          this.scene === 9 ? 24 : 48,
          col[0],
          true,
        );
        this.label(
          c,
          "PC-000 / NO PRODUCTIVITY GUARANTEED",
          150,
          111,
          11,
          "#a1aacc",
        );
        for (let i = 0; i < 5; i++) {
          c.strokeStyle = col[i % 3];
          c.globalAlpha = 0.3;
          c.beginPath();
          c.ellipse(
            320,
            300,
            100 + i * 35,
            30 + i * 9,
            Math.sin(t * 0.2) * 0.2,
            0,
            Math.PI * 2,
          );
          c.stroke();
        }
        c.globalAlpha = 1;
        break;
      }
      case 1: {
        for (let i = 14; i >= 0; i--) {
          const z = ((i + t * 2) % 15) + 1;
          const scale = 7 / z;
          const w = 200 * scale,
            h = 145 * scale;
          const x =
              320 - w / 2 + Math.sin(i * 0.35 + t * 0.5) * 40 + this.yaw * 25,
            y = 220 - h / 2 + Math.cos(i * 0.4 + t * 0.3) * 30;
          this.window(c, x, y, w, h, "C:\\WINDOWS\\HELP", "transparent");
        }
        break;
      }
      case 2: {
        for (let i = 0; i < 15; i++) {
          const yy = 220 + Math.sin(t * 1.5 + i * 0.38) * 160;
          const grad = c.createLinearGradient(0, yy - 12, 0, yy + 12);
          grad.addColorStop(0, "#08091f");
          grad.addColorStop(0.5, col[i % 3]);
          grad.addColorStop(1, "#08091f");
          c.fillStyle = grad;
          c.fillRect(0, yy - 12, 640, 24);
        }
        this.label(
          c,
          "PLEASE DO NOT FEED THE RASTER",
          126,
          55,
          17,
          col[2],
          true,
        );
        break;
      }
      case 3: {
        for (let i = 35; i >= 0; i--) {
          const phase = t * 0.5 + i * 0.618,
            z = ((i % 9) + 1) / 9;
          this.folder(
            c,
            320 + Math.sin(phase) * z * 340 + this.yaw * 20,
            220 + Math.cos(phase * 0.8) * z * 230,
            0.3 + z * 1.4,
            Math.sin(phase) * 0.5,
          );
        }
        break;
      }
      case 4: {
        const messages = [
          "It looks like you are making a demo.",
          "Would you like help with that?",
          "Task failed successfully.",
          "There is no escape key.",
        ];
        for (let i = 0; i < 10; i++) {
          const x = 30 + ((i * 47 + t * 22) % 370),
            y = 24 + ((i * 37 + t * 15) % 260);
          this.window(c, x, y, 245, 116, "Unsolicited assistance");
          this.label(c, messages[i % 4], x + 14, y + 56, 10, "#111");
          c.fillStyle = "#aaa";
          c.fillRect(x + 145, y + 75, 74, 24);
          this.label(c, "More help", x + 151, y + 92, 10, "#111");
        }
        break;
      }
      case 5: {
        for (let i = 0; i < 130; i++) {
          const z = 1 - ((i * 0.071 + t * 0.27) % 1),
            angle = i * 2.399;
          const x = (Math.cos(angle) * 50) / z,
            y = (Math.sin(angle) * 32) / z;
          c.strokeStyle = col[i % 3];
          c.lineWidth = Math.min(3, (1 / z) * 0.2);
          c.beginPath();
          c.moveTo(320 + x, 225 + y);
          c.lineTo(320 + x * 1.13, 225 + y * 1.13);
          c.stroke();
        }
        this.label(c, "SEARCHING FOR INTELLIGENT LIFE...", 125, 52, 14, col[0]);
        break;
      }
      case 6: {
        this.plasmaCanvas ??= document.createElement("canvas");
        this.plasmaCanvas.width = 80;
        this.plasmaCanvas.height = 60;
        const pc = this.plasmaCanvas.getContext("2d")!;
        const img = pc.createImageData(80, 60);
        for (let y = 0; y < 60; y++)
          for (let x = 0; x < 80; x++) {
            const v =
              Math.sin(x * 0.14 + t) +
              Math.sin(y * 0.18 - t * 0.8) +
              Math.sin(Math.hypot(x - 40, y - 30) * 0.2 - t);
            const k = (y * 80 + x) * 4;
            img.data[k] = 70 + 60 * Math.sin(v + this.palette * 2);
            img.data[k + 1] = 50 + 45 * Math.sin(v + 2);
            img.data[k + 2] = 120 + 110 * Math.sin(v + 4);
            img.data[k + 3] = 255;
          }
        pc.putImageData(img, 0, 0);
        c.imageSmoothingEnabled = true;
        c.drawImage(this.plasmaCanvas, 0, 0, 640, 480);
        this.label(c, "HELP HAS BECOME SENTIENT", 155, 50, 20, "#fff", true);
        break;
      }
      case 7: {
        for (let row = 0; row < 3; row++)
          for (let colIndex = 0; colIndex < 5; colIndex++) {
            const x = 65 + colIndex * 128 + Math.sin(t + row) * 20,
              y = 100 + row * 130;
            this.clip(c, x, y, 0.42, spin + colIndex + row);
          }
        break;
      }
      case 8: {
        c.fillStyle = "#008080";
        c.fillRect(0, 0, 640, 480);
        for (let i = 0; i < 18; i++) {
          const x = 20 + (i % 6) * 104 + Math.sin(t + i) * 13,
            y = 42 + Math.floor(i / 6) * 110 + Math.cos(t + i * 0.4) * 24;
          this.folder(c, x + 28, y + 28, 1.1);
          this.label(
            c,
            ["My Computer", "Recycle Bin", "New Folder", "HELP!!!"][i % 4],
            x,
            y + 66,
            10,
          );
        }
        for (let i = 0; i < 5; i++) {
          const x = 120 + Math.sin(t * 0.6 + i) * 150,
            y = 100 + i * 42 + Math.cos(t + i) * 25;
          this.window(
            c,
            x,
            y,
            235,
            125,
            "Not responding",
            i % 2 ? "#111a36" : "#c0c0c0",
          );
        }
        break;
      }
    }
    if (this.scene !== 7) {
      const x = 320 + Math.sin(t * 0.7) * 15 + this.yaw * 25,
        y = 255 + Math.sin(t * 0.9) * 10;
      const size = (this.scene === 4 ? 0.88 : 1.18) * (1 + energy * 0.12);
      if (this.trails)
        for (let i = 3; i > 0; i--) {
          c.globalAlpha = 0.12;
          this.clip(c, x - i * 14, y + i * 8, size, spin - i * 0.1, true);
        }
      c.globalAlpha = 1;
      this.clip(c, x, y, size, spin);
    }
    if (this.glitch > 0 && !this.reducedMotion) {
      c.save();
      c.globalAlpha = this.glitch * 0.35;
      for (let i = 0; i < 5; i++) {
        c.fillStyle = col[i % 3];
        c.fillRect((i * 137 + t * 50) % 640, (i * 81 + t * 70) % 430, 120, 5);
      }
      c.restore();
    }
    if (this.trails) {
      this.trailCanvas ??= document.createElement("canvas");
      this.trailCanvas.width = 640;
      this.trailCanvas.height = 480;
      this.trailCanvas.getContext("2d")!.drawImage(c.canvas, 0, 0);
    }
    c.fillStyle = "#c0c0c0";
    c.fillRect(0, 448, 640, 32);
    c.fillStyle = "#fff";
    c.fillRect(0, 448, 640, 2);
    c.strokeStyle = "#fff";
    c.strokeRect(5, 453, 67, 23);
    c.strokeStyle = "#555";
    c.strokeRect(6, 454, 67, 23);
    this.label(c, "Start", 14, 470, 13, "#111", true);
    this.label(c, demoScenes[this.scene], 86, 469, 12, "#161616");
    this.label(
      c,
      `${this.fast ? 164 : 124} BPM · ${this.auto ? "AUTO" : "LIVE"}`,
      430,
      469,
      11,
      "#161616",
    );
    this.label(
      c,
      `${String(this.scene + 1).padStart(2, "0")} / 10`,
      567,
      438,
      10,
      "#d1d8f5",
    );
    c.restore();
  }
  drawShutdown(c: CanvasRenderingContext2D) {
    c.fillStyle = "#000080";
    c.fillRect(0, 0, 640, 480);
    this.label(c, "CLIPPY", 277, 105, 22, "#fff", true);
    for (const [i, s] of [
      "An unsolicited exception has occurred.",
      "The assistant has performed an illegal operation:",
      "TOO_MUCH_HELP (0x00000095)",
      "",
      "It is now safe to turn your computer back on.",
    ].entries())
      this.label(c, s, 65, 172 + i * 33, 14);
  }
}
