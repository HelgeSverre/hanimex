import type { Controls, Game, SoundEvent } from "../games";
import type { ChipFrame, ChipCommand } from "./runtime";

/** Browser adapter; the worker supplies pixels from chip pins, never game objects. */
export class SubmarineChipGame implements Game {
  scores = [0, 0];
  ended = false;
  private worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  private display = document.createElement("canvas");
  private context: CanvasRenderingContext2D;
  private image = new ImageData(228, 320);
  private status = document.createElement("aside");
  private running = false;
  private previousInput = "";
  private error = "";
  private received = false;
  constructor(private mode: number) {
    this.display.width = 228;
    this.display.height = 320;
    const context = this.display.getContext("2d");
    if (!context) throw new Error("Chip display unavailable");
    this.context = context;
    this.status.className = "chip-status";
    this.status.innerHTML =
      "<span>AY-3-8605 · starting</span><small>Transistor simulation · sound not modeled</small>";
    document.body.append(this.status);
    this.worker.onmessage = ({ data }: MessageEvent<ChipFrame>) => {
      if (data.kind === "error") {
        this.error = data.message;
        this.status.firstElementChild!.textContent = data.message;
        return;
      }
      this.received = true;
      this.status.firstElementChild!.textContent = `AY-3-8605 · ${(data.speed * 100).toFixed(1)}% speed · field ${data.fields}`;
      for (let n = 0; n < data.raster.length; n++) {
        const v = data.raster[n],
          offset = n * 4;
        // Monochrome diagnostic decode of the separate video channels.
        // Original AY-3-8615 colour and external analog audio are not simulated.
        const ink = v & 48 ? 8 : v & 4 ? 225 : v & 2 ? 184 : v & 1 ? 25 : 8;
        this.image.data[offset] = ink;
        this.image.data[offset + 1] = ink;
        this.image.data[offset + 2] = Math.round(ink * 0.94);
        this.image.data[offset + 3] = 255;
      }
      this.context.putImageData(this.image, 0, 0);
    };
    this.worker.onerror = () => {
      this.error = "Chip simulator failed";
      this.status.firstElementChild!.textContent = this.error;
    };
  }
  private send(data: ChipCommand) {
    this.worker.postMessage(data);
  }
  setRunning(running: boolean) {
    if (running !== this.running) {
      this.running = running;
      this.send({ kind: "run", running });
    }
  }
  update(_dt: number, input: Controls) {
    const command: ChipCommand = {
      kind: "input",
      mode: this.mode + 1,
      sub: Math.round(200 + input.left.x * 100),
      des: Math.round(200 + input.right.x * 100),
      buttons:
        +input.left.fire |
        (+input.right.fire << 1) |
        (+input.smallLeft << 2) |
        (+input.smallRight << 3),
    };
    const key = JSON.stringify(command);
    if (key !== this.previousInput) {
      this.previousInput = key;
      this.send(command);
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#101610";
    ctx.fillRect(0, 0, 640, 480);
    if (this.received) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.display, 20, 19, 184, 240, 0, 0, 640, 480);
    } else {
      ctx.fillStyle = "#e5e7d3";
      ctx.font = '15px "Obel Mono",monospace';
      ctx.textAlign = "center";
      ctx.fillText(this.error || "STARTING CHIP", 320, 240);
    }
  }
  drainSounds(): SoundEvent[] {
    return [];
  }
  dispose() {
    this.worker.terminate();
    this.status.remove();
  }
}
