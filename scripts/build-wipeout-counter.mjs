import fs from "node:fs";
import vm from "node:vm";
import { findLatchCells, drivenNodes } from "./chip-latches.mjs";
const c = vm.createContext({});
for (const file of ["transdefs", "segdefs", "nodenames"])
  vm.runInContext(fs.readFileSync(`research/ay38606/${file}.js`, "utf8"), c);
const trans = c.transdefs
  .filter((t) => !t[5])
  .map(([, g, a, b]) => {
    if (a === 902 || a === 1249) [a, b] = [b, a];
    return [g, a, b];
  });
import assert from "node:assert/strict";
// Node 774 is horizontal sync. Close incoming dependencies up to externally
// driven console pins, then add
// channel-connected decoder blocks whose gates are entirely inside the region.
const rails = new Set([902, 1249]),
  boundary = new Set([902, 1249, ...drivenNodes(c.nodenames)]);
const region = new Set([774]);
let changed = true;
while (changed) {
  changed = false;
  for (const [gate, a, b] of trans)
    if (region.has(a) || region.has(b))
      for (const n of [gate, a, b])
        if (!region.has(n) && !boundary.has(n)) {
          region.add(n);
          changed = true;
        }
}
const adj = Array.from({ length: 1633 }, () => []);
for (const [, a, b] of trans)
  if (!rails.has(a) && !rails.has(b)) {
    adj[a].push(b);
    adj[b].push(a);
  }
const seen = new Set(rails),
  groups = [];
function visit(n, group) {
  if (seen.has(n)) return;
  seen.add(n);
  group.push(n);
  for (const other of adj[n]) visit(other, group);
}
for (let n = 0; n < 1633; n++)
  if (!seen.has(n)) {
    const group = [];
    visit(n, group);
    groups.push(group);
  }
changed = true;
while (changed) {
  changed = false;
  for (const group of groups) {
    if (group.every((n) => region.has(n)) || group.some((n) => boundary.has(n)))
      continue;
    const devices = trans.filter(
      ([, a, b]) => group.includes(a) || group.includes(b),
    );
    if (
      devices.length &&
      devices.every(([g]) => region.has(g) || rails.has(g))
    ) {
      for (const n of group) region.add(n);
      changed = true;
    }
  }
}
const nodes = [...region].sort((a, b) => a - b);
// Internal wires live in the phase register until a snapshot or fallback.
const exposed = new Set(Object.values(c.nodenames));
for (const [g, a, b] of trans)
  if ((!region.has(a) && !rails.has(a)) || (!region.has(b) && !rails.has(b)))
    exposed.add(g);
const internal = new Set(nodes.filter((n) => !exposed.has(n)));

assert.equal(
  nodes.length,
  111,
  "review the macro boundary if the tracing changes",
);
for (const [g, a, b] of trans)
  if (region.has(a) || region.has(b)) {
    assert.ok(region.has(a) || rails.has(a), "channel crosses macro boundary");
    assert.ok(region.has(b) || rails.has(b), "channel crosses macro boundary");
    assert.ok(region.has(g) || boundary.has(g), "unmodeled external gate");
  }
assert.ok(
  !trans.some(([, a, b]) => a === 95 || b === 95),
  "clock must be an externally driven node",
);
const { instance } = await WebAssembly.instantiate(
  fs.readFileSync("web/src/chip/ay38606-reference.wasm"),
);
const e = instance.exports;
assert.equal(e.chip_init(), 0);
const state = new Uint8Array(e.memory.buffer, e.chip_nodes(), 1633),
  keys = [
    ...nodes,
    ...new Set([
      95,
      ...trans
        .filter(
          ([g, a, b]) =>
            (region.has(a) || region.has(b)) &&
            boundary.has(g) &&
            !rails.has(g),
        )
        .map((t) => t[0]),
    ]),
  ];
for (const pin of keys.slice(nodes.length))
  assert.ok(
    !trans.some(([, a, b]) => a === pin || b === pin),
    "external gates must have no channel drivers",
  );
const read = () => keys.map((n) => state[n]),
  table = new Map();
