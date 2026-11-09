import type { ChipCommand, ChipFrame, ChipWasm } from "./runtime";
const worker = self as unknown as {
  postMessage(message: ChipFrame, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<ChipCommand>) => void) | null;
};
let running = false;
let input: Extract<ChipCommand, { kind: "input" }> = {
  kind: "input",
  mode: 1,
  sub: 200,
  des: 200,
  buttons: 0,
};
let dirty = true;
worker.onmessage = ({ data }) => {
  if (data.kind === "input") {
    input = data;
    dirty = true;
  } else running = data.running;
};
async function start() {
  const response = await fetch(new URL("./ay38605.wasm", import.meta.url));
  if (!response.ok) throw new Error("Could not load the chip simulator");
  const { instance } = await WebAssembly.instantiate(
    await response.arrayBuffer(),
  );
  const e = instance.exports as unknown as ChipWasm;
  if (e.chip_init()) throw new Error("Chip reset failed");
  let clocks = 128,
    elapsed = 0,
    lastSent = 0;
  const tick = () => {
    try {
      if (running) {
        if (dirty) {
          if (e.chip_input(input.mode, input.sub, input.des, input.buttons))
            throw new Error("Chip input failed");
          dirty = false;
        }
        const start = performance.now();
        if (e.chip_run(2048)) throw new Error("Chip circuit did not settle");
        elapsed += performance.now() - start;
        clocks += 2048;
        if (performance.now() - lastSent > 100) {
          const raster = new Uint8Array(
            e.memory.buffer,
            e.chip_raster(),
            228 * 320,
          ).slice();
          const nodes = new Uint8Array(
            e.memory.buffer,
            e.chip_nodes(),
            1524,
          ).slice();
          worker.postMessage(
            {
              kind: "frame",
              raster,
              nodes,
              clocks,
              fields: e.chip_fields(),
              speed: clocks / (elapsed / 1000) / 3_579_545,
            },
            [raster.buffer, nodes.buffer],
          );
          lastSent = performance.now();
        }
      }
      setTimeout(tick, running ? 0 : 50);
    } catch (error) {
      worker.postMessage({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Chip simulator failed",
      });
    }
  };
  tick();
}
void start().catch((error) =>
  worker.postMessage({
    kind: "error",
    message: error instanceof Error ? error.message : "Chip simulator failed",
  }),
);
