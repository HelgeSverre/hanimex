const worker = self as unknown as {
  postMessage(message: unknown, transfer?: Transferable[]): void;
};
interface Circuit {
  memory: WebAssembly.Memory;
  circuit_init(): number;
  circuit_drive(node: number, high: number): number;
  circuit_run(edges: number): number;
  circuit_nodes(): number;
  circuit_node_count(): number;
}
let chip: Circuit | undefined;
let running = false;
let edges = 0;
let resetNode = 0;
let lastSent = 0;
const publish = () => {
  if (!chip) return;
  const nodes = new Uint8Array(
    chip.memory.buffer,
    chip.circuit_nodes(),
    chip.circuit_node_count(),
  ).slice();
  worker.postMessage(
    {
      kind: "state",
      nodes,
      edges,
      running,
    },
    [nodes.buffer],
  );
  lastSent = performance.now();
};
const check = (status: number) => {
  if (status) throw new Error("Circuit did not settle");
};
const reset = () => {
  if (!chip) return;
  check(chip.circuit_init());
  check(chip.circuit_drive(resetNode, 1));
  edges = 0;
  publish();
};
const fail = (error: unknown) => {
  running = false;
  worker.postMessage({
    kind: "error",
    message: error instanceof Error ? error.message : "Circuit failed",
  });
};
self.onmessage = async ({ data }) => {
  try {
    if (data.kind === "init") {
      resetNode = data.reset;
      const url =
        data.id === "ay38500"
          ? new URL("./recovered/ay38500.wasm", import.meta.url)
          : new URL("./recovered/ay38606.wasm", import.meta.url);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not load circuit");
      chip = (await WebAssembly.instantiate(await response.arrayBuffer()))
        .instance.exports as unknown as Circuit;
      reset();
    } else if (data.kind === "run") {
      running = Boolean(data.running);
      publish();
    } else if (data.kind === "reset") reset();
    else if (data.kind === "step" && chip && !running) {
      const count = data.edges === 2 ? 2 : 1;
      check(chip.circuit_run(count));
      edges += count;
      publish();
    }
  } catch (error) {
    fail(error);
  }
};
const tick = () => {
  try {
    if (running && chip) {
      const start = performance.now();
      do {
        check(chip.circuit_run(128));
        edges += 128;
      } while (performance.now() - start < 12);
      if (performance.now() - lastSent > 150) publish();
    }
  } catch (error) {
    fail(error);
  }
  setTimeout(tick, running ? 0 : 50);
};
tick();
