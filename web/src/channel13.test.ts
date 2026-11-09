import { test } from "node:test";
import assert from "node:assert/strict";
import { Channel13, SecretTuner } from "./channel13.ts";
import { emptyControls } from "./games.ts";

test("tuning requires the sequence and expires between turns", () => {
  const tuner = new SecretTuner();
  assert.equal(tuner.turn("uhf", 0), false);
  assert.equal(tuner.turn("vhf", 1), false);
  assert.equal(tuner.turn("uhf", 8), false);
  assert.equal(tuner.turn("uhf", 9), false);
  assert.equal(tuner.turn("uhf", 10), false);
  for (const [i, band] of (
    ["vhf", "vhf", "uhf", "uhf", "uhf"] as const
  ).entries())
    assert.equal(tuner.turn(band, 11 + i), i === 4);
  tuner.turn("vhf", 20);
  tuner.reset();
  assert.equal(tuner.turn("uhf", 21), false);
});
test("pages wrap and leaving weather ends its challenge", () => {
  const station = new Channel13();
  station.selectPage(-1);
  assert.equal(station.page, 3);
  station.startForecast();
  station.selectPage(4);
  assert.equal(station.page, 0);
  assert.equal(station.playing, false);
});
test("weather catches rain, penalizes lightning and clamps movement", () => {
  const station = new Channel13(),
    controls = emptyControls();
  station.selectPage(3);
  controls.left.fire = true;
  station.update(0.02, controls);
  station.drops = [{ x: 320, y: 351, storm: false }];
  station.update(0.02, controls);
  assert.equal(station.score, 1);
  station.drops = [{ x: 320, y: 351, storm: true }];
  station.update(0.02, controls);
  assert.equal(station.score, 0);
  controls.left.x = 1;
  for (let i = 0; i < 100; i++) station.update(0.02, controls);
  assert.equal(station.umbrella, 558);
});
test("weather ends at thirty seconds; held fire cannot restart it", () => {
  const station = new Channel13(),
    controls = emptyControls();
  station.selectPage(3);
  controls.left.fire = true;
  for (let i = 0; i < 1501; i++) station.update(0.02, controls);
  assert.equal(station.remaining, 0);
  assert.equal(station.finished, true);
  station.update(0.02, controls);
  assert.equal(station.playing, false);
  controls.left.fire = false;
  station.update(0.02, controls);
  controls.left.fire = true;
  station.update(0.02, controls);
  assert.equal(station.playing, true);
  assert.equal(station.score, 0);
});