for (let i = 0; i < 20000; i++) {
  const before = read();
  assert.equal(e.chip_half_step(), 0);
  const after = read();
  const key = before.join("");
  if (table.has(key)) assert.deepEqual(table.get(key).after, after);
  else table.set(key, { before, after });
}
assert.equal(
  table.size,
  456,
  "review horizontal period if the reference changes",
);
const rows = [...table.values()],
  indexes = new Map(rows.map((r, i) => [r.before.join(""), i]));
for (const r of rows) {
  assert.ok(indexes.has(r.after.join("")), "transition table must be closed");
  assert.equal(
    r.before.slice(nodes.length + 1).join(","),
    r.after.slice(nodes.length + 1).join(","),
    "external boundary gates must remain stable during a clock edge",
  );
}
const split = [],
  parts = [rows.map((_, i) => i)];
while (parts.some((p) => p.length > 1)) {
  let best = -1,
    score = -1;
  for (let bit = 0; bit < keys.length; bit++) {
    if (split.includes(bit)) continue;
    let s = 0;
    for (const part of parts) {
      const ones = part.filter((i) => rows[i].before[bit]).length;
      s += ones * (part.length - ones);
    }
    if (s > score) {
      score = s;
      best = bit;
    }
  }
  assert.ok(score > 0);
  split.push(best);
  const next = [];
  for (const part of parts) {
    for (const bit of [0, 1]) {
      const p = part.filter((i) => rows[i].before[best] === bit);
      if (p.length) next.push(p);
    }
  }
  parts.splice(0, parts.length, ...next);
}
assert.ok(split.length <= 16, "bound the generated lookup index");
const index = Array(2 ** split.length).fill(65535);
rows.forEach(
  (r, i) => (index[split.reduce((k, b, j) => k + (r.before[b] << j), 0)] = i),
);
let out = `// Generated by scripts/build-wipeout-counter.mjs from the preserved transistor reference.\n// CC BY-SA 4.0: Cole Johnson tracing / Sean Riddle die photographs.\npub const KEYS: &[usize] = &[${keys}];\npub const IS_NODE: [bool;1633] = [${Array.from({ length: 1633 }, (_, n) => nodes.includes(n))}];\npub const STATES: &[[u8;${keys.length}]] = &[${rows.map((r) => `[${r.before}]`)}];\npub const NEXT: &[usize] = &[${rows.map((r) => indexes.get(r.after.join("")))}];\npub const CHANGES: &[&[(usize,u8)]] = &[${rows.map((r) => `&[${nodes.flatMap((n, i) => (internal.has(n) || r.before[i] === r.after[i] ? [] : [`(${n},${r.after[i]})`]))}]`)}];\nconst INDEX: &[usize] = &[${index}];\npub fn find(state: &[u8;1633])->Option<usize>{ let key=${split.map((b, i) => (i === 0 ? `(state[${keys[b]}] as usize)` : `((state[${keys[b]}] as usize)<<${i})`)).join("|")};let row=INDEX[key];if row==65535{return None;}if KEYS.iter().zip(STATES[row]).all(|(&n,v)|state[n]==v){Some(row)}else{None}}\n`;
const storage = findLatchCells(
  trans,
  new Map(c.segdefs.map((s) => [s[0], s[1] === "+"])),
  drivenNodes(c.nodenames),
  c.nodenames.gnd,
);
const latchNodes = new Set(storage.flatMap((c) => [c.store, c.data]));
const closing = new Set(
  storage.map((c) =>
    [c.clock, ...[c.store, c.data].sort((a, b) => a - b)].join(","),
  ),
);
const deltas = [],
  queues = [];
