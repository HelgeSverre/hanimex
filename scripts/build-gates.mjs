import fs from "node:fs";
import vm from "node:vm";
const id = process.argv[2] ?? "ay38605";
if (!["ay38605", "ay38606"].includes(id)) throw new Error("Unknown chip");
const c = vm.createContext({});
for (const file of ["transdefs", "segdefs", "nodenames"])
  vm.runInContext(fs.readFileSync(`research/${id}/${file}.js`, "utf8"), c);
c.transdefs = c.transdefs.filter((t) => !(id === "ay38606" ? t[5] : t[6]));
const nodeCount = Math.max(...c.segdefs.map((s) => s[0])) + 1;
const rails = [c.nodenames.gnd, c.nodenames.vcc],
  adj = Array.from({ length: nodeCount }, () => []);
for (const t of c.transdefs) {
  const [, g, a, b] = t;
  if (!rails.includes(a) && !rails.includes(b)) {
    adj[a].push(b);
    adj[b].push(a);
  }
}
const seen = new Set(rails),
  groups = [];
for (let i = 0; i < nodeCount; i++) {
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
const peers = Array(nodeCount).fill(65535);
for (const group of groups.filter((g) => g.length <= 2))
  for (const n of group) peers[n] = group.find((x) => x !== n) ?? n;
fs.writeFileSync(
  `crates/${id}/src/compiled.rs`,
  `// Generated gate-block classification from the ${id === "ay38605" ? "CC BY 4.0" : "CC BY-SA 4.0"} ${id.toUpperCase()} netlist.\n// Cole Johnson tracing / Sean Riddle die photographs.\npub const PEERS: [usize;${nodeCount}] = [${peers}];\n`,
);
console.log("compiled nodes", peers.filter((n) => n !== 65535).length);
const blockFor = Array(nodeCount).fill(0),
  localFor = Array(nodeCount).fill(0),
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
  `crates/${id}/src/compiled.rs`,
  `pub const NODE_BLOCK:[usize;${nodeCount}]=[${blockFor}];\npub const NODE_LOCAL:[usize;${nodeCount}]=[${localFor}];\npub const BLOCKS:&[(&[usize],usize,usize)]=&[${blocks.map((b) => `(&[${b.gates}],${b.base},${b.size})`)}];\npub const VIEWS:&[(usize,usize)]=&[${views.map((v) => `(${v})`)}];\npub const MEMBERS:&[usize]=&[${members}];\n`,
);
console.log({
  blocks: blocks.length,
  views: views.length,
  members: members.length,
});
const fanout = [],
  offsets = [0];
for (let gate = 0; gate < nodeCount; gate++) {
  for (const t of c.transdefs.filter((t) => t[1] === gate)) {
    let a = t[2],
      b = t[3];
    if (rails.includes(a)) [a, b] = [b, a];
    fanout.push([a, b]);
  }
  offsets.push(fanout.length);
}
fs.appendFileSync(
  `crates/${id}/src/compiled.rs`,
  `#[cfg(test)]\npub const FANOUT_OFFSETS:[usize;${nodeCount + 1}]=[${offsets}];\n#[cfg(test)]\npub const FANOUT:&[(usize,usize)]=&[${fanout.map((t) => `(${t})`)}];\n`,
);
