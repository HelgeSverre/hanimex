// Recognize charge storage connected by one gate-controlled transfer device
// to a pulled-up NOR driver. Neither terminal may be an externally driven pin.
export function findLatchCells(transistors, pulls, driven = new Set()) {
  const cells = [];
  for (let store = 0; store < 1524; store++) {
    if (pulls.get(store) || driven.has(store)) continue;
    const contacts = transistors.filter(
      ([, a, b]) => a === store || b === store,
    );
    if (contacts.length !== 1) continue;
    const [clock, a, b] = contacts[0];
    const data = a === store ? b : a;
    if (!pulls.get(data) || driven.has(data)) continue;
    const drivers = transistors.filter(
      (t) => t !== contacts[0] && (t[1] === data || t[2] === data),
    );
    if (drivers.every(([, a, b]) => a === 170 || b === 170))
      cells.push({ store, data, clock, drivers: drivers.map((t) => t[0]) });
  }
  return cells;
}

export function drivenNodes(names) {
  return new Set(
    [
      "reset",
      "clk",
      "pinS1",
      "pinS2",
      "pinS3",
      "pinSkill1",
      "pinSkill2",
      "pinTest",
      "pinFireT",
      "pinFireDC",
      "pinSubInput",
      "pinDesInput",
    ].map((name) => names[name]),
  );
}
