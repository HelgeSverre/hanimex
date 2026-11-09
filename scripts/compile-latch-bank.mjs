// Share ordered, same-clock latch banks between horizontal phase programs.
export function createBankCompiler(cells, maxSize = 8) {
  const byNode = new Map(
    cells.flatMap((c) => [
      [c.data, c],
      [c.store, c],
    ]),
  );
  const groups = new Map();
  return {
    compile(queue) {
      let body = "";
      for (let at = 0; at < queue.length;) {
        const first = byNode.get(queue[at]);
        if (!first) {
          body += `c.compiled_recalc(${queue[at++]});`;
          continue;
        }
        let end = at + 1;
        while (
          end < queue.length &&
          end - at < maxSize &&
          byNode.get(queue[end])?.clock === first.clock
        )
          end++;
        const run = queue.slice(at, end);
        if (run.length < 2) {
          body += `c.compiled_recalc(${queue[at++]});`;
          continue;
        }
        const key = run.join(",");
        if (!groups.has(key))
          groups.set(key, { id: groups.size, run, clock: first.clock });
        body += `latch_bank_${groups.get(key).id}(c);`;
        at = end;
      }
      return body;
    },
    finish() {
      let output = "";
      for (const { id, run, clock } of groups.values()) {
        // With the transfer gate open, both node bytes must equal the NOR
        // result. Packing them keeps the unchanged check to one comparison.
        const open = run
          .map((n) => {
            const c = byNode.get(n);
            return `((u16::from(c.state[${c.data}]) | (u16::from(c.state[${c.store}])<<8)) ^ (if c.ground_count[${c.data}]==0 {257} else {0}))`;
          })
          .join(" | ");
        // A closed storage node holds charge. Only source evaluations matter.
        const closed = run
          .filter((n) => byNode.get(n).data === n)
          .map((n) => `(c.state[${n}] ^ u8::from(c.ground_count[${n}]==0))`)
          .join(" | ");
        // An unchanged group cannot emit fanout, including through feedback.
        // Otherwise preserve every evaluation and its order: an earlier cell
        // may change a later cell's inputs, so do not apply precomputed values.
        output += `#[inline(never)] fn latch_bank_${id}(c:&mut super::GateCircuit) {let changed=if c.state[${clock}]!=0 {(${open})!=0} else {${closed ? `(${closed})!=0` : "false"}};if changed {${run.map((n) => `c.compiled_recalc(${n});`).join("")}}}\n`;
      }
      console.log({ sharedLatchBanks: groups.size });
      return output;
    },
  };
}
