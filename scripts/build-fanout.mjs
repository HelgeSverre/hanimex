import fs from "node:fs";
import vm from "node:vm";
import { findLatchCells, drivenNodes } from "./chip-latches.mjs";
const c = vm.createContext({});
for (const file of ["transdefs", "segdefs", "nodenames"])
  vm.runInContext(fs.readFileSync(`research/ay38605/${file}.js`, "utf8"), c);
const cells = findLatchCells(
  c.transdefs.map((t) => t.slice(1, 4)),
  new Map(c.segdefs.map((s) => [s[0], s[1] === "+"])),
  drivenNodes(c.nodenames),
);
const latchNodes = new Set(cells.flatMap((c) => [c.store, c.data]));
const rails = [c.nodenames.gnd, c.nodenames.vcc];
let output =
  "// Generated from CC BY 4.0 AY-3-8605 data: Cole Johnson / Sean Riddle.\nuse super::GateCircuit;\n";
const functions = [];
for (let gate = 0; gate < 1524; gate++) {
  const ts = c.transdefs
    .filter((t) => !t[6] && t[1] === gate)
    .map((t) => (rails.includes(t[2]) ? [t[3], t[2]] : [t[2], t[3]]));
  if (!ts.length) {
    functions.push("empty");
    continue;
  }
  const counts = new Map();
  const add = (x) => counts.set(x, (counts.get(x) ?? 0) + 1);
  for (const [a, b] of ts) {
    if (b === rails[0]) add(`ground_count[${a}]`);
    else if (b === rails[1]) add(`power_count[${a}]`);
    else if (!latchNodes.has(a)) {
      add(`bridge_count[${a}]`);
      add(`bridge_count[${b}]`);
    }
  }
  const queues = [true, false].map((high) =>
    [...new Set(ts.flatMap(([a, b]) => (high ? [a] : [a, b])))].filter(
      (n) => !rails.includes(n),
    ),
  );
  output += `#[cfg_attr(not(debug_assertions), inline(always))]\nfn fanout_${gate}(c: &mut GateCircuit, high: bool) {\n`;
  if (counts.size)
    output +=
      "let delta = if high {1u16} else {u16::MAX};\n" +
      [...counts]
        .map(
          ([x, n]) => `c.${x}=c.${x}.wrapping_add(delta.wrapping_mul(${n}));`,
        )
        .join("\n");
  const [on, off] = queues.map((queue) =>
    queue.map((n) => `c.enqueue(${n});`).join(""),
  );
  output +=
    on === off ? `\n${on}\n}\n` : `\nif high {${on}} else {${off}}\n}\n`;
  functions.push(`fanout_${gate}`);
}
output +=
  "fn empty(_: &mut GateCircuit, _: bool) {}\npub const RUN: [fn(&mut GateCircuit,bool);1524]=[" +
  functions +
  "];\n";
fs.writeFileSync("crates/ay38605/src/fanout.rs", output);
