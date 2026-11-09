import fs from "node:fs";
import vm from "node:vm";
const c = vm.createContext({});
for (const file of ["transdefs", "segdefs"])
  vm.runInContext(fs.readFileSync(`research/ay38605/${file}.js`, "utf8"), c);
const rails = [170, 1364],
  adj = Array.from({ length: 1524 }, () => []);
for (const t of c.transdefs) {
  const [, g, a, b] = t;
  if (!rails.includes(a) && !rails.includes(b)) {
    adj[a].push(b);
    adj[b].push(a);
  }
}
const seen = new Set(rails),
  groups = [];
for (let i = 0; i < 1524; i++) {
  if (seen.has(i)) continue;
  const nodes = [];
  const visit = (n) => {
    if (seen.has(n)) return;
    seen.add(n);
    nodes.push(n);
    adj[n].forEach(visit);
  };
  visit(i);
  groups.push(nodes);
}
const peers = Array(1524).fill(65535);
for (const group of groups.filter((g) => g.length <= 2))
  for (const n of group) peers[n] = group.find((x) => x !== n) ?? n;
fs.writeFileSync(
  "crates/ay38605/src/compiled.rs",
  `// Generated gate-block classification from the CC BY 4.0 AY-3-8605 netlist.\n// Cole Johnson tracing / Sean Riddle die photographs.\npub const PEERS: [usize;1524] = [${peers}];\n`,
);
console.log("compiled nodes", peers.filter((n) => n !== 65535).length);
const blockFor = Array(1524).fill(0),
  localFor = Array(1524).fill(0),
  blocks = [],
  views = [],
  members = [];
for (const nodes of groups.filter((g) => g.length > 2)) {
  const pass = c.transdefs.filter(
    (t) => nodes.includes(t[2]) && nodes.includes(t[3]),
  );
  const gates = [...new Set(pass.map((t) => t[1]))];
  const id = blocks.length;
  nodes.forEach((n, i) => {
    blockFor[n] = id;
    localFor[n] = i;
  });
  const base = views.length;
  for (let pattern = 0; pattern < 2 ** gates.length; pattern++)
    for (const root of nodes) {
      const visited = new Set(),
        ordered = [];
      const visit = (n) => {
        if (visited.has(n)) return;
        visited.add(n);
        ordered.push(n);
        for (const t of pass)
          if (pattern & (1 << gates.indexOf(t[1]))) {
            if (t[2] === n) visit(t[3]);
            else if (t[3] === n) visit(t[2]);
          }
      };
      visit(root);
      views.push([members.length, ordered.length]);
      members.push(...ordered);
    }
  blocks.push({ gates, base, size: nodes.length });
}
fs.appendFileSync(
  "crates/ay38605/src/compiled.rs",
  `pub const NODE_BLOCK:[usize;1524]=[${blockFor}];\npub const NODE_LOCAL:[usize;1524]=[${localFor}];\npub const BLOCKS:&[(&[usize],usize,usize)]=&[${blocks.map((b) => `(&[${b.gates}],${b.base},${b.size})`)}];\npub const VIEWS:&[(usize,usize)]=&[${views.map((v) => `(${v})`)}];\npub const MEMBERS:&[usize]=&[${members}];\n`,
);
console.log({
  blocks: blocks.length,
  views: views.length,
  members: members.length,
});
const fanout = [],
  offsets = [0];
for (let gate = 0; gate < 1524; gate++) {
  for (const t of c.transdefs.filter((t) => t[1] === gate)) {
    let a = t[2],
      b = t[3];
    if (rails.includes(a)) [a, b] = [b, a];
    fanout.push([a, b]);
  }
  offsets.push(fanout.length);
}
fs.appendFileSync(
  "crates/ay38605/src/compiled.rs",
  `#[cfg(test)]\npub const FANOUT_OFFSETS:[usize;1525]=[${offsets}];\n#[cfg(test)]\npub const FANOUT:&[(usize,usize)]=&[${fanout.map((t) => `(${t})`)}];\n`,
);
