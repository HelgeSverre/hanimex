// Compare a directory of baseline Wasm files against the current compiled cores.
// Usage: node scripts/benchmark-registers.mjs work/registers/baseline
import fs from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const baseline = process.argv[2];
assert.ok(
  baseline,
  "supply a baseline directory containing ay38605.wasm and ay38606.wasm",
);
const allModes = process.argv.includes("--all-modes");
const rounds = allModes ? 2 : 8,
  warmupClocks = 500000,
  measuredClocks = allModes ? 500000 : 2000000;
const result = {
  date: new Date().toISOString(),
  node: process.version,
  cpu: os.cpus()[0].model,
  rounds,
  warmupClocks,
  measuredClocks,
  mode: allModes ? "all" : 1,
  chips: [],
};
for (const id of ["ay38605", "ay38606"]) {
  const files = [`${baseline}/${id}.wasm`, `web/src/chip/${id}.wasm`];
  const bytes = files.map((f) => fs.readFileSync(f));
  const modules = await Promise.all(bytes.map((b) => WebAssembly.compile(b)));
  for (
    let mode = 1;
    mode <= (allModes ? (id === "ay38605" ? 6 : 10) : 1);
    mode++
  ) {
    const samples = [[], []];
    for (let round = 0; round < rounds; round++)
      for (const version of round % 2 ? [1, 0] : [0, 1]) {
        const e = (await WebAssembly.instantiate(modules[version])).exports;
        assert.equal(e.chip_init(), 0);
        if (allModes) assert.equal(e.chip_input(mode, 200, 200, 0), 0);
        assert.equal(e.chip_run(warmupClocks), 0);
        const start = performance.now();
        assert.equal(e.chip_run(measuredClocks), 0);
        samples[version].push(
          (measuredClocks * 1000) / (performance.now() - start),
        );
      }
    const median = samples.map((a) => {
      const sorted = [...a].sort((a, b) => a - b);
      return (sorted[rounds / 2 - 1] + sorted[rounds / 2]) / 2;
    });
    result.chips.push({
      id,
      mode,
      sha256: bytes.map((b) => createHash("sha256").update(b).digest("hex")),
      samples,
      median,
      speedup: median[1] / median[0],
      hardwareFraction: median[1] / 3579545,
    });
  }
}
console.log(JSON.stringify(result, null, 2));
