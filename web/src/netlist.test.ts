import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { SwitchNetlist } from "./chip/switches";
import { names, nodeDefinitions } from "./chip/netlist";

test("switch solver matches the archived engine at every node across 2,000 clock phases", () => {
  const context = vm.createContext({ console });
  for (const file of [
    "segdefs.js",
    "transdefs.js",
    "nodenames.js",
    "reference/chipsim.js",
  ])
    vm.runInContext(readFileSync(`research/ay38605/${file}`, "utf8"), context);
  const macros = readFileSync("research/ay38605/reference/macros.js", "utf8");
  vm.runInContext(
    `var nodes=[], transistors={}; var ngnd=nodenames.gnd,npwr=nodenames.vcc; ${macros.slice(macros.indexOf("function setupNodes()"), macros.indexOf("function go()"))} setupNodes(); setupTransistors(); nodes[npwr].state=true; for(var t in transistors) transistors[t].on=transistors[t].gate===npwr;`,
    context,
  );
  const actual = new SwitchNetlist();
  const drive = (name: keyof typeof names, high: boolean) => {
    actual.drive(name, high);
    vm.runInContext(`setHL(${JSON.stringify(name)},${high})`, context);
  };
  for (const name of [
    "pinS1",
    "pinS2",
    "pinS3",
    "pinSkill1",
    "pinSkill2",
    "pinTest",
  ] as const) {
    actual.pull(name, true);
    vm.runInContext(`setPd('${name}',true)`, context);
  }
  actual.pull("reset", false);
  actual.settle(actual.all());
  vm.runInContext(`setPd('reset',false); recalcNodeList(allNodes());`, context);
  drive("reset", true);
  for (let i = 0; i < 2000; i++) {
    drive("clk", i % 2 === 0);
    if (i % 228 === 0) {
      drive("pinSubInput", false);
      drive("pinDesInput", false);
    }
    if (i % 228 === 200) {
      drive("pinSubInput", true);
      drive("pinDesInput", true);
    }
    for (const [n] of nodeDefinitions)
      assert.equal(
        actual.state[n],
        +!!context.nodes[n].state,
        `phase ${i}, node ${n}`,
      );
  }
});

import { AY38605 } from "./chip/ay38605";

test("Rust/Wasm and TypeScript agree on every node and raw raster sample after a clocked reset and input changes", async () => {
  const { instance } = await WebAssembly.instantiate(
    readFileSync("web/src/chip/ay38605.wasm"),
  );
  const e = instance.exports as unknown as {
    chip_init(): number;
    chip_run(n: number): number;
    chip_input(m: number, s: number, d: number, b: number): number;
    chip_nodes(): number;
    chip_raster(): number;
    memory: WebAssembly.Memory;
  };
  assert.equal(e.chip_init(), 0);
  const chip = new AY38605();
  for (let i = 0; i < 12; i++) {
    const sub = i % 2 ? 100 : 300;
    chip.setInput({ ...chip.input, submarine: sub, torpedo: i % 2 === 1 });
    e.chip_input(1, sub, 200, i % 2);
    chip.run(1000);
    assert.equal(e.chip_run(1000), 0);
    assert.deepEqual(
      new Uint8Array(e.memory.buffer, e.chip_nodes(), 1524),
      chip.circuit.state,
    );
    assert.deepEqual(
      new Uint8Array(e.memory.buffer, e.chip_raster(), 228 * 320),
      chip.raster,
    );
  }
});

test('the recovered chip generates a PAL-length field and ship pixels after reset', async () => {
  const {instance}=await WebAssembly.instantiate(readFileSync('web/src/chip/ay38605.wasm'));
  const e=instance.exports as unknown as {chip_init():number;chip_run(n:number):number;chip_field_clocks():number;chip_raster():number;memory:WebAssembly.Memory};
  assert.equal(e.chip_init(),0);
  assert.equal(e.chip_run(150000),0);
  assert.equal(e.chip_field_clocks(),228*312);
  const raster=new Uint8Array(e.memory.buffer,e.chip_raster(),228*320);
  let shipPixels=0;
  for(let y=130;y<260;y++)for(let x=20;x<204;x++)if((raster[y*228+x]&3)===2)shipPixels++;
  assert.ok(shipPixels>20,`expected submarine pixels, received ${shipPixels}`);
});
