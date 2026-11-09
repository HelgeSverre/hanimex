import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const baseline = process.argv
  .find((arg) => arg.startsWith("--baseline="))
  ?.slice("--baseline=".length);
const files = [
  "web/src/chip/ay38605-reference.wasm",
  ...(baseline ? [baseline] : []),
  "web/src/chip/ay38605.wasm",
];
const binaries = files.map((file) => readFileSync(file));
const modules = await Promise.all(
  binaries.map((bytes) => WebAssembly.compile(bytes)),
);
const samples = files.map(() => []);
for (let round = 0; round < 4; round++) {
  const order = files.map((_, i) => i);
  if (round % 2) order.reverse();
  for (const which of order) {
    const e = (await WebAssembly.instantiate(modules[which])).exports;
    if (e.chip_init() || e.chip_run(100000))
      throw new Error("chip warmup failed");
    const start = performance.now();
    if (e.chip_run(100000)) throw new Error("chip benchmark failed");
    samples[which].push(100000 / ((performance.now() - start) / 1000));
  }
}
const median = (a) => {
  const s = [...a].sort((a, b) => a - b);
  return (s[1] + s[2]) / 2;
};
const rates = samples.map(median),
  last = rates.at(-1);
console.log(
  JSON.stringify(
    {
      node: process.version,
      arch: process.arch,
      nominalClockHz: 3579545,
      warmupClocks: 100000,
      measuredClocks: 100000,
      engines: files.map((file, i) => ({
        file,
        sha256: createHash("sha256").update(binaries[i]).digest("hex"),
        samplesClocksPerSecond: samples[i],
        medianClocksPerSecond: rates[i],
        hardwareSpeedPercent: (rates[i] / 3579545) * 100,
      })),
      speedup: last / rates[0],
      ...(baseline ? { speedupOverBaseline: last / rates[1] } : {}),
    },
    null,
    2,
  ),
);
