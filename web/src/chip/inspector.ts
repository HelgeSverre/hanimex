import { names } from "./netlist";
import type { ChipFrame } from "./runtime";
type Snapshot = Extract<ChipFrame, { kind: "frame" }>;
interface Callbacks {
  engine: "compiled" | "reference";
  pause(paused: boolean): void;
  step(clocks: number): void;
}
interface Segment {
  node: number;
  layer: number;
  path: Path2D;
}
/** Actual die polygons, colored by snapshots from the same instance driving the TV. */
export class ChipInspector {
  private dialog = document.createElement("dialog");
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private segments: Segment[] = [];
  private latest?: Snapshot;
  private selected = names.clk as number;
  private paused = false;
  private zoom = 1;
  private pan = { x: 0, y: 0 };
  private drag?: {
    id: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
    moved: boolean;
  };
  private disposed = false;
  constructor(
    private callbacks: Callbacks,
    private video: HTMLCanvasElement,
  ) {
    this.dialog.className = "chip-inspector";
    this.dialog.setAttribute("aria-labelledby", "chip-inspector-title");
    this.dialog.innerHTML = `<header><div><span class="chip-part">PC-505 / SUBMARINE</span><h2 id="chip-inspector-title">AY-3-8605</h2></div><button data-action="close">Close cartridge</button></header>
    <div class="chip-inspector-body"><section class="chip-die"><div class="chip-die-tools"><button data-action="out" aria-label="Zoom out">−</button><button data-action="in" aria-label="Zoom in">+</button><button data-action="fit">Fit</button><span>Drag to pan · click a wire</span></div><canvas class="die-map" width="1000" height="1000" tabindex="0" aria-label="Chip layout. Select a named signal using the signal menu for its current value."></canvas></section>
    <section class="chip-probes"><nav class="chip-engines" aria-label="Simulation engine"></nav><p class="chip-caption">Switching engines restarts the cartridge.</p><canvas class="chip-video" width="640" height="480" aria-label="Live output from the chip"></canvas><output class="chip-time" aria-live="off"></output><div class="chip-step"><button data-action="pause">Pause chip</button><button data-action="edge" disabled>½ clock</button><button data-action="clock" disabled>1 clock</button><button data-action="line" disabled>1 line</button></div><label>Signal<select class="chip-signal"></select></label><output class="chip-value"></output><dl class="chip-pins"></dl><p class="chip-caption">Lit wires are high. Running view samples the circuit; pause and step to inspect changes.</p></section></div>
    <footer>1,524 nodes · 2,789 transistor entries · <a href="https://nerdstuffbycole.blogspot.com/2019/10/shooter-game-in-silicon-inside-ay-3.html" target="_blank" rel="noopener">Cole Johnson / Sean Riddle</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a></footer>`;
    const engines = this.dialog.querySelector(".chip-engines")!;
    for (const [value, label] of [
      ["compiled", "Compiled logic"],
      ["reference", "Transistor reference"],
    ] as const) {
      const link = document.createElement("a"),
        url = new URL(location.href);
      url.searchParams.set("engine", value);
      url.searchParams.set("inspect", "1");
      link.href = url.href;
      link.textContent = label;
      if (value === callbacks.engine) link.setAttribute("aria-current", "page");
      engines.append(link);
    }
    document.body.append(this.dialog);
    this.canvas = this.dialog.querySelector(".die-map")!;
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Chip layout unavailable");
    this.context = context;
    const select =
      this.dialog.querySelector<HTMLSelectElement>(".chip-signal")!;
    for (const [name, node] of Object.entries(names)) {
      const option = new Option(name, String(node));
      select.add(option);
    }
    select.value = String(this.selected);
    select.onchange = () => {
      this.selected = Number(select.value);
      this.draw();
    };
    this.dialog.addEventListener("click", (event) => {
      const action = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-action]",
      )?.dataset.action;
      if (action === "close") this.dialog.close();
      if (action === "pause") {
        this.paused = !this.paused;
        this.callbacks.pause(this.paused);
        this.updateButtons();
      }
      if (action === "edge") this.callbacks.step(0.5);
      if (action === "clock") this.callbacks.step(1);
      if (action === "line") this.callbacks.step(228);
      if (action === "in") this.zoom = Math.min(8, this.zoom * 1.5);
      if (action === "out") this.zoom = Math.max(1, this.zoom / 1.5);
      if (action === "fit") {
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
      }
      this.draw();
    });
    this.dialog.addEventListener("close", () => {
      this.paused = false;
      this.callbacks.pause(false);
      this.updateButtons();
    });
    this.dialog.addEventListener("keydown", (event) => {
      if ((event.target as HTMLElement).closest("button,select,a"))
        event.stopPropagation();
    });
    this.canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      this.canvas.setPointerCapture(event.pointerId);
      this.canvas.focus();
      this.drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        panX: this.pan.x,
        panY: this.pan.y,
        moved: false,
      };
    });
    this.canvas.addEventListener("pointermove", (event) => {
      const d = this.drag;
      if (!d) return;
      const scale = 1000 / this.canvas.getBoundingClientRect().width;
      if (Math.hypot(event.clientX - d.x, event.clientY - d.y) > 4)
        d.moved = true;
      if (d.moved) {
        this.pan = {
          x: d.panX + (event.clientX - d.x) * scale,
          y: d.panY + (event.clientY - d.y) * scale,
        };
        this.draw();
      }
    });
    this.canvas.addEventListener("pointerup", (event) => {
      const d = this.drag;
      this.drag = undefined;
      if (d && !d.moved) {
        const rect = this.canvas.getBoundingClientRect();
        const x =
          ((((event.clientX - rect.left) * 1000) / rect.width - this.pan.x) /
            this.zoom) *
          2;
        const y =
          2000 -
          ((((event.clientY - rect.top) * 1000) / rect.height - this.pan.y) /
            this.zoom) *
            2;
        this.context.save();
        this.context.resetTransform();
        const hit = this.segments.find((s) =>
          this.context.isPointInPath(s.path, x, y),
        );
        this.context.restore();
        if (hit) {
          this.selected = hit.node;
          select.value = Object.values(names).includes(
            hit.node as (typeof names)[keyof typeof names],
          )
            ? String(hit.node)
            : "";
          this.draw();
        }
      }
      if (this.canvas.hasPointerCapture(event.pointerId))
        this.canvas.releasePointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("lostpointercapture", () => {
      this.drag = undefined;
    });
    this.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        this.zoom = Math.max(
          1,
          Math.min(8, this.zoom * (event.deltaY < 0 ? 1.12 : 1 / 1.12)),
        );
        this.draw();
      },
      { passive: false },
    );
    void this.load();
  }
  private async load() {
    try {
      const response = await fetch(new URL("./layout.json", import.meta.url));
      if (!response.ok) throw new Error("Layout unavailable");
      const rows: number[][] = await response.json();
      if (this.disposed) return;
      this.segments = rows.map(([node, layer, ...points]) => {
        const path = new Path2D();
        path.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2)
          path.lineTo(points[i], points[i + 1]);
        path.closePath();
        return { node, layer, path };
      });
      this.draw();
    } catch {
      if (!this.disposed)
        this.dialog.querySelector(".chip-caption")!.textContent =
          "Chip layout could not load. Reload the page to retry.";
    }
  }
  open(snapshot?: Snapshot) {
    this.latest = snapshot;
    this.dialog.showModal();
    this.draw();
  }
  update(snapshot: Snapshot) {
    this.latest = snapshot;
    if (this.dialog.open) this.draw();
  }
  private updateButtons() {
    this.dialog.querySelector('[data-action="pause"]')!.textContent = this
      .paused
      ? "Run chip"
      : "Pause chip";
    for (const action of ["edge", "clock", "line"])
      this.dialog.querySelector<HTMLButtonElement>(
        `[data-action="${action}"]`,
      )!.disabled = !this.paused;
  }
  private draw() {
    if (!this.dialog.open) return;
    const c = this.context;
    c.resetTransform();
    c.fillStyle = "#0c1819";
    c.fillRect(0, 0, 1000, 1000);
    c.translate(this.pan.x, this.pan.y + 1000 * this.zoom);
    c.scale(this.zoom / 2, -this.zoom / 2);
    const state = this.latest?.nodes;
    for (const s of this.segments) {
      const high = state?.[s.node];
      c.fillStyle = high
        ? ["#e7c97e", "#e5ede1", "#74cbbd", "#e79763"][s.layer % 4]
        : ["#273d3b", "#354949", "#203331", "#304142"][s.layer % 4];
      c.fill(s.path);
    }
    c.strokeStyle = "#ff7841";
    c.lineWidth = 3 / this.zoom;
    for (const s of this.segments)
      if (s.node === this.selected) c.stroke(s.path);
    const label =
      Object.entries(names).find(([, node]) => node === this.selected)?.[0] ??
      "unnamed";
    this.dialog.querySelector(".chip-value")!.textContent =
      `${label} · node ${this.selected} · ${state ? (state[this.selected] ? "HIGH" : "LOW") : "—"}`;
    if (!this.latest) return;
    this.dialog.querySelector(".chip-time")!.textContent =
      `${(this.latest.speed * 100).toFixed(1)}% speed · ${this.latest.clocks.toLocaleString()} clocks · ${(this.latest.clocks / 3579545).toFixed(4)} s simulated · field ${this.latest.fields}`;
    const probes: [string, number][] = [
      ["Clock", names.clk],
      ["Sync", names.pin2Sync],
      ["Left video", names.pin2LVideo],
      ["Right video", names.pin2RVideo],
      ["Torpedo input", names.pinFireT],
      ["Depth charge input", names.pinFireDC],
      ["Sub movement inhibit", names.subMoveDisable],
    ];
    const dl = this.dialog.querySelector(".chip-pins")!;
    dl.replaceChildren();
    for (const [label, node] of probes) {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = String(state![node]);
      dl.append(dt, dd);
    }
    const screen = this.dialog
      .querySelector<HTMLCanvasElement>(".chip-video")!
      .getContext("2d");
    if (screen) {
      screen.imageSmoothingEnabled = false;
      screen.drawImage(this.video, 20, 19, 184, 240, 0, 0, 640, 480);
    }
  }
  dispose() {
    this.disposed = true;
    this.dialog.close();
    this.dialog.remove();
  }
}
