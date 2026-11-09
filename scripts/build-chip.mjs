import { execFileSync } from "node:child_process";
import { copyFileSync, chmodSync } from "node:fs";
for (const script of [
  "build-netlist",
  "build-gates",
  "build-latches",
  "build-chip-layout",
])
  execFileSync(process.execPath, [`scripts/${script}.mjs`], {
    stdio: "inherit",
  });
const manifest = ["--manifest-path", "crates/ay38605/Cargo.toml"];
execFileSync("cargo", ["fmt", ...manifest], { stdio: "inherit" });
for (const reference of [true, false]) {
  if (!reference) {
    execFileSync(process.execPath, ["scripts/build-counter.mjs"], {
      stdio: "inherit",
    });
    execFileSync("cargo", ["fmt", ...manifest], { stdio: "inherit" });
  }
  execFileSync(
    "cargo",
    [
      "build",
      "--release",
      "--target",
      "wasm32-unknown-unknown",
      ...manifest,
      ...(reference ? ["--features", "reference-engine"] : []),
    ],
    { stdio: "inherit" },
  );
  const path = `web/src/chip/ay38605${reference ? "-reference" : ""}.wasm`;
  copyFileSync(
    "crates/ay38605/target/wasm32-unknown-unknown/release/ay38605.wasm",
    path,
  );
  chmodSync(path, 0o644);
}
