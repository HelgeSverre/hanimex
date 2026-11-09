# Compiled horizontal timing block

Branch: `submarine-sequential-blocks`, based on `submarine-gate-logic`.

The next version compiles game-dependent cells and propagation banks; see [LATCH-BANKS.md](LATCH-BANKS.md). The measurements here describe the earlier timing-block version.

The horizontal timing circuit now runs as one **86-node sequential block**.
Its 456 states cover both half-clock phases of the chip's 228-clock line.
Each transition writes actual node values back into the same state array used
by the inspector. The rest of the chip still uses the compiled gate solver;
the transistor reference remains selectable and unchanged in algorithm.

This is a finite-state compilation of recovered circuitry, not a replacement
with an invented scanline counter. It does not yet achieve full hardware speed.

## Extraction

`scripts/build-counter.mjs` starts at node 983 in the horizontal latch bank.
It follows transistor channel connections and incoming gates until it reaches
the external clock (1365), selection-disable signal (1337), or supply rails.
That collects 54 nodes, including the two-phase clock generator and counter
feedback. It then adds channel-connected decoder blocks whose gate inputs are
entirely inside the region, reaching 86 nodes.

Generation checks that no channel crosses the region boundary, that every
external gate is accounted for, and that disable is driven only by the three
externally held selection pins. Thus the region cannot receive a new signal
from its downstream decoding while processing a clock edge.

The freshly built transistor reference supplies the transition vectors. The
generator observes 20,000 half-clock edges, rejects contradictory successors,
and requires a closed 456-state orbit. This covers the normal reachable timing
orbit, not every possible 86-bit power-on state. Unknown states use the gate
solver until they enter the known orbit.

A nine-bit index finds a candidate row. Entry checks all 86 internal bits plus
clock and disable before accepting it; the compact index alone is never trusted.
Consecutive clock edges follow a cached transition index. Any external drive,
including repeated clock levels, invalidates that cursor.

## Execution and inspection

Each compiled transition contains:

- Changes to the canonical node bytes.
- Aggregated changes to the gate solver's ground, power and bridge counts.
- An ordered, deduplicated queue of affected nodes outside the region.

The remaining circuitry then settles normally. Keeping connection counts current
allows immediate fallback when a reset, selection change or unusual state needs
the gate solver. A debug invariant rejects propagation back into the timing block.
The inspector still shows all 1,524 nodes and supports half-clock stepping; it
has no separate approximate visualization model.

The 28-node latch-bank-only prototype failed at node 1513 on the first compared
edge. Its feedback and charged internal nodes had to be included. The 38-node
feedback region passed the initial comparison, then grew to include its clock
phases and decoder. Merely replacing the visible counter bits was insufficient.

A separate experiment unrolled common propagation queues into straight-line
Rust. It preserved queue order but did not improve the browser benchmark enough
to retain. It is not part of this implementation.

## Validation and performance

Run:

```sh
npm run build:chip
cargo test --manifest-path crates/ay38605/Cargo.toml
npm test
npm run test:edges
npm run test:engines:long
npm run bench:chip
```

To reproduce the three-way comparison against commit `cb075a0`:

```sh
mkdir -p work
git show cb075a0:web/src/chip/ay38605.wasm > work/baseline-gates.wasm
node scripts/benchmark-chip.mjs --baseline=work/baseline-gates.wasm
```

The Rust differential test exercises reset, all selection-key combinations,
fire inputs, disable/re-enable and repeated clock levels, comparing every node
after each drive. It also requires actual macro use, so a silent fallback-only
implementation cannot pass. The edge check compares every node on 200,000
half-clock edges, varies modes and controls, and includes repeated resets.
The final long check passed: **19,633,536 clocks and 9,587 checkpoints**,
with every node, raster sample and field count matching. These checks establish agreement with the recovered model in the tested
cases, not independent validation against a physical console.

The recorded three-way benchmark measured **390,865 clocks/s**, versus
306,179 for the previous gate engine and 89,286 for the transistor reference:
**27.7% faster than the previous gate engine**, **4.38× the reference**, and
**10.92% of nominal hardware speed** on Node 26.9.0 / arm64. Raw samples and
binary hashes are in [sequential-benchmark.json](sequential-benchmark.json).
The compiled Wasm grows from 278 KB to 1.40 MB (107 KB gzip), mostly transition
and connection-count tables. Browser wall-clock speed includes worker scheduling and rendering
and is lower than a tight Wasm benchmark. Full speed means 3,579,545 clocks/s.

## Next blocks

The seven-stage two-phase latch pipeline around nodes 495–639 is a candidate,
but it receives game-dependent signals and belongs to a much larger feedback
component. It cannot safely be turned into a free-running modulo counter.
A next implementation needs explicit phase/input contracts and reconstruction
of stored charge nodes, with checks at every half-clock edge. This is where
most of the remaining event-scheduling cost sits.

For another cartridge, [PC-506 / AY-3-8606](../OTHER-CARTRIDGE-DATA.md) has the
best available recovered netlist and die data. It should get its own reference
adapter before trying to reuse these timing-block extraction techniques.

Original tracing and generated derivatives retain CC BY 4.0 attribution to
Cole Johnson and Sean Riddle. The reference simulation framework retains its
MIT notices. See [EMULATOR.md](EMULATOR.md) for source provenance and remaining
color, sound and physical-hardware verification limits.
