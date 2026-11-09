import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile),
  start = performance.now();
const results = await Promise.allSettled(
  [1, 2, 3, 4, 5, 6].map(async (mode) => {
    const { stdout } = await run(process.execPath, [
      "scripts/check-chip-engines.mjs",
      "--long",
      `--mode=${mode}`,
    ]);
    console.log(stdout.trim());
  }),
);
for (const result of results)
  if (result.status === "rejected") {
    console.error(result.reason);
    process.exitCode = 1;
  }
console.log(
  JSON.stringify({
    modes: 6,
    fieldsPerMode: 256,
    clocks: 6 * 256 * 71136,
    seconds: (performance.now() - start) / 1000,
    passed: results.every((r) => r.status === "fulfilled"),
  }),
);
