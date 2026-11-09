// Recognize charge storage connected by one gate-controlled transfer device
// to a pulled-up NOR driver. Neither terminal may be an externally driven pin.
export function findLatchCells(
  transistors,
  pulls,
  driven = new Set(),
  gnd = 170,
) {
  const cells = [];
  const lastNode = Math.max(...pulls.keys());
  for (let store = 0; store <= lastNode; store++) {
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
    if (drivers.every(([, a, b]) => a === gnd || b === gnd))
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
      "pinLeftBat",
      "pinRightBat",
      "pinLeftServe",
      "pinRightServe",
      "pinTest1",
      "pinTest2",
      "pinBallspeed",
      "pinBallsize",
      "pinBatsize",
    ]
      .map((name) => names[name])
      .filter((n) => n !== undefined),
  );
}
