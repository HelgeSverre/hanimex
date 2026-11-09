import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const id = process.argv[2] ?? "ay38605";
assert.ok(["ay38605", "ay38606"].includes(id));
const nodeCount = id === "ay38606" ? 1633 : 1524;
const modes = id === "ay38606" ? 10 : 6;
const engines = await Promise.all(
  [`${id}-reference.wasm`, `${id}.wasm`].map(
    async (file) =>
      (await WebAssembly.instantiate(readFileSync("web/src/chip/" + file)))
        .instance.exports,
  ),
);
const views = engines.map((e) => {
  assert.equal(e.chip_init(), 0);
  return new Uint8Array(e.memory.buffer, e.chip_nodes(), nodeCount);
});
for (let edge = 0; edge < 200000; edge++) {
  if (edge % 4096 === 0)
    for (const e of engines)
      assert.equal(
        e.chip_input(
          1 + (Math.floor(edge / 4096) % modes),
          100 + (edge % 3) * 100,
          300 - (edge % 3) * 100,
          Math.floor(edge / 4096) % 16,
        ),
        0,
      );
  if (edge % 50000 === 10000)
    for (const e of engines) assert.equal(e.chip_reset(), 0);
  for (const e of engines) assert.equal(e.chip_half_step(), 0);
  for (let n = 0; n < nodeCount; n++)
    assert.equal(views[0][n], views[1][n], `edge ${edge}, node ${n}`);
}
console.log(`${id}: 200,000 half-clock edges matched every node`);
