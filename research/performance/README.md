# Chip execution profile and worker scheduling

Baseline: `96477fd3942a806c72abd2352dd135c445657803`. Research date: 2026-11-09.

The shipped change replaces the worker's repeated zero-delay timers with MessageChannel tasks. Each task still runs at most about 16 ms of chip work before yielding to input. At most one continuation is pending. Pausing schedules no further tasks; a run command wakes the worker. Raster publication remains limited to roughly ten frames per second.

The [HTML timer algorithm](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps) imposes a minimum delay on sufficiently nested short timers. That delay consumed execution time between slices. Message tasks avoid that timer nesting while retaining a task boundary for input and pause commands.

**The four playable Wasm binaries are unchanged.** No simulated clocks, state transitions or inspector nodes are omitted. None of the experimental circuit optimizations described below ships.

## Measurements

[Browser benchmark](worker-benchmark.json) compares the actual old and new workers, including raster transfers, with identical compiled Wasm binaries. It alternates execution order, warms each worker through 500,000 clocks and records wall-clock throughput. These are machine- and browser-specific measurements, not a full-speed claim.

Four five-second trials per worker in Chrome 157 produced these medians:

| Chip | Timer worker | Message worker | Improvement | Hardware speed |
| --- | ---: | ---: | ---: | ---: |
| Submarine | 810,363 clocks/s | 1,066,263 clocks/s | 31.6% | 29.8% |
| Wipeout | 942,788 clocks/s | 1,222,291 clocks/s | 29.6% | 34.1% |

[Core profile](core-profile.json) records instrumented event counts over three million clocks with changing controls in selection 1, and separate V8 CPU samples over six million clocks. Profiling instrumentation is disabled in normal builds. The sampled workload does not establish performance for every selection or game state.

| Cost | Submarine | Wipeout |
| --- | ---: | ---: |
| Node evaluations per clock | 178.4 | 130.3 |
| Evaluations involving recognized latches | 63.1% | 50.5% |
| CPU samples in timing/latch programs | 47.5% | 43.8% |
| CPU samples in propagation settling | 33.6% | 31.2% |
| CPU samples in separate fanout functions | 10.9% | 16.3% |

## Larger-block experiments

The [exploratory benchmark samples](rejected-experiments.json) cover specialized channel evaluators, known-clock latch programs, a larger timing boundary, compiled propagation waves, packed latch metadata, direct NOR evaluation, fanout/evaluator outlining, compact queue bitsets and compiler optimization passes. Some early trials ran under variable machine load; apparent small gains did not survive repetition.

Compiling the 32 most expensive recurring propagation waves covered about 30% of Submarine's remaining node evaluations and 50% of Wipeout's. Those programs checked the complete ordered queue before dispatching and retained the generic fallback. They nevertheless ran slower. A dependency analysis also found no additional redundant latch evaluations that could safely be removed from the existing timing programs.

The current timing and latch compilation remains faster than these alternatives. Reaching hardware speed still requires reducing circuit work substantially; removing the worker's scheduling gaps does not solve that remaining problem.

## Reproduce

Capture event counts and ordered propagation waves without timing the instrumented build:

```sh
cargo run --release --features profile --manifest-path crates/ay38605/Cargo.toml --example profile
cargo run --release --features profile --manifest-path crates/ay38606/Cargo.toml --example profile
```

For the browser comparison, create the temporary baseline worker and start Vite:

```sh
git show 96477fd:web/src/chip/worker.ts > web/src/chip/worker-timer-baseline.ts
mkdir -p work
printf 'Chip worker benchmark\n' > work/worker-bench.txt
npm run dev -- --port 5178
```

Open the plain text file through Vite's `/@fs/` route using its absolute path. This avoids the development page's hot-reload client. In that page's console, import `scripts/benchmark-worker.mjs` through the same `/@fs/` route and call `benchmarkWorker()`. The result contains all trials and medians. Keep the page visible and run no other chip instance during measurement. Delete the temporary baseline worker afterwards.

Import `scripts/check-worker-browser.mjs` the same way and call `checkWorkers()` for the worker lifecycle checks. It exercises both chips and both engines, startup pause, repeated run messages, changing inputs, pause stability and exact half-clock stepping.

Wire identifiers and propagation patterns retain the corresponding recovered-data attribution: [Submarine](../ay38605/EMULATOR.md) and [Wipeout](../ay38606/PROVENANCE.md), traced by Cole Johnson from Sean Riddle's die photographs.
