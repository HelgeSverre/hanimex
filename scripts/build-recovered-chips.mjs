import assert from "node:assert/strict";
import { readFileSync, writeFileSync, copyFileSync, chmodSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import vm from "node:vm";
for (const id of ["ay38606", "ay38500"]) {
  const c = vm.createContext({});
  const hashes = {};
  for (const file of ["transdefs", "segdefs", "nodenames"]) {
    const bytes = readFileSync(`research/${id}/${file}.js`);
    hashes[`${file}.js`] = createHash("sha256").update(bytes).digest("hex");
    vm.runInContext(bytes.toString(), c);
  }
  const expected = JSON.parse(
    readFileSync(`research/${id}/hashes.json`, "utf8"),
  );
  assert.deepEqual(
    hashes,
    expected.sha256,
    `${id}: preserved source hashes changed`,
  );
  const nodes = [
    ...new Map(c.segdefs.map((s) => [s[0], s[1] === "+"])).entries(),
  ].sort((a, b) => a[0] - b[0]);
  // This processor uses a six-field format; the weak-device flag is last.
  const transistors = c.transdefs
    .filter((t) => !t.at(-1))
    .map((t) => t.slice(1, 4));
  const size = Math.max(...nodes.map((n) => n[0])) + 1;
  for (const t of transistors)
    for (const n of t)
      if (!nodes.some(([id]) => id === n)) throw Error(`Missing node ${n}`);
  const header = `// Generated from preserved ${id} data, Cole Johnson / Sean Riddle.\n// Data notices: research/${id}/PROVENANCE.md.\n`;
  writeFileSync(
    `crates/recovered-chips/src/${id}.rs`,
    header +
      `pub const NODE_COUNT:usize=${size};\npub const TRANS_COUNT:usize=${transistors.length};\npub const NODES:&[(usize,bool)]=&[${nodes.map((n) => `(${n})`)}];\npub const TRANSISTORS:&[(usize,usize,usize)]=&[${transistors.map((t) => `(${t})`)}];\n` +
      Object.entries(c.nodenames)
        .filter(([k]) => ["gnd", "vcc", "clk", "reset"].includes(k))
        .map(([k, v]) => `pub const ${k.toUpperCase()}:usize=${v};`)
        .join("\n"),
  );
  writeFileSync(
    `web/src/chip/recovered/${id}.json`,
    JSON.stringify({
      id,
      names: c.nodenames,
      nodeCount: size,
      transistorCount: transistors.length,
      segments: c.segdefs.map((s) => [s[0], s[2], ...s.slice(3)]),
    }) + "\n",
  );
}
const manifest = ["--manifest-path", "crates/recovered-chips/Cargo.toml"];
execFileSync("cargo", ["fmt", ...manifest], { stdio: "inherit" });
for (const id of ["ay38606", "ay38500"]) {
  execFileSync(
    "cargo",
    [
      "build",
      "--release",
      "--target",
      "wasm32-unknown-unknown",
      ...manifest,
      ...(id === "ay38500" ? ["--features", "pong"] : []),
    ],
    { stdio: "inherit" },
  );
  const dest = `web/src/chip/recovered/${id}.wasm`;
  copyFileSync(
    "crates/recovered-chips/target/wasm32-unknown-unknown/release/recovered_chips.wasm",
    dest,
  );
  chmodSync(dest, 0o644);
}
