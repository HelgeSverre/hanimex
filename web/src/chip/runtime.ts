export interface ChipWasm {
  memory: WebAssembly.Memory;
  chip_init(): number;
  chip_half_step(): number;
  chip_run(clocks: number): number;
  chip_input(mode: number, sub: number, des: number, buttons: number): number;
  chip_raster(): number;
  chip_nodes(): number;
  chip_fields(): number;
}
export type ChipCommand =
  | { kind: "input"; mode: number; sub: number; des: number; buttons: number }
  | { kind: "run"; running: boolean }
  | { kind: "step"; clocks: number };
export type ChipFrame =
  | {
      kind: "frame";
      raster: Uint8Array;
      nodes: Uint8Array;
      clocks: number;
      fields: number;
      speed: number;
    }
  | { kind: "error"; message: string };
