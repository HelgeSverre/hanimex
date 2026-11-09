import { test } from "node:test";
import assert from "node:assert/strict";
import { cartridges } from "./catalog.ts";
import { createGame, emptyControls, Naval } from "./games.ts";

test("each of the eight cartridges has a working core for every listed selection", () => {
  assert.equal(cartridges.length, 8);
  for (const cart of cartridges)
    for (let mode = 0; mode < cart.modes.length; mode++) {
      const game = createGame(cart.id, mode);
      const input = emptyControls();
      for (let tick = 0; tick < 2500; tick++) {
        input.left = {
          x: Math.sin(tick / 70),
          y: Math.cos(tick / 100),
          fire: tick % 80 < 8,
        };
        input.right = {
          x: Math.cos(tick / 80),
          y: Math.sin(tick / 100),
          fire: tick % 90 < 8,
        };
        game.update(1 / 50, input);
      }
      assert(
        game.scores.every(Number.isFinite),
        `${cart.code} selection ${mode + 1} scores`,
      );
      assert.equal(typeof game.ended, "boolean");
    }
});
test("replaying the same controls reproduces the same game state and events", () => {
  for (const cart of cartridges) {
    const a = createGame(cart.id),
      b = createGame(cart.id);
    const input = emptyControls();
    let eventsA: string[] = [],
      eventsB: string[] = [];
    for (let tick = 0; tick < 1500; tick++) {
      input.left.x = tick % 200 < 100 ? 1 : -1;
      input.left.fire = tick % 45 === 0;
      a.update(0.02, input);
      b.update(0.02, input);
      eventsA.push(...a.drainSounds());
      eventsB.push(...b.drainSounds());
    }
    assert.deepEqual(a.scores, b.scores);
    assert.deepEqual(eventsA, eventsB);
  }
});
test("Submarine mode supplies destroyer AI while Sea Battle leaves both players in control", () => {
  const solo = new Naval(3),
    versus = new Naval(0);
  const soloStart = solo.destroyer,
    versusStart = versus.destroyer;
  for (let n = 0; n < 20; n++) {
    solo.update(0.02, emptyControls());
    versus.update(0.02, emptyControls());
  }
  assert.notEqual(solo.destroyer, soloStart);
  assert.equal(versus.destroyer, versusStart);
});
test("Submarine limits repeated fire to four-second intervals", () => {
  const game = new Naval(0),
    input = emptyControls();
  input.left.fire = true;
  let shots = 0;
  for (let n = 0; n < 200; n++) {
    game.update(0.02, input);
    shots += game.drainSounds().filter((s) => s === "fire").length;
  }
  assert.equal(shots, 1);
});
