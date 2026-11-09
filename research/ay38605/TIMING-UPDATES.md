# Timing propagation updates

This extends the [propagation and fanout work](PROPAGATION.md). The transistor reference source is unchanged, and all 1,524 nodes remain available to the raster and chip inspector.

The horizontal timing table previously stored a ground, power and bridge count delta for each affected node, including zero deltas. It now stores three separate sparse lists. The hot path updates only nonzero counts, without a branch per count. The generator deduplicates identical lists. State changes, queue order and latch banks are unchanged.

A second experiment emitted literal transition functions. It was slower and was discarded. The shipped optimization keeps the smaller table representation.

## Validation

- Rust tests compare generated fanout against transistor events, exercise reset and timing-macro fallback, and check all 303,328 latch input/charge combinations.
- The edge check compares every node through 200,000 half-clock transitions.
- The long game check compares every node and raster byte through 256 fields in each of six selections: 109,264,896 clocks in total, with changing controls.
- Browser checks cover pause, half-clock stepping and the shared inspector used by Wipeout.

## Measurement

[Raw benchmark samples](timing-benchmark.json) compare the previous propagation build with this build and the transistor reference. The harness alternates engine order, warms each instance, records four samples per engine, and reports medians and binary hashes. Run:

```sh
node scripts/benchmark-chip.mjs --baseline=work/propagation-baseline.wasm --clocks=500000
```

The baseline is the checked-in AY-3-8605 Wasm at commit `5b5755e`. Its SHA-256 is `a347779618732a5c78a080080328623fd0f5905301e01dc33853d91703a4aac6`.

The final 500,000-clock samples measured 681,405 clocks/s for this build versus 693,660 for the baseline (0.982×), with overlapping trial ranges. This does **not** establish a runtime gain. The retained change reduces the Wasm binary from 2,008,085 to 1,856,260 bytes (7.6%) while preserving circuit behavior. The compiled engine is 10.30× the transistor reference and 19.04% of nominal speed in this run. Earlier shorter trials varied enough that their apparent gains were not reliable. [Validation results](timing-validation.json) record the completed long run.

Full speed means 3,579,545 clocks per second. Browser wall-clock throughput includes worker scheduling and rendering and is lower than the isolated Wasm benchmark. Full speed has not been reached.
