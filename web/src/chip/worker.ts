import type { ChipCommand, ChipFrame, ChipWasm } from "./runtime";
const worker = self as unknown as {
  postMessage(message: ChipFrame, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<ChipCommand>) => void) | null;
};
let running = false,
  dirty = true;
let input: Extract<ChipCommand, { kind: "input" }> = {
  kind: "input",
  mode: 1,
  sub: 200,
  des: 200,
  buttons: 0,
};
let chip: ChipWasm | undefined;
let clocks = 128,
  activeMs = 0,
  runSince = 0,
  runClocks = 0,
  lastSent = 0;
const fail = (error: unknown) => {
  running = false;
  worker.postMessage({
    kind: "error",
    message: error instanceof Error ? error.message : "Chip simulator failed",
  });
};
function publish() {
  if (!chip) return;
  const raster = new Uint8Array(
    chip.memory.buffer,
    chip.chip_raster(),
    228 * 320,
  ).slice();
  const nodes = new Uint8Array(
    chip.memory.buffer,
    chip.chip_nodes(),
    1524,
  ).slice();
  worker.postMessage(
    {
      kind: "frame",
      raster,
      nodes,
      clocks,
      fields: chip.chip_fields(),
      speed:
        ((runClocks /
          Math.max(
            1,
            activeMs + (running ? performance.now() - runSince : 0),
          )) *
          1000) /
        3_579_545,
    },
    [raster.buffer, nodes.buffer],
  );
  lastSent = performance.now();
}
function advance(count: number) {
  if (!chip) return;
  if (dirty) {
    if (chip.chip_input(input.mode, input.sub, input.des, input.buttons))
      throw new Error("Chip input failed");
    dirty = false;
  }
  if (count === 0.5 ? chip.chip_half_step() : chip.chip_run(count))
    throw new Error("Chip circuit did not settle");
  clocks += count;
}
worker.onmessage = ({ data }) => {
  try {
    if (data.kind === "input") {
      input = data;
      dirty = true;
    } else if (data.kind === "run") {
      if (running && !data.running) activeMs += performance.now() - runSince;
      if (!running && data.running) runSince = performance.now();
      running = data.running;
      if (!running) publish();
    } else if (!running) {
      advance(
        data.clocks === 0.5
          ? 0.5
          : Math.max(1, Math.min(228, Math.round(data.clocks))),
      );
      publish();
    }
  } catch (error) {
    fail(error);
  }
};
async function start() {
  const binary =
    self.name === "reference"
      ? new URL("./ay38605-reference.wasm", import.meta.url)
      : new URL("./ay38605.wasm", import.meta.url);
  const response = await fetch(binary);
  if (!response.ok) throw new Error("Could not load the chip simulator");
  const { instance } = await WebAssembly.instantiate(
    await response.arrayBuffer(),
  );
  chip = instance.exports as unknown as ChipWasm;
  if (chip.chip_init()) throw new Error("Chip reset failed");
  if (running) runSince = performance.now();
  publish();
  const tick = () => {
    try {
      if (running) {
        const deadline = performance.now() + 16;
        do {
          advance(256);
          runClocks += 256;
        } while (performance.now() < deadline);
        if (performance.now() - lastSent > 100) publish();
      }
      setTimeout(tick, running ? 0 : 50);
    } catch (error) {
      fail(error);
    }
  };
  tick();
}
void start().catch(fail);
