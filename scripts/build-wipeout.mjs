import fs from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const c = vm.createContext({});
const hashes = JSON.parse(
  fs.readFileSync("research/ay38606/hashes.json", "utf8"),
).sha256;
for (const f of ["transdefs", "segdefs", "nodenames"]) {
  const b = fs.readFileSync(`research/ay38606/${f}.js`);
  assert.equal(createHash("sha256").update(b).digest("hex"), hashes[f + ".js"]);
  vm.runInContext(b.toString(), c);
}
fs.writeFileSync(
  "web/src/chip/wipeout-names.ts",
  "// Generated AY-3-8606 names. Cole Johnson / Sean Riddle. CC BY-SA 4.0.\nexport const names = " +
    JSON.stringify(c.nodenames) +
    " as const;\n",
);
const nodes = [
  ...new Map(c.segdefs.map((s) => [s[0], s[1] === "+"])).entries(),
].sort((a, b) => a[0] - b[0]);
const trans = c.transdefs.filter((t) => !t.at(-1)).map((t) => t.slice(1, 4));
fs.writeFileSync(
  "crates/ay38606/src/data.rs",
  `// Generated AY-3-8606 data. Cole Johnson / Sean Riddle. CC BY-SA 4.0.\n// Original notices: research/ay38606/PROVENANCE.md.\npub const NODES:&[(usize,bool)]=&[${nodes.map((n) => `(${n})`)}];\npub const TRANSISTORS:&[(usize,usize,usize)]=&[${trans.map((t) => `(${t})`)}];\n` +
    Object.entries(c.nodenames)
      .map(
        ([k, v]) =>
          `pub const ${k.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase()}:usize=${v};`,
      )
      .join("\n"),
);
for (const script of ["build-gates", "build-latches", "build-fanout"])
  execFileSync(process.execPath, [`scripts/${script}.mjs`, "ay38606"], {
    stdio: "inherit",
  });
const manifest = ["--manifest-path", "crates/ay38606/Cargo.toml"];
execFileSync("cargo", ["fmt", ...manifest], { stdio: "inherit" });
for (const reference of [true, false]) {
  if (!reference) {
    execFileSync(process.execPath, ["scripts/build-wipeout-counter.mjs"], {
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
  const dest = `web/src/chip/ay38606${reference ? "-reference" : ""}.wasm`;
  fs.copyFileSync(
    "crates/ay38606/target/wasm32-unknown-unknown/release/ay38606.wasm",
    dest,
  );
  fs.chmodSync(dest, 0o644);
}
