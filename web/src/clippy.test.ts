import { test } from "node:test";
import assert from "node:assert/strict";
import { ClippyDemo, demoScenes } from "./clippy.ts";
import { cartridges, cartridgeById } from "./catalog.ts";
import { emptyControls } from "./games.ts";

test("secret cartridge preserves the original eight and exposes ten scenes", () => {
  assert.equal(cartridges.length, 8);
  assert.ok(!cartridges.some((c) => c.id === "clippy"));
  assert.equal(cartridgeById("clippy")?.modes.length, 10);
  assert.equal(demoScenes.length, 10);
});
test("manual selection skips boot, stays in live scene and retains instrument state", () => {
  const demo = new ClippyDemo(0, false),
    input = emptyControls();
  input.autoServe = false;
  input.left.x = 1;
  input.right.x = 1;
  input.right.y = -1;
  for (let i = 0; i < 1000; i++) demo.update(0.02, input);
  assert.equal(demo.scene, 0);
  assert.ok(demo.yaw <= Math.PI && demo.bend <= 1 && demo.stretch <= 1.8);
  const beat = demo.beat,
    yaw = demo.yaw;
  demo.setScene(8);
  assert.equal(demo.scene, 8);
  assert.ok(demo.boot >= 3.5);
  assert.equal(demo.beat, beat);
  assert.equal(demo.yaw, yaw);
});
test("autoplay advances scenes, tempo changes beat clock, switches control palette and trails", () => {
  const slow = new ClippyDemo(0, false),
    fast = new ClippyDemo(0, false);
  const a = emptyControls(),
    b = emptyControls();
  b.fast = true;
  b.smallLeft = true;
  b.smallRight = true;
  for (let i = 0; i < 900; i++) {
    slow.update(0.02, a);
    fast.update(0.02, b);
    slow.drainNotes();
    fast.drainNotes();
  }
  assert.equal(slow.scene, 1);
  assert.equal(fast.scene, 1);
  assert.ok(fast.beat > slow.beat * 1.3);
  assert.equal(fast.palette, 1);
  assert.equal(fast.trails, true);
});
test("fire is edge triggered and reduced motion disables feedback trails", () => {
  const d = new ClippyDemo(0, true),
    input = emptyControls();
  input.smallRight = true;
  input.left.fire = true;
  input.right.fire = true;
  d.update(0.02, input);
  assert.deepEqual(
    d.drainNotes().map((n) => n.voice),
    ["kick", "snare"],
  );
  d.update(0.02, input);
  assert.equal(d.drainNotes().length, 0);
  assert.equal(d.trails, false);
  input.left.fire = false;
  d.update(0.02, input);
  input.left.fire = true;
  d.update(0.02, input);
  assert.deepEqual(
    d.drainNotes().map((n) => n.voice),
    ["kick"],
  );
});
