// Observation must not change a register-backed circuit's future execution.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
for (const [id, nodes, modes] of [
  ["ay38605", 1524, 6],
  ["ay38606", 1633, 10],
]) {
  const modules = await Promise.all(
    ["-reference", "", ""].map((s) =>
      WebAssembly.compile(readFileSync(`web/src/chip/${id}${s}.wasm`)),
    ),
  );
  const engines = await Promise.all(
    modules.map(async (m) => (await WebAssembly.instantiate(m)).exports),
  );
  for (const e of engines) assert.equal(e.chip_init(), 0);
  const compare = (label) => {
    for (const [getter, length] of [
      ["chip_nodes", nodes],
      ["chip_raster", 228 * 320],
    ]) {
      const expected = Buffer.from(
        engines[0].memory.buffer,
        engines[0][getter](),
        length,
      );
      for (const e of engines.slice(1))
        assert.ok(
          expected.equals(Buffer.from(e.memory.buffer, e[getter](), length)),
          `${id} ${label} ${getter}`,
        );
    }
  };
  for (let mode = 1; mode <= modes; mode++) {
    for (const e of engines)
      assert.equal(
        e.chip_input(mode, 60 + mode * 13, 260 - mode * 11, mode % 16),
        0,
      );
    // One compiled instance is observed frequently; the other only after a long run.
    const clocks = 300001 + mode * 17;
    for (const e of engines.slice(0, 2)) assert.equal(e.chip_run(clocks), 0);
    for (let at = 0; at < clocks; at += 997) {
      assert.equal(engines[2].chip_run(Math.min(997, clocks - at)), 0);
      engines[2].chip_nodes();
    }
    compare(`mode ${mode} after batch`);
    for (const e of engines) assert.equal(e.chip_half_step(), 0);
    compare(`mode ${mode} half step`);
    if (mode % 2 === 0) {
      for (const e of engines) assert.equal(e.chip_reset(), 0);
      compare(`mode ${mode} reset`);
    }
  }
  console.log(
    `${id}: sparse/frequent snapshots, inputs, half steps and resets match the transistor reference`,
  );
}
