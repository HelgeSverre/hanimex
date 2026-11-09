# Shared game-dependent latch banks

Baseline: `28b5a9d`. Research date: 2026-11-09.

The horizontal phase programs repeatedly evaluate the same game-dependent latch groups. The generator now shares these groups as compiled functions instead of repeating their bodies in each phase program. It recognizes 22 distinct groups in Submarine and 19 in Wipeout, each containing two to eight consecutive evaluations with a common transfer clock.

Each group first compares its current outputs with the values implied by its NOR drivers and clock. With the transfer gate open, the comparison packs the source and storage bytes into a 16-bit value. With it closed, only source evaluations can change a node; storage-only evaluations hold their charge. The individual cell evaluator remains unchanged.

If every compared output already has its expected value, the group emits no changes or fanout and returns. If any differs, the original evaluations run in their original order. This matters when a cell changes another cell's clock or data during propagation: the comparison does not precompute a new state to apply simultaneously.

The fast path is safe even with feedback: when all outputs are unchanged, none of those evaluations can change an input to a later evaluation. When that condition does not hold, the original sequential evaluation handles the feedback.

## What changed

- Reusable group functions replace 231 repeated groups in Submarine's phase programs and 151 in Wipeout's.
- The generated group functions are kept out of line, so phase programs share their machine code.
- No dirty-bit cache is maintained. Input changes require no new bookkeeping.
- The transistor reference sources and checked-in reference binaries are unchanged.
- Node snapshots, half-clock steps and inspector controls retain their existing behavior. No wire is omitted from inspection.

This is a compiled fast path for game-dependent latch groups, not a complete register-transfer rewrite of either chip. Changed groups and all remaining propagation still use the existing recovered logic.

Compiled Wasm sizes fall from 1,840,039 to 1,479,877 bytes for Submarine, and from 1,847,989 to 1,608,963 bytes for Wipeout.

## Remaining propagation

The [updated profile](latch-profile.json) runs three million clocks with changing controls in selection 1. Full cell evaluations fall from 178.4 to 159.5 per clock in Submarine (10.6%) and from 130.3 to 109.4 in Wipeout (16.0%). The bank comparisons themselves still do work and are not counted as cell evaluations. Node-change and queued-event counts remain exactly the same as the baseline.

These groups remove repeated evaluation of settled latches. Active latch transitions, fanout and event propagation still dominate the remaining work; hardware speed has not been reached.

## Experiments

[Exploratory measurements](latch-experiments.json) include rejected per-cell caches, cached bank masks, paired-output checks and inline grouped checks. Caches added too much input-invalidation work. Inline groups helped Wipeout slightly but did not give Submarine a clear gain. Sharing the compiled group functions produced the first repeatable improvement on both chips.

## Validation

- Every recovered node matched over 200,000 half-clock edges per chip, including selection changes and reset.
- Submarine matched nodes, raster and field counts over 19,633,536 clocks across all six selections, including the extended selection-1 run.
- Wipeout matched all ten selections: 129 actual fields in selections 1 and 9, nine fields in the others. Serve, ball movement, brick removal, bat movement, NTSC timing and reset checks passed.
- Sparse and frequent snapshots produced identical results across every selection, including manual half steps and resets.
- Browser worker checks passed for both compiled cores and both transistor references: startup pause, repeated run, inputs, pause stability and half-clock steps. The Wipeout inspector's clock signal also changed LOW to HIGH on a manual half step.
- Rust tests, strict Clippy checks, web tests and the production build passed. Both generators reproduce their checked-in output exactly.

## Measurements

[Final paired results](latch-benchmark.json) use Node 26.9 on an Apple M2 Max. Eight alternating trials per version warm through 500,000 clocks and time another two million clocks in selection 1. No other chip instance or test was running during measurement.

| Chip | Baseline median | Shared-bank median | Improvement | Hardware clock rate |
| --- | ---: | ---: | ---: | ---: |
| Submarine | 1,012,662 clocks/s | 1,071,057 clocks/s | 5.8% | 29.9% |
| Wipeout | 1,275,992 clocks/s | 1,372,569 clocks/s | 7.6% | 38.3% |

These are machine-specific core measurements, not full-browser frame rates or a full-speed claim. Raw trials and binary hashes are included.

The shorter [all-selection sweep](latch-all-modes.json) uses two alternating trials per version and 500,000 measured clocks. Wipeout improved in all ten selections (6.1–13.0%). Submarine ranged from −1.2% to +9.0% in that noisier sweep. Its selection 6 was the only negative result, so it received an [eight-trial repeat](latch-submarine-6.json) with two million measured clocks: 1,015,730 → 1,068,658 clocks/s, a 5.2% improvement. The short-run regression did not persist.

## Reproduce

```sh
mkdir -p work/latch-cache/baseline
git show 28b5a9d:web/src/chip/ay38605.wasm > work/latch-cache/baseline/ay38605.wasm
git show 28b5a9d:web/src/chip/ay38606.wasm > work/latch-cache/baseline/ay38606.wasm
node scripts/benchmark-registers.mjs work/latch-cache/baseline
node scripts/benchmark-registers.mjs work/latch-cache/baseline --all-modes
npm run test:edges
npm run test:snapshots
npm run test:engines:long
npm run test:wipeout:long
npm run test:wipeout
```

The bank compiler is `scripts/compile-latch-bank.mjs`; the two existing counter generators call it. Recovered node data keeps its original attribution to Cole Johnson and Sean Riddle: [Submarine](../ay38605/EMULATOR.md), [Wipeout](../ay38606/PROVENANCE.md).
