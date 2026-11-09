# Propagation and fanout

Branch: `submarine-propagation`, based on `7818113` (`submarine-latch-banks`).

The transistor reference remains unchanged. Compiled execution still writes the
same 1,524 node bytes that drive the raster and inspector.

## Changes

**Generated fanout functions.** Each changed node dispatches to a function built
from its transistor fanout. Connection-count updates are combined per destination,
and rising/falling event queues are deduplicated in their original order. The
runtime no longer classifies every fanout transistor as ground, power or transfer.
All count updates precede enqueueing; no circuit evaluation occurs between them.
This preserves the original order of subsequent node evaluations. The compiler
can inline constant destinations in the timing programs.

**Queue generations.** A generation tag replaces the scan that cleared membership
flags before each propagation pass. Each pass starts a new generation; membership
still deduplicates only the next pass, never the pass being evaluated. The timing
program gets its own generation. Wraparound clears tags before restarting at one.
The existing 100-pass settling bound remains intact.

**Timing boundary.** The proven closed timing region now includes the downstream
chain ending at node 479: 92 nodes instead of 86. The complete state still has 456
half-clock transitions. Incoming dependencies, channel boundaries and stable
selection-disable inputs are checked by the generator. External writes invalidate
the cursor; re-entry checks the complete canonical state.

None of these changes substitutes recorded gameplay or reconstructed inspector
signals for the circuit state.

## Rejected experiments

- A table-driven, flattened fanout representation matched the reference but was
  slower than the previous engine.
- Profiling 500,000 clocks found 2,825 distinct ordered propagation queues. The
  eight most common queues were compiled with exact sequence guards. The small
  gain did not survive the other changes consistently, so this was removed.
- Fixed-size double-buffered event queues were slower than the reused vectors.

These experiments are excluded from the shipped engine.

## Validation

The Rust tests check all 3,048 node/polarity fanout combinations against the
original transistor-loop count updates and ordered event queues. They also
exercise queue-generation wraparound during circuit/reference comparison,
selection disable/re-enable, resets and repeated clock levels. The existing
303,328-case exhaustive latch check remains in place.

The Wasm checks compare every node after 200,000 clock edges and compare nodes,
raw raster bytes and field counts through all six game selections, each past the
startup movement-inhibit period. All six passed: **109,264,896 clocks and
53,352 checkpoints**, with no node, raster or field-count differences. Commands:

```sh
npm run build:chip
cargo test --manifest-path crates/ay38605/Cargo.toml
cargo clippy --all-targets --all-features --manifest-path crates/ay38605/Cargo.toml -- -D warnings
npm test
npm run test:edges
npm run test:games
```

## Performance

The final paired benchmark measured **941,076 clocks/s**, versus **835,535** for
`7818113`: **12.6% faster**, reaching **26.3% of hardware speed**. The transistor
reference measured 85,767 clocks/s; the compiled engine is about 11× faster.
Full speed has not been reached. Browser scheduling, rendering and die inspection
reduce throughput further.

[Measurements and binary hashes](propagation-benchmark.json) record four trials
in alternating order, each with 100,000 warm-up clocks and 100,000 measured clocks,
on Node v26.9.0 / arm64. The long differential tests were stopped before timing.
The compiled Wasm grows from 1.57 MB to 2.01 MB (211 KB to 274 KB gzipped).
These short performance runs measure the early simulation; they are not a
worst-case gameplay benchmark or a cross-device guarantee.

To reproduce the paired comparison:

```sh
mkdir -p work
git show 7818113:web/src/chip/ay38605.wasm > work/latch-baseline.wasm
node scripts/benchmark-chip.mjs --baseline=work/latch-baseline.wasm
```

## Other cartridges

The new circuit workbenches run AY-3-8606 and AY-3-8500 transistor models using the
unchanged reference solver with separate topology, rails and node counts. Both
match the preserved JavaScript solver through 10,200 edges including reset and
input changes. Their live layouts expose named signals and half-clock stepping.

They are not yet playable console adapters or optimized engines. The existing
playable Wipeout and Fundamental cartridges remain behavioral recreations.
Selection strobes, paddle charging, video, sound and PAL/NTSC differences still
need host-specific work. Source data, hashes and conflicting upstream license
notices are recorded in their separate provenance folders.
