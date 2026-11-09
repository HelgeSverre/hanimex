import { test } from "node:test";
import assert from "node:assert/strict";
import { RepairSequence } from "./repair-crew.ts";

test("repair restores once, then crew leaves without another restoration", () => {
  const sequence = new RepairSequence();
  assert.equal(sequence.advance(20), false);
  sequence.start();
  assert.equal(sequence.advance(2), false);
  assert.equal(sequence.phase, "arriving");
  assert.equal(sequence.advance(3), false);
  assert.equal(sequence.phase, "working");
  assert.equal(sequence.advance(6), true);
  assert.equal(sequence.phase, "leaving");
  assert.equal(sequence.advance(3), false);
  assert.equal(sequence.phase, "done");
  assert.equal(sequence.advance(20), false);
});
test("skip cancels pending repair, restart gets a fresh timeline", () => {
  const sequence = new RepairSequence();
  sequence.start();
  sequence.advance(8);
  sequence.stop();
  assert.equal(sequence.advance(30), false);
  assert.equal(sequence.phase, "idle");
  sequence.start();
  assert.equal(sequence.age, 0);
  assert.equal(sequence.advance(14), true);
  assert.equal(sequence.advance(1), false);
});
