# AY-3-8605 switch-level experiment

The `submarine-netlist` branch replaces the Submarine browser recreation with a Rust/Wasm switch-level simulator. The other cartridges remain behavioral recreations. Production remains on `main`.

## What runs

The preserved `transdefs.js` and `segdefs.js` drive the circuit: 1,524 nodes and 2,789 transistor entries in this archive revision. The 2019 article quotes 2,777 transistors; we preserve the recovered revision without deleting entries to match that older count. `scripts/build-netlist.mjs` generates typed data for the reference TypeScript solver and Rust runtime. No ship movement, sprite drawing, collision, score or opponent AI is implemented in the adapter.

The solver preserves the archived engine's connected-group traversal and floating-charge rules. A test compares all nodes with the original JavaScript engine for 2,000 half-cycles. Another compares the Rust/Wasm and TypeScript implementations across clocked reset and changing fire/controller inputs, including their raw video samples. These are regression checks against the recovered model, not independent proof that the tracing perfectly matches physical silicon.

The engine runs in a dedicated worker, so the 3D interface stays responsive. It pauses with the game, dialogs, power switch, and hidden page; ejecting or changing games terminates the worker.

## External wiring

- 3.579545 MHz nominal input clock; the recovered circuit produces 228 clocks per horizontal line and 71,136 clocks per field (312 lines, approximately 50.32 Hz).
- Controller RC charge timing follows the archive support code. The browser supplies 100 / 200 / 300 half-cycle thresholds for left / centre / right; analog tolerances and the original potentiometer response remain uncalibrated.
- Fire switches pull their chip pins low. The two paddle-size switches feed the two skill pins for this cartridge.
- Reset is held low for 128 full clock cycles, then released. The original author explicitly notes that a clocked reset is required for the ships to appear.
- Selection uses the documented two-strobe / three-select matrix. The adapter holds a key for three fields, then releases it, representing a momentary console key. This deliberately differs from the archive's always-held game-selection UI.

## Limits

This is an executable chip model, **not yet a finished faithful emulator**. The switch-level solver currently runs around 2–3% of nominal clock speed on the development machine. The UI reports measured simulation throughput. It does not skip or fabricate chip cycles to disguise the slowdown.

The displayed image is a monochrome diagnostic decode of the chip's video channels. AY-3-8615 color circuitry, RF modulation, analog audio filters/envelopes, controller calibration, and an independent physical-console trace comparison remain unfinished. The sound-generating logic exists in the netlist but its external audio circuit is not played. No full-game/end-score accuracy claim is made.

Normal-speed play will need an optimized gate-level implementation or generated logic. The transistor solver and node comparison harness provide the reference against which that implementation can be checked. Do not replace timing-sensitive circuits with behavioral shortcuts without documenting and testing the difference.

## Build and test

```sh
rustup target add wasm32-unknown-unknown
npm run build:chip
npm test
cargo clippy --manifest-path crates/ay38605/Cargo.toml --all-targets -- -D warnings
npm run build
```

The generated Wasm artifact is committed so static hosting can build without a Rust toolchain. Regenerate it whenever the Rust implementation or chip data changes. `cargo fmt` runs as part of the chip build. No third-party Rust crates are required.

## Sources and licenses

- [Cole Johnson's silicon study](https://nerdstuffbycole.blogspot.com/2019/10/shooter-game-in-silicon-inside-ay-3.html): reset, ship counters, slow logic, and performance limitations.
- [GI 1980 data catalogue](https://www.bitsavers.org/components/gi/_dataBooks/1980_GI_Microelectronics_Data_Catalog.pdf), pages 8-22–8-26: chip interface, external circuitry, and game rules.
- [Archived simulator](https://web.archive.org/web/20200928213704id_/http://nerdydelights.droppages.com/ChipSim/MultiSim/AY-3-8605.html): recovered framework and support code.
- [VisualP0NG](https://gitlab.com/TheProgrammerIncarnate/VisualP0NG): Visual6502-derived simulator lineage.

Original archive notices are preserved. The transistor and polygon data are attributed to Cole Johnson and Sean Riddle under CC BY 4.0. The solver is derived from Brian Silverman, Barry Silverman, and Cole Johnson's MIT code; its notice is retained in `crates/ay38605/LICENSE` and the TypeScript solver. `reference/` contains the archived engine, macros and TV support retrieved 2026-11-09 from the same 2020-09-28 capture as the netlist.

## Long-run observation

A 240-field run with the submarine control at threshold 300 cleared `subMoveDisable` between fields 176 and 192. The submarine's horizontal pixel centroid then advanced from 53.5 at field 192 to 61.5, 69.5, and 77.5 at successive 16-field intervals. Earlier short runs showed blinking and an apparent startup hit/score rather than movement. This startup sequence is not yet calibrated against physical hardware; the roughly 3.6-second initial inhibit must not be assumed to be correct power-on behavior. A later clocked reset is also available through the Wasm API for investigation.

## Inspector branch

`submarine-chip-inspector` is stacked on the emulator milestone. **Open cartridge** loads the recovered segment polygons only when needed. The display colors each polygon from its node's actual state in the worker that supplies the TV raster. It is a sampled live view, not an animation of every transition at hardware speed. Named signals are selectable without a pointer; pointer selection also supports unnamed nodes. Pan/zoom, pause/resume, half-clock, full-clock, and 228-clock scanline stepping are available. The sidebar shows raw pins and the live TV output. Closing the inspector releases its pause; ejecting destroys the inspector and worker.

`npm run build:chip` also regenerates `layout.json` on this branch. The layout preserves all recovered segments and the in-app attribution links to the authors and CC BY 4.0.

The reproducible native long-run check passed on 2026-11-09:

```sh
cargo run --release --manifest-path crates/ay38605/Cargo.toml --example validate
```

After 200 warm-up fields, measured submarine centroids were 45.5 (neutral), 51.5 (right), and 47.5 (left). The torpedo region went from zero to 20 asserted video samples after fire. The complete 252-field check took 257.7 seconds on the development machine. This establishes basic pin-controlled movement/firing, not full mode, collision, score-limit, or analog accuracy. All seven JavaScript/Wasm tests and Rust Clippy also passed. Deployed browser checks confirmed half-clock stepping (LOW → HIGH), full-clock and scanline counts, desktop/mobile inspector layout, and disposal on eject without console errors.
