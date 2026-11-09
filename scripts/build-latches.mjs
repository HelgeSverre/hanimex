import fs from "node:fs";
import vm from "node:vm";
import { findLatchCells, drivenNodes } from "./chip-latches.mjs";
const id = process.argv[2] ?? "ay38605";
if (!["ay38605", "ay38606"].includes(id)) throw new Error("Unknown chip");
const c = vm.createContext({});
for (const f of ["transdefs", "segdefs", "nodenames"])
  vm.runInContext(fs.readFileSync(`research/${id}/${f}.js`, "utf8"), c);
c.transdefs = c.transdefs.filter((t) => !(id === "ay38606" ? t[5] : t[6]));
const nodeCount = Math.max(...c.segdefs.map((s) => s[0])) + 1;
const trans = c.transdefs.filter((t) => !t[6]).map(([, g, a, b]) => [g, a, b]);
const pulls = new Map(c.segdefs.map((s) => [s[0], s[1] === "+"]));
const driven = drivenNodes(c.nodenames);
const cells = findLatchCells(trans, pulls, driven, c.nodenames.gnd),
  sources = Array(nodeCount).fill(65535),
  clocks = Array(nodeCount).fill(65535);
for (const { store, data, clock } of cells)
  for (const n of [store, data]) {
    sources[n] = data;
    clocks[n] = clock;
  }
fs.writeFileSync(
  `crates/${id}/src/latches.rs`,
  `// Generated NOR/charge-storage latch cells. ${id === "ay38605" ? "CC BY 4.0" : "CC BY-SA 4.0"} Cole Johnson / Sean Riddle.\npub const SOURCE: [usize;${nodeCount}]=[${sources}];\n#[cfg(test)]\npub const CELLS: &[(usize,usize,usize)]=&[${cells.map((c) => `(${c.store},${c.data},${c.clock})`)}];\npub const CLOCK: [usize;${nodeCount}]=[${clocks}];\n`,
);
console.log({ latchCells: cells.length });
