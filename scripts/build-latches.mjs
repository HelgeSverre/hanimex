import fs from "node:fs";
import vm from "node:vm";
import { findLatchCells, drivenNodes } from "./chip-latches.mjs";
const c = vm.createContext({});
for (const f of ["transdefs", "segdefs", "nodenames"])
  vm.runInContext(fs.readFileSync(`research/ay38605/${f}.js`, "utf8"), c);
const trans = c.transdefs.filter((t) => !t[6]).map(([, g, a, b]) => [g, a, b]);
const pulls = new Map(c.segdefs.map((s) => [s[0], s[1] === "+"]));
const driven = drivenNodes(c.nodenames);
const cells = findLatchCells(trans, pulls, driven),
  sources = Array(1524).fill(65535),
  clocks = Array(1524).fill(65535);
for (const { store, data, clock } of cells)
  for (const n of [store, data]) {
    sources[n] = data;
    clocks[n] = clock;
  }
fs.writeFileSync(
  "crates/ay38605/src/latches.rs",
  `// Generated NOR/charge-storage latch cells. CC BY 4.0 Cole Johnson / Sean Riddle.\npub const SOURCE: [usize;1524]=[${sources}];\n#[cfg(test)]\npub const CELLS: &[(usize,usize,usize)]=&[${cells.map((c) => `(${c.store},${c.data},${c.clock})`)}];\npub const CLOCK: [usize;1524]=[${clocks}];\n`,
);
console.log({ latchCells: cells.length });
