# Compiled AY-3-8605 logic

Branch: `submarine-gate-logic`, based on `submarine-chip-inspector`.

The next experiment, `submarine-sequential-blocks`, adds an 86-node horizontal timing state machine. See [SEQUENTIAL-BLOCKS.md](SEQUENTIAL-BLOCKS.md). The measurements below describe the earlier gate-only engine.

**Full speed has not been reached.** The recorded paired benchmark measured **3.46×** the transistor reference: 304,532 versus 88,118 clocks/s on Node 26.9.0 / arm64. That is **8.51% of nominal hardware speed**, not real time. Raw trials and binary hashes are in [gate-benchmark.json](gate-benchmark.json). Browser wall-clock throughput is lower than a tight compute benchmark and is displayed in the UI. Measurements depend on machine load; use the paired benchmark below rather than comparing unrelated runs.

## Compilation

`scripts/build-gates.mjs` partitions the preserved transistor netlist into 908 channel-connected blocks, excluding the supply rails. The 445 singleton and 393 two-node blocks become direct logic with incrementally maintained rail and transfer conditions. The remaining 70 blocks become 7,068 precomputed connectivity/ordering entries. These retain the reference solver's depth-first order, including its floating-charge resolution. A flat fanout table replaces runtime transistor objects.

The fast engine no longer walks the transistor graph, allocates connected groups, or clears a whole-chip deduplication array on every propagation pass. It reuses two work queues and clears only the consumed queue's markers. Selected small routines are inlined. Ship rules, positions, sprites, scoring and AI have not been reimplemented or accelerated independently.

This is a compiled logic-network implementation retaining switch-level state semantics. It is **not yet a synthesized counter/register model**. Profiling still finds about 404 block evaluations and 75 node changes per input clock. That event-scheduling cost is the remaining bottleneck. A full-speed implementation will probably need larger sequential primitives with a carefully validated mapping back to the original nodes.

An attempted optimization that removed apparently redundant pending events failed node comparison and was rejected. The retained engine preserves queue order. Matching the video alone would not have caught that error.

## Reference and inspection

`crates/ay38605/src/reference.rs` preserves the previous transistor algorithm. Only visibility and the shared error type differ. Cargo's `reference-engine` feature selects it while retaining identical chip input, clock, raster and exported Wasm interfaces. The build produces **both** `ay38605.wasm` and `ay38605-reference.wasm` from source.

The browser defaults to compiled logic. `?engine=reference` selects the transistor engine; `?engine=compiled` selects compiled logic. Both links insert Submarine, and switching resets the cartridge. Both retain the same 1,524-node inspector interface, polygons, signal probes and half-clock/full-clock/scanline stepping. The visible speed is active wall-clock speed, including worker scheduling, rather than just time spent inside Wasm. Work is divided into short worker time slices so pause and input messages remain responsive. Hidden pages explicitly pause the worker.

## Reproduce

```sh
npm run build:chip
npm test
npm run test:engines
npm run test:engines:long
npm run bench:chip
cargo clippy --all-targets --all-features --manifest-path crates/ay38605/Cargo.toml -- -D warnings
```

The paired engine check compares every node, every raw raster sample and the field count every 2,048 clocks. The standard run covers four fields of each selection. The long run extends selection 1 to 256 fields and varies controller, fire and skill pins. The long run passed: **19,633,536 clocks, 9,587 checkpoints**, across all six selections (256 fields of selection 1, four fields each of the others). This is equivalence testing against the recovered model, not physical hardware validation.

The benchmark alternates engine order for four trials, excludes initialization and warm-up, reports both median clock rates, and records the Wasm SHA-256 digests and Node version. Full-speed means 3,579,545 input clocks per wall-clock second; a speedup ratio alone does not establish that.

## Remaining work

Recognize and compile larger clocked counter/latch structures, then prove their behavior against the reference at clock edges and during pin changes. Keep node reconstruction explicit so the inspector does not become a decorative approximation. Power-on behavior, color decoding and external analog audio remain subject to the limitations in [EMULATOR.md](EMULATOR.md).

The original author's proposed DLAET/Verilog route was checked again. His public Chip Processing repository's `verilog/` directory still contains only `.gitkeep`; no ready AY-3-8605 gate-level implementation was available there to adopt. Related primary references: [Cole Johnson's silicon study](https://nerdstuffbycole.blogspot.com/2019/10/shooter-game-in-silicon-inside-ay-3.html), [Chip Processing](https://gitlab.com/TheProgrammerIncarnate/chip-processing), and [FPGA netlist tools](https://github.com/pmonta/FPGA-netlist-tools).

Generated logic remains derived from Cole Johnson's tracing and Sean Riddle's die photographs under CC BY 4.0. Reference solver attribution and MIT notices are retained.
