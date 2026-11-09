import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const macros = readFileSync("research/ay38605/reference/macros.js", "utf8");
for (const id of ["ay38606", "ay38500"]) {
  const c = vm.createContext({ console });
  for (const f of ["segdefs", "transdefs", "nodenames"])
    vm.runInContext(readFileSync(`research/${id}/${f}.js`, "utf8"), c);
  vm.runInContext(
    readFileSync("research/ay38605/reference/chipsim.js", "utf8"),
    c,
  );
  // Adapt only the processor's changed weak-flag slot; use the preserved solver.
  vm.runInContext(
    `transdefs=transdefs.filter(t=>!t[t.length-1]); var nodes=[],transistors={}; var ngnd=nodenames.gnd,npwr=nodenames.vcc; ${macros.slice(macros.indexOf("function setupNodes()"), macros.indexOf("function go()"))} setupNodes();setupTransistors();nodes[npwr].state=true;for(var t in transistors)transistors[t].on=transistors[t].gate===npwr;setPd('reset',false);recalcNodeList(allNodes());`,
    c,
  );
  const e = (
    await WebAssembly.instantiate(
      readFileSync(`web/src/chip/recovered/${id}.wasm`),
    )
  ).instance.exports;
  assert.equal(e.circuit_init(), 0);
  const states = new Uint8Array(
    e.memory.buffer,
    e.circuit_nodes(),
    e.circuit_node_count(),
  );
  const compare = (label) => {
    for (let n = 0; n < states.length; n++)
      assert.equal(states[n], +!!c.nodes[n]?.state, `${id} ${label} node ${n}`);
  };
  compare("init");
  const drive = (name, high) => {
    assert.equal(e.circuit_drive(c.nodenames[name], +high), 0);
    vm.runInContext(`setHL(${JSON.stringify(name)},${high})`, c);
    compare(name);
  };
  drive("reset", true);
  const pins =
    id === "ay38606"
      ? [
          "pinS1",
          "pinS2",
          "pinS3",
          "pinLeftBat",
          "pinRightBat",
          "pinBallspeed",
          "pinBallsize",
          "pinBatsize",
          "pinLeftServe",
          "pinRightServe",
        ]
      : ["pinLPin", "pinRPin"];
  for (let edge = 0; edge < 10000; edge++) {
    if (edge % 257 === 0)
      for (const [i, pin] of pins.entries())
        drive(pin, (Math.floor(edge / 257) + i) % 3 !== 0);
    if (edge === 4000) drive("reset", false);
    if (edge === 4200) drive("reset", true);
    drive("clk", edge % 2 === 0);
  }
  const before = Buffer.from(states);
  assert.equal(e.circuit_drive(states.length, 1), 2);
  assert.equal(e.circuit_drive(c.nodenames.vcc, 0), 2);
  assert.equal(e.circuit_drive(c.nodenames.gnd, 1), 2);
  assert.equal(e.circuit_run(1_000_001), 2);
  assert.ok(before.equals(Buffer.from(states)));
  // Exercise the batched clock entry point separately from direct drives.
  assert.equal(e.circuit_run(200), 0);
  for (let edge = 0; edge < 200; edge++)
    vm.runInContext("setHL('clk',!nodes[nodenames.clk].state)", c);
  compare("batch");
  console.log(
    `${id}: all ${states.length} nodes matched through 10,200 edges, input changes and reset`,
  );
}