for (const row of rows) {
  const counts = new Map(),
    queue = new Set();
  const add = (node, kind, d) => {
    if (!counts.has(node)) counts.set(node, [0, 0, 0]);
    counts.get(node)[kind] += d;
  };
  const push = (n) => {
    if (n !== 902 && n !== 1249 && !nodes.includes(n)) queue.add(n);
  };
  for (const node of [95, ...nodes]) {
    const bit = keys.indexOf(node);
    if (row.before[bit] === row.after[bit]) continue;
    const on = row.after[bit],
      d = on ? 1 : -1;
    for (const [g, a, b] of trans)
      if (g === node) {
        if (b === 902) add(a, 0, d);
        else if (b === 1249) add(a, 1, d);
        else if (!latchNodes.has(a)) {
          add(a, 2, d);
          add(b, 2, d);
        }
        const key = [g, ...[a, b].sort((a, b) => a - b)].join(",");
        if (on || !closing.has(key)) {
          push(a);
          if (!on) push(b);
        }
      }
  }
  deltas.push(
    [...counts].filter(([n, d]) => !internal.has(n) && d.some(Boolean)),
  );
  queues.push([...queue]);
}
// Share identical transition data. Rows still select exactly the same ordered
// queues and count deltas; this only changes generated constant storage.
function emitShared(name, type, items, render) {
  const unique = new Map(),
    refs = [];
  for (const item of items) {
    const key = JSON.stringify(item);
    if (!unique.has(key)) unique.set(key, { id: unique.size, item });
    refs.push(unique.get(key).id);
  }
  for (const { id, item } of unique.values())
    out += `const ${name}_${id}: &[${type}]=&[${render(item)}];\n`;
  out += `pub const ${name}: &[&[${type}]]=&[${refs.map((id) => name + "_" + id)}];\n`;
}
for (const [kind, name] of ["GROUND", "POWER", "BRIDGE"].entries()) {
  emitShared(
    name,
    "(usize,i16)",
    deltas.map((ds) => ds.flatMap(([n, d]) => (d[kind] ? [[n, d[kind]]] : []))),
    (ds) => ds.map((d) => "(" + d + ")").join(","),
  );
}

const programs = new Map(),
  programIds = [];
for (const queue of queues) {
  const key = queue.join(",");
  if (!programs.has(key)) programs.set(key, { id: programs.size, queue });
  programIds.push(programs.get(key).id);
}
for (const { id, queue } of programs.values())
  out += `#[inline(never)] fn bank_${id}(${queue.length ? "c" : "_c"}:&mut super::GateCircuit){${queue.map((n) => "c.compiled_recalc(" + n + ");").join("")}}\n`;
out += `pub const BANKS: &[fn(&mut super::GateCircuit)]=&[${programIds.map((id) => "bank_" + id)}];\n`;
const restore = rows.map((row) => {
  const counts = new Map([...internal].map((n) => [n, [0, 0, 0]]));
  const add = (n, k) => {
    if (counts.has(n)) counts.get(n)[k]++;
  };
  for (const [g, a, b] of trans) {
    if (!internal.has(a) && !internal.has(b)) continue;
    const bit = keys.indexOf(g);
    assert.ok(
      rails.has(g) || bit >= 0,
      "all internal drivers must belong to the register or its boundary",
    );
    const on = g === c.nodenames.vcc || (bit >= 0 && row.before[bit] !== 0);
    if (!on) continue;
    if (b === c.nodenames.gnd) add(a, 0);
    else if (b === c.nodenames.vcc) add(a, 1);
    else if (!latchNodes.has(a)) {
      add(a, 2);
      add(b, 2);
    }
  }
  return [...internal].map((n) => [
    n,
    row.before[keys.indexOf(n)],
    ...counts.get(n),
  ]);
});
const packed = restore.map((row) =>
  row.map(([, value, g, p, b]) => {
    assert.ok(
      g < 32 && p < 32 && b < 32,
      "register count packing must be lossless",
    );
    return value | (g << 1) | (p << 6) | (b << 11);
  }),
);
// Trace all upstream channel drivers, stopping at constant rails. Writes
// outside this cone cannot change the horizontal register or its inputs.
const invalidates = new Set(keys);
let grew = true;
while (grew) {
  grew = false;
  for (const [g, a, b] of trans) {
    if (
      (!rails.has(a) && invalidates.has(a)) ||
      (!rails.has(b) && invalidates.has(b))
    ) {
      for (const n of [g, a, b])
        if (!invalidates.has(n)) {
          invalidates.add(n);
          grew = true;
        }
    }
  }
}
out +=
  "pub const INVALIDATES: &[bool]=&[" +
  Array.from({ length: adj.length }, (_, n) => invalidates.has(n)).join(",") +
  "];\n";
out += "pub const INTERNAL: &[usize]=&[" + [...internal] + "];\n";
emitShared("RESTORE", "u16", packed, (row) => row.join(","));
console.log({
  registerInternalNodes: internal.size,
  visibleOutputs: nodes.length - internal.size,
});
fs.writeFileSync("crates/ay38606/src/counter.rs", out);
console.log({
  nodes: nodes.length,
  states: rows.length,
  indexBits: split.length,
});
