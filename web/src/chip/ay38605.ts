import { SwitchNetlist } from "./switches";
import { names } from "./netlist";

export const CLOCK_HZ = 3_579_545;
export const RASTER_WIDTH = 228;
export const RASTER_HEIGHT = 320;
export interface ChipInput {
  mode: number;
  submarine: number;
  destroyer: number;
  torpedo: boolean;
  depthCharge: boolean;
  skillSub: boolean;
  skillDes: boolean;
}
export const defaultChipInput = (): ChipInput => ({
  mode: 1,
  submarine: 200,
  destroyer: 200,
  torpedo: false,
  depthCharge: false,
  skillSub: false,
  skillDes: false,
});

/** External pin/RC controller wiring, following the recovered support.js. No game logic. */
export class AY38605 {
  readonly circuit = new SwitchNetlist();
  readonly raster = new Uint8Array(RASTER_WIDTH * RASTER_HEIGHT);
  input = defaultChipInput();
  halfCycles = 0;
  fields = 0;
  line = 0;
  x = 0;
  lastFieldLines = 0;
  lastLineClocks = 0;
  private syncCount = 0;
  private selectionReleaseField = 3;
  private charges = [0, 0];
  private lastLineCycle = 0;
  constructor() {
    const c = this.circuit;
    for (const name of [
      "pinS1",
      "pinS2",
      "pinS3",
      "pinSkill1",
      "pinSkill2",
      "pinTest",
    ] as const)
      c.pull(name, true);
    c.pull("reset", false);
    c.settle(c.all());
    c.pull("reset", true);
    c.settle(c.all());
    this.setInput(this.input);
    c.drive("reset", false);
    this.run(128);
    c.drive("reset", true);
  }
  setInput(input: ChipInput) {
    const modeChanged = this.input.mode !== input.mode;
    this.input = { ...input };
    const c = this.circuit;
    c.drive("pinFireT", !input.torpedo);
    c.drive("pinFireDC", !input.depthCharge);
    c.drive("pinSkill1", !input.skillSub);
    c.drive("pinSkill2", !input.skillDes);
    if (modeChanged) this.selectionReleaseField = this.fields + 3;
    if (modeChanged)
      for (const name of ["pinS1", "pinS2", "pinS3"] as const)
        c.drive(name, true);
  }
  private onSync() {
    const c = this.circuit;
    this.charges.fill(0);
    c.drive("pinSubInput", false);
    c.drive("pinDesInput", false);
    if (this.fields >= this.selectionReleaseField) {
      for (const pin of ['pinS1','pinS2','pinS3'] as const) if (c.pulls[names[pin]] !== 1) c.drive(pin,true);
      return;
    }
    const selection = Math.max(1, Math.min(6, this.input.mode));
    const pin = (["pinS1", "pinS2", "pinS3"] as const)[
      Math.floor((selection - 1) / 2)
    ];
    c.drive(pin, !c.read(selection % 2 ? "pin2Strobe1" : "pin2Strobe2"));
  }
  halfStep() {
    const c = this.circuit;
    const high = c.read("clk");
    c.drive("clk", !high);
    this.halfCycles++;
    if (high) this.video();
    if (++this.charges[0] === this.input.submarine)
      c.drive("pinSubInput", true);
    if (++this.charges[1] === this.input.destroyer)
      c.drive("pinDesInput", true);
  }
  run(clocks: number) {
    for (let n = 0; n < clocks * 2; n++) this.halfStep();
  }
  private video() {
    const s = this.circuit.state;
    if (s[names.pin2Sync]) this.syncCount++;
    else {
      if (this.syncCount > 64) {
        this.lastFieldLines = this.line;
        this.fields++;
        this.line = 0;
        this.x = 0;
        this.onSync();
      } else if (this.syncCount >= 8) {
        this.lastLineClocks = (this.halfCycles - this.lastLineCycle) / 2;
        this.lastLineCycle = this.halfCycles;
        this.line++;
        this.x = 0;
        this.onSync();
      }
      this.syncCount = 0;
    }
    // Pin-level channels, retained separately from the display's colour decoder.
    if (this.x >= 0 && this.x < RASTER_WIDTH && this.line < RASTER_HEIGHT) {
      this.raster[this.line * RASTER_WIDTH + this.x] =
        s[names.pin2LVideo] |
        (s[names.pin2RVideo] << 1) |
        (s[names.pin2Background] << 2) |
        (s[names.pin2HueOut] << 3) |
        (s[names.pin2Blanking] << 4) |
        (s[names.pin2Sync] << 5);
    }
    this.x++;
  }
}
