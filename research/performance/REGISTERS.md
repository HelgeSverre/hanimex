# Register-backed horizontal timing

Baseline: `4ecafc478cc96a64241073bda2909d2ae301e03b`. Research date: 2026-11-09.

Both recovered chips now keep the internal horizontal counter and its latch chain in a phase register. The existing 456-state, half-clock transition sequence still comes from the transistor reference. The optimization removes internal wire writes and connection-count updates from normal clock transitions.

| Chip | Timing region | Internal wires held in register | Exposed wires updated immediately |
| --- | ---: | ---: | ---: |
| AY-3-8605 / Submarine | 92 | 67 | 25 |
| AY-3-8606 / Super Wipeout | 111 | 69 | 42 |

A wire is exposed if it has a recovered name or drives a transistor outside the closed region. The generator checks that no channel crosses the region boundary and that every incoming gate belongs to the region or its declared inputs. All exposed wires, their connection counts, and the ordered propagation into the rest of the chip retain their existing updates.

A generated dependency mask traces upstream channel drivers from the region and its inputs. Writes outside that cone, including ordinary paddle and fire inputs, preserve the phase register. Upstream writes reconstruct the internal wires and connection counts, then return to the generic gate solver. Re-entry verifies the complete timing vector, not only an index or counter value.

## Inspection and reference

`chip_nodes()` reconstructs all internal wires before returning their address. `chip_half_step()` does the same after each manual step, so an existing inspector view sees the new values. Repeated observations leave the phase register intact. Native Rust callers can use `GateCircuit::materialize_counter()` before reading hidden wires through `state`.

Each restore entry packs one wire value and three connection counts into 16 bits. Generation asserts that the packing is lossless. The transistor solver and the two checked-in reference binaries are unchanged. Rebuilding a reference binary may change compiler-generated source-location metadata as the shared wrapper moves; reference circuit behavior is unchanged.

The game-dependent latch banks still use the existing compiled gate programs. This change does not turn the entire chip into a register-transfer model, skip simulated clocks, or reproduce analog effects missing from the recovered model.

## Remaining work

The [updated event profile](register-profile.json) uses the same three-million-clock, changing-control workload as the previous profile. Remaining node evaluations are unchanged: 178.4 per clock for Submarine and 130.3 for Wipeout. Recognized latches still account for 63.1% and 50.5% respectively. This optimization saves internal state and count writes; it does not eliminate the remaining game-dependent propagation. Those latch banks remain the main candidate for a larger register-transfer conversion.

## Validation

- 200,000 half-clock edges per chip, comparing every recovered node against the transistor reference while changing selections, controls and reset.
- Submarine: 19,633,536 clocks across six selections, including a 256-field-length run in selection 1; every node and raster sample matched.
- Wipeout: all ten selections matched, with 129 actual fields in selections 1 and 9 and nine fields in each other selection. Serve, ball motion, brick removal, bat movement, NTSC timing and reset checks passed.
- Sparse versus frequent snapshots across all six Submarine and ten Wipeout selections, including long batches, half steps and resets. Both compiled instances match the reference's full node array and raster.
- Native tests independently recount conducting transistors and compare ground, power and bridge counts after every tested transition, including disabled timing and repeated clock levels.
- Browser worker checks cover both chips and both engines: startup pause, repeated run commands, input changes, pause stability and exact half-clock stepping.

The long comparison commands are `npm run test:engines:long` and `npm run test:wipeout:long`; snapshot cadence is checked with `npm run test:snapshots`. These checks establish agreement with the recovered digital model, not a physical console.

## Measurement

[Paired samples](register-benchmark.json) compare the previous and current compiled Wasm cores in Node 26.9 on an Apple M2 Max. Eight alternating trials per version warm through 500,000 clocks and measure another two million clocks in selection 1. No inspector is sampled during these measurements.

| Chip | Previous median | Register median | Improvement | Hardware clock rate |
| --- | ---: | ---: | ---: | ---: |
| Submarine | 910,415 clocks/s | 968,633 clocks/s | 6.4% | 27.1% |
| Wipeout | 1,173,177 clocks/s | 1,194,578 clocks/s | 1.8% | 33.4% |

These are small gains with visible trial-to-trial variation, not a full-speed claim or a guarantee across browsers and selections. Earlier shorter paired runs showed about 4% on each chip. The final sample file includes every trial and both binary hashes.

To reproduce, export the baseline cores and run the paired benchmark:

```sh
mkdir -p work/registers/baseline
git show 4ecafc4:web/src/chip/ay38605.wasm > work/registers/baseline/ay38605.wasm
git show 4ecafc4:web/src/chip/ay38606.wasm > work/registers/baseline/ay38606.wasm
node scripts/benchmark-registers.mjs work/registers/baseline
```

The compiled binaries shrink from 1,856,260 to 1,840,039 bytes for Submarine and from 1,848,978 to 1,847,989 bytes for Wipeout.

Wire identifiers retain the recovered-data attribution: Cole Johnson's tracing of Sean Riddle's die photographs. See [Submarine](../ay38605/EMULATOR.md) and [Wipeout](../ay38606/PROVENANCE.md).
