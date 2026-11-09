import type { Controls, SoundEvent } from "./games";

export type TuningBand = "vhf" | "uhf";
const code: TuningBand[] = ["vhf", "uhf", "uhf", "uhf"];
/** A timed tuner sequence, independent of the cartridge and console power. */
export class SecretTuner {
  private progress = 0;
  private last = -Infinity;
  turn(band: TuningBand, now: number) {
    if (now - this.last > 6) this.progress = 0;
    this.last = now;
    this.progress =
      band === code[this.progress]
        ? this.progress + 1
        : band === code[0]
          ? 1
          : 0;
    if (this.progress === code.length) {
      this.progress = 0;
      return true;
    }
    return false;
  }
  reset() {
    this.progress = 0;
    this.last = -Infinity;
  }
}
export const stationPages = [
  "Index",
  "Pong championships",
  "Classifieds",
  "Weather",
] as const;
const colors = {
  white: "#ededdd",
  cyan: "#00eeee",
  yellow: "#eeee00",
  green: "#00dd55",
  blue: "#2222cc",
  red: "#ee3333",
  magenta: "#ee44ee",
};
interface Drop {
  x: number;
  y: number;
  storm: boolean;
}
export class Channel13 {
  page = 0;
  time = 0;
  playing = false;
  finished = false;
  remaining = 30;
  score = 0;
  umbrella = 320;
  drops: Drop[] = [];
  private spawn = 0;
  private seed = 13;
  private fireHeld = false;
  private sounds: SoundEvent[] = [];
  selectPage(page: number) {
    this.page = ((Math.floor(page) % 4) + 4) % 4;
    // Leaving a forecast challenge ends it rather than running it offscreen.
    if (this.page !== 3) {
      this.playing = false;
      this.finished = false;
      this.drops = [];
    }
  }
  startForecast() {
    this.playing = true;
    this.finished = false;
    this.remaining = 30;
    this.score = 0;
    this.umbrella = 320;
    this.drops = [];
    this.spawn = 0;
    this.seed = 13;
    this.sounds.push("fire");
  }
  update(dt: number, controls: Controls) {
    this.time += dt;
    const fire =
      controls.left.fire || controls.right.fire || !!controls.aim?.fire;
    if (this.page === 3 && fire && !this.fireHeld && !this.playing)
      this.startForecast();
    this.fireHeld = fire;
    if (!this.playing) return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining === 0) {
      this.playing = false;
      this.finished = true;
      this.sounds.push("score");
      return;
    }
    const move = Math.max(-1, Math.min(1, controls.left.x + controls.right.x));
    this.umbrella = Math.max(
      82,
      Math.min(558, this.umbrella + move * dt * 290),
    );
    this.spawn += dt;
    while (this.spawn > 0.29) {
      this.spawn -= 0.29;
      this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
      this.drops.push({
        x: 80 + (this.seed % 480),
        y: 148,
        storm: this.seed % 7 === 0,
      });
    }
    const live: Drop[] = [];
    for (const drop of this.drops) {
      drop.y += dt * (drop.storm ? 195 : 155);
      if (drop.y >= 352) {
        if (Math.abs(drop.x - this.umbrella) < 34) {
          this.score = Math.max(0, this.score + (drop.storm ? -3 : 1));
          this.sounds.push(drop.storm ? "hit" : "bat");
        }
      } else live.push(drop);
    }
    this.drops = live;
  }
  drainSounds() {
    return this.sounds.splice(0);
  }
  private text(
    c: CanvasRenderingContext2D,
    text: string,
    col: number,
    row: number,
    color = colors.white,
  ) {
    c.font = '700 16px "Obel Mono", monospace';
    c.textAlign = "left";
    c.fillStyle = color;
    for (let i = 0; i < text.length; i++)
      c.fillText(text[i], 16 + col * 15 + i * 15, 25 + row * 18);
  }
  private logo(c: CanvasRenderingContext2D) {
    const glyphs: Record<string, string[]> = {
      C: ["01111", "11000", "10000", "10000", "10000", "11000", "01111"],
      H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
      A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
      N: ["10001", "11001", "11001", "10101", "10011", "10011", "10001"],
      E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
      L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
      1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
      3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    };
    for (const [index, ch] of [..."CHANNEL13"].entries())
      for (const [y, row] of glyphs[ch].entries())
        for (const [x, bit] of [...row].entries())
          if (bit === "1") {
            c.fillStyle = index < 7 ? colors.cyan : colors.yellow;
            c.fillRect(42 + index * 62 + x * 10, 62 + y * 9, 9, 8);
          }
  }
  private map(c: CanvasRenderingContext2D) {
    c.fillStyle = "#00312a";
    c.fillRect(63, 143, 514, 244);
    c.strokeStyle = "#005347";
    c.lineWidth = 1;
    for (let x = 63; x < 577; x += 24) {
      c.beginPath();
      c.moveTo(x, 143);
      c.lineTo(x, 387);
      c.stroke();
    }
    for (let y = 143; y < 387; y += 24) {
      c.beginPath();
      c.moveTo(63, y);
      c.lineTo(577, y);
      c.stroke();
    }
    const blocks = [
      [375, 152],
      [351, 164],
      [327, 176],
      [315, 188],
      [303, 200],
      [291, 212],
      [279, 224],
      [267, 236],
      [243, 248],
      [231, 260],
      [219, 272],
      [207, 284],
      [195, 296],
      [207, 308],
      [219, 320],
      [243, 332],
      [267, 320],
      [279, 296],
      [291, 272],
      [303, 248],
      [315, 224],
      [339, 200],
      [363, 176],
    ];
    c.fillStyle = "#178b4c";
    for (const [x, y] of blocks) c.fillRect(x, y, 25, 25);
    c.fillStyle = colors.yellow;
    c.fillRect(207, 301, 7, 7);
    this.text(c, "BERGEN", 6, 17, colors.yellow);
  }
  draw(c: CanvasRenderingContext2D) {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = "#080909";
    c.fillRect(0, 0, 640, 480);
    c.fillStyle = colors.blue;
    c.fillRect(16, 9, 608, 25);
    const secs = Math.floor(this.time) % 60,
      mins = Math.floor(this.time / 60) % 60;
    this.text(
      c,
      `P10${this.page + 1}  CH13  PIRATE TEXT  ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
      0,
      0,
    );
    if (this.page === 0) {
      this.logo(c);
      this.text(c, "BERGEN'S LEAST LICENSED STATION", 4, 7, colors.green);
      this.text(c, "TONIGHT", 2, 10, colors.yellow);
      this.text(c, "Pong championships.............102", 2, 12, colors.cyan);
      this.text(c, "Questionable classifieds.......103", 2, 14, colors.cyan);
      this.text(c, "Weather. Bring an umbrella.....104", 2, 16, colors.cyan);
      this.text(c, "NO ADS. EXCEPT THE BAD ONES.", 5, 20, colors.magenta);
    } else if (this.page === 1) {
      this.text(c, "PONG WORLD CHAMPIONSHIPS", 4, 3, colors.yellow);
      this.text(c, "FINAL / BASEMENT DIVISION", 5, 5, colors.cyan);
      this.text(c, "THE LEFT PADDLE..............15", 4, 8);
      this.text(c, "THE RIGHT PADDLE.............14", 4, 10);
      this.text(c, "Right paddle demands a recount.", 3, 13, colors.green);
      this.text(c, 'Referee: "It was clearly in."', 3, 15, colors.green);
      c.fillStyle = colors.white;
      c.fillRect(170, 335, 5, 50);
      c.fillRect(465, 335, 5, 50);
      for (let y = 327; y < 395; y += 14) c.fillRect(320, y, 3, 7);
      c.fillStyle = colors.yellow;
      c.fillRect(363, 355, 7, 7);
      this.text(c, "Results entirely made up.", 7, 22, colors.magenta);
    } else if (this.page === 2) {
      this.text(c, "CLASSIFIEDS / CASH ONLY", 5, 3, colors.yellow);
      this.text(c, "FOR SALE", 2, 6, colors.cyan);
      this.text(c, "Left paddle. Used on the right.", 2, 8);
      this.text(c, "WANTED", 2, 11, colors.cyan);
      this.text(c, "TV that does not explode.", 2, 13);
      this.text(c, "PERSONALS", 2, 16, colors.cyan);
      this.text(c, "Paperclip seeks less work.", 2, 18);
      this.text(c, "No refunds. No phone number.", 4, 22, colors.magenta);
    } else {
      this.text(c, "WEATHER / WESTERN NORWAY", 4, 3, colors.yellow);
      if (this.playing || this.finished) {
        this.text(
          c,
          `RAIN CAUGHT ${String(this.score).padStart(2, "0")}   TIME ${Math.ceil(this.remaining).toString().padStart(2, "0")}`,
          5,
          5,
          colors.cyan,
        );
        this.map(c);
        for (const drop of this.drops) {
          c.fillStyle = drop.storm ? colors.yellow : colors.cyan;
          if (drop.storm) {
            c.beginPath();
            c.moveTo(drop.x + 3, drop.y - 8);
            c.lineTo(drop.x - 6, drop.y + 2);
            c.lineTo(drop.x, drop.y + 2);
            c.lineTo(drop.x - 3, drop.y + 10);
            c.lineTo(drop.x + 7, drop.y - 2);
            c.lineTo(drop.x, drop.y - 2);
            c.fill();
          } else c.fillRect(drop.x, drop.y, 3, 9);
        }
        c.fillStyle = colors.magenta;
        c.beginPath();
        c.arc(this.umbrella, 360, 30, Math.PI, 0);
        c.fill();
        c.fillRect(this.umbrella - 2, 360, 4, 16);
        this.text(
          c,
          this.finished
            ? `FORECAST BEATEN: ${this.score} DROPS`
            : "CATCH RAIN. DODGE LIGHTNING.",
          5,
          22,
          colors.yellow,
        );
        if (this.finished) this.text(c, "FIRE TO TRY AGAIN", 11, 20);
      } else {
        this.text(c, "NOW: WET.  LATER: ALSO WET.", 5, 5, colors.cyan);
        this.map(c);
        this.text(c, "RAIN 100%", 22, 9, colors.cyan);
        this.text(c, "SUN   0%", 22, 11, colors.yellow);
        this.text(c, "FIRE TO CHALLENGE THE FORECAST", 4, 22, colors.yellow);
      }
    }
    c.fillStyle = colors.blue;
    c.fillRect(16, 444, 608, 24);
    this.text(c, "1 INDEX  2 SPORT  3 ADS  4 WEATHER", 1, 24);
    c.restore();
  }
}
