import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const modules = await Promise.all(
  ["ay38605-reference.wasm", "ay38605.wasm"].map(async (file) =>
    WebAssembly.compile(readFileSync(`web/src/chip/${file}`)),
  ),
);
const long = process.argv.includes("--long");
const start = performance.now();
let checkpoints = 0,
  clocks = 0;
for (let mode = 1; mode <= 6; mode++) {
  const engines = await Promise.all(
    modules.map(
      async (module) => (await WebAssembly.instantiate(module)).exports,
    ),
  );
  engines.forEach((e) => assert.equal(e.chip_init(), 0));
  const target = 71_136 * (long && mode === 1 ? 256 : 4);
  for (let at = 0; at < target; at += 2048) {
    if (at % (2048 * 16) === 0) {
      const phase = Math.floor(at / (2048 * 16));
      engines.forEach((e) =>
        assert.equal(
          e.chip_input(
            mode,
            [100, 200, 300][phase % 3],
            [300, 200, 100][phase % 3],
            phase % 16,
          ),
          0,
        ),
      );
    }
    const count = Math.min(2048, target - at);
    engines.forEach((e) => assert.equal(e.chip_run(count), 0));
    const bytes = (e, pointer, length) =>
      Buffer.from(e.memory.buffer, e[pointer](), length);
    assert.ok(
      bytes(engines[0], "chip_nodes", 1524).equals(
        bytes(engines[1], "chip_nodes", 1524),
      ),
      `node divergence: mode ${mode}, clock ${at + count}`,
    );
    assert.ok(
      bytes(engines[0], "chip_raster", 228 * 320).equals(
        bytes(engines[1], "chip_raster", 228 * 320),
      ),
      `raster divergence: mode ${mode}, clock ${at + count}`,
    );
    assert.equal(engines[0].chip_fields(), engines[1].chip_fields());
    checkpoints++;
    clocks += count;
  }
  console.log(
    `mode ${mode}: matched all nodes and raster for ${target.toLocaleString()} clocks`,
  );
}
console.log(
  JSON.stringify({
    clocks,
    checkpoints,
    seconds: (performance.now() - start) / 1000,
  }),
);
