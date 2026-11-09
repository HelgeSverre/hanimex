import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const engines = await Promise.all(
  ["ay38605-reference.wasm", "ay38605.wasm"].map(
    async (file) =>
      (await WebAssembly.instantiate(readFileSync("web/src/chip/" + file)))
        .instance.exports,
  ),
);
const views = engines.map((e) => {
  assert.equal(e.chip_init(), 0);
  return new Uint8Array(e.memory.buffer, e.chip_nodes(), 1524);
});
for (let edge = 0; edge < 200000; edge++) {
  if (edge % 4096 === 0)
    for (const e of engines)
      assert.equal(
        e.chip_input(
          1 + (Math.floor(edge / 4096) % 6),
          100 + (edge % 3) * 100,
          300 - (edge % 3) * 100,
          Math.floor(edge / 4096) % 16,
        ),
        0,
      );
  if (edge % 50000 === 10000)
    for (const e of engines) assert.equal(e.chip_reset(), 0);
  for (const e of engines) assert.equal(e.chip_half_step(), 0);
  for (let n = 0; n < 1524; n++)
    assert.equal(views[0][n], views[1][n], `edge ${edge}, node ${n}`);
}
console.log("200,000 half-clock edges matched every node");
