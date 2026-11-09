# Super Wipeout from the recovered circuit

PC-506 now uses the recovered AY-3-8606-1 in the normal console UI. All ten selections run the same circuit, with the selection contacts wired to its strobes. Open Chip for the live die, named probes, pause, half-clock stepping, and the slower transistor reference.

## Circuit and console wiring

The imported data contains 1,633 nodes and 2,990 transistor entries. The compiled engine recognizes 268 latch cells and replaces a 111-node horizontal timing region with a verified 456-state orbit. External selection pins remain outside that region. Noncanonical states fall back to the channel solver. Every original node remains available to the inspector.

The adapter follows the archived simulator’s support code: game selection uses S1/S2/S3 and four strobes; vertical sync discharges the paddle inputs, then horizontal lines charge them until the selected threshold. Serve, ball speed, ball size and bat size are active-low contacts. Selection is held for three startup fields and reset for four, allowing the brick scan to clear its storage. Reset during play lasts three fields.

Pixels come from the video output pins. There are no host-side balls, bricks, collision tests or scores. The browser integrates keyboard/stick movement into paddle thresholds. AUTO holds the serve contacts.

## Checks

- Exhaustive latch comparisons cover 572,608 input/charge combinations.
- Generated fanout is compared with the original ordered transistor events.
- The timing macro is checked across reset, disable, repeated input levels and queue-generation wrap.
- `npm run test:edges` compares every node at 200,000 half-clock edges per chip.
- `npm run test:wipeout:long` compares every node and raster byte in all ten selections, with changing paddles, serve and size/speed contacts; modes 1 and 9 run for 128 requested fields each, the others for eight.
- `scripts/check-wipeout-play.mjs` checks serve, ball movement, brick removal, paddle movement, reset and 59,736-clock NTSC fields.

## Limits

This is the recovered NTSC variant, not a verified PAL Hanimex cartridge. Paddle charging is a line-based approximation of the external analog circuit. Video is monochrome; colour decoding and analog sound remain unfinished. Reference agreement validates the optimization, not the original tracing or physical-console behavior. Both engines run below hardware speed.

See [provenance](PROVENANCE.md), [benchmark samples](timing-benchmark.json), and the preserved [support code](support.js).

The recorded benchmark measured 859,094 clocks/s, or 24.00% of nominal speed and 10.89× the transistor reference, on Node 26.9.0 / arm64. Browser throughput includes scheduling and rendering. [Validation results](playable-validation.json) record the completed checks.
