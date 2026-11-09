import fs from "node:fs";
import assert from "node:assert/strict";
const e = (
  await WebAssembly.instantiate(fs.readFileSync("web/src/chip/ay38606.wasm"))
).instance.exports;
const field = 228 * 262;
const run = (n) => assert.equal(e.chip_run(n), 0);
const input = (l, r, buttons = 0) =>
  assert.equal(e.chip_input(1, l, r, buttons), 0);
const raster = () =>
  Buffer.from(new Uint8Array(e.memory.buffer, e.chip_raster(), 228 * 320));
function components(b) {
  const seen = new Uint8Array(b.length),
    result = [];
  for (let n = 0; n < b.length; n++) {
    if (seen[n] || !(b[n] & 1) || b[n] & 48) continue;
    const queue = [n];
    seen[n] = 1;
    let x1 = 228,
      y1 = 320,
      x2 = 0,
      y2 = 0;
    for (let i = 0; i < queue.length; i++) {
      const a = queue[i],
        x = a % 228,
        y = Math.floor(a / 228);
      x1 = Math.min(x1, x);
      x2 = Math.max(x2, x);
      y1 = Math.min(y1, y);
      y2 = Math.max(y2, y);
      for (const z of [
        a - 228,
        a + 228,
        ...(x ? [a - 1] : []),
        ...(x < 227 ? [a + 1] : []),
      ])
        if (z >= 0 && z < b.length && !seen[z] && b[z] & 1 && !(b[z] & 48)) {
          seen[z] = 1;
          queue.push(z);
        }
    }
    result.push({ x1, x2, y1, y2 });
  }
  return result;
}
const ball = (b) =>
  components(b).find(
    (c) => c.x1 > 45 && c.y1 > 75 && c.x2 - c.x1 < 12 && c.y2 - c.y1 < 12,
  );
const bat = (b) =>
  components(b).find((c) => c.x1 < 45 && c.y1 > 75 && c.y2 - c.y1 > 15);
const bricks = (b) => b.reduce((n, v) => n + Number(!!(v & 2) && !(v & 48)), 0);
assert.equal(e.chip_init(), 0);
input(100, 150);
run(field * 6);
assert.equal(e.chip_field_clocks(), field, "recovered NTSC field duration");
const waiting = raster(),
  before = ball(waiting);
assert.ok(before);
assert.ok(bat(waiting));
run(field * 3);
assert.deepEqual(ball(raster()), before, "ball waits for serve");
input(100, 150, 1);
run(field * 2);
input(100, 150);
run(field * 40);
const playing = raster(),
  after = ball(playing);
assert.ok(after);
assert.ok(Math.abs(after.x1 - before.x1) > 20, "serve must move the ball");
assert.ok(bricks(playing) < bricks(waiting), "chip must remove hit bricks");
const oldBat = bat(playing);
input(180, 150);
run(field * 2);
const newBat = bat(raster());
assert.ok(newBat && oldBat);
assert.ok(newBat.y1 - oldBat.y1 > 60, "paddle RC threshold must move the bat");
assert.equal(e.chip_reset(), 0);
run(field * 5);
assert.ok(
  bricks(raster()) > bricks(playing),
  "clocked reset must restore bricks",
);
console.log(
  "Wipeout: serve, ball motion, brick removal, paddle movement, NTSC timing and reset passed",
);
