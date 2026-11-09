# Hanimex — Submarine chip experiment

Branch: `submarine-propagation`. Submarine uses compiled timing, latch and fanout logic, with a selectable transistor reference and live chip inspector. **Full speed is not reached.** [Implementation and validation](research/ay38605/PROPAGATION.md).

[Chip experiment](https://hanimex-chip.vercel.app) · [Main site](https://hanimex.vercel.app)

The scene uses Three.js/WebGL: a deep CRT cabinet with a live game-canvas texture, a modeled console, raycast cartridge dragging, physical game keys and sticks, orbit/zoom controls, and a close TV view. The original interface remains available at `?view=2d`.

A browser recreation of the Hanimex / Soundic PC-50x console family. Drag a cartridge into the console, select a game, and play.

Eight swappable cartridges, a CRT display, keyboard and touch controls, and optional contact failures. Blow into the microphone or hold a button to clean the contacts. Microphone audio stays in the browser; it is not recorded or uploaded.

**The other seven cartridges are behavioral recreations, not cycle-accurate emulators.** Some selections share a simplified game model. Original-chip timing, graphics, audio, and every variation remain unverified.

Insert Submarine and choose **Chip** in the header to inspect its live silicon layout. Select a signal, pan/zoom, pause, or step the circuit by a clock edge, clock, or scanline. The viewer samples actual states from the same chip instance driving the TV.

Wipeout and Fundamental now have separate circuit workbenches: [AY-3-8606](https://hanimex-chip.vercel.app/?lab=ay38606) · [AY-3-8500](https://hanimex-chip.vercel.app/?lab=ay38500). They run the recovered transistor networks with live wire inspection and clock stepping. Console controls and video adapters are still unfinished; the playable cartridges remain recreations.

## Run

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The app uses TypeScript, Three.js, and Canvas; it has no backend or accounts. Fonts are self-hosted Obel Mono and Inter.

```sh
npm run build
npm test
npm run test:edges
npm run test:games
npm run test:recovered
```

To regenerate the checked-in Wasm binaries, install Rust with the `wasm32-unknown-unknown` target, then run `npm run build:chip` and `npm run build:recovered`.

Vercel builds with `npm run build` and serves `web/dist`.

## Controls

| | Move | Serve / fire |
| --- | --- | --- |
| Player 1 | W A S D | Space |
| Player 2 | Arrow keys | Enter |

Click or drag a cartridge to insert it. The orange keys select a game. P pauses; the console reset button restarts. The on-screen sticks and fire buttons also work. Shooting Gallery accepts pointer aiming.

Contact failures are off by default. Enable **Nostalgia mode** in **How to play**, or use **Try a contact fault** to test the microphone/button interaction. Microphone access requires HTTPS or localhost.

## Research

The “625-B RPG” photographs identify an RPG SD-050, a relative of the Hanimex machines. `625-B` belongs to the PAL television label. The cartridges contain dedicated game circuitry, not conventional program ROMs.

- [Hardware and cartridge identification](research/HARDWARE.md)
- [Other cartridges with recovered chip data](research/OTHER-CARTRIDGE-DATA.md)
- [Emulation sources and accuracy gaps](research/EMULATION.md)
- [Source provenance](research/PROVENANCE.md)
- [Recovered AY-3-8605 Submarine data](research/ay38605/README.md)
- [Interface-writing research](research/WRITING.md)

The recovered chip data retains its original attribution and license notices. Manufacturer PDFs are kept locally; their source URLs are recorded in the research. This branch executes the Submarine transistor netlist; see the implementation notes above.

An earlier experimental Rust submarine model is in `src/`. Run it with `cargo run -- play`; check it with `cargo test` and `cargo clippy --all-targets -- -D warnings`. It follows an early GI system description that differs from the later AY-3-8605 datasheet; see the provenance notes.

## Credits

- [David Winter / Pong-Story](https://www.pong-story.com/sd050.htm), hardware documentation
- [Cole Johnson](https://nerdstuffbycole.blogspot.com/2019/10/shooter-game-in-silicon-inside-ay-3.html) and [Sean Riddle](https://seanriddledecap.blogspot.com/2018/05/gi-ay-3-8605-ball-and-paddle-games-ay-3.html), chip tracing and die photographs
- [Obel Mono / Typographic Systems](https://typographic.systems/obel-mono) and [Inter / Rasmus Andersson](https://rsms.me/inter/), SIL Open Font License

Console and cartridge graphics in the app are newly drawn from hardware references. This project is not affiliated with the original manufacturers.
