# Hanimex

[Play](https://hanimex.vercel.app) · [Submarine](https://hanimex.vercel.app/?cartridge=submarine) · [Super Wipeout](https://hanimex.vercel.app/?cartridge=wipeout)

A browser recreation of the Hanimex / Soundic PC-50x console family. Drag a cartridge into the console, select a game, and play. The scene uses Three.js/WebGL; `?view=2d` opens the original interface.

**Submarine and Super Wipeout run recovered chip circuits in Rust/WebAssembly.** Open **Chip** to inspect live wires, select the transistor reference, pause or step half a clock. The same node states drive the TV and inspector.

Both run below hardware speed. Video is monochrome; original colour decoding and analog sound are unfinished. Wipeout uses the recovered NTSC AY-3-8606-1, rather than a verified PAL cartridge variant. Comparison with the recovered simulator does not replace testing against a physical console.

The other six playable cartridges are behavioral recreations. Some selections share simplified game models. Fundamental also has a separate [Pong circuit workbench](https://hanimex.vercel.app/?lab=ay38500), with live inspection but no console adapter yet.

## Controls

| | Move | Serve / fire |
| --- | --- | --- |
| Player 1 | W A S D | Space |
| Player 2 | Arrow keys | Enter |

Click or drag a cartridge to insert it. The orange keys select a game. P pauses; reset restarts. On-screen sticks and buttons support touch. Wipeout uses W/S and Up/Down for its bats; SPEED changes ball speed, L-TEAM changes bat size, and R-TEAM changes ball size.

Pull the TV cable far enough to unplug it and the screen turns to snow. Drag the plug back to its socket or use **Reconnect cable**. With the 3D canvas focused, C toggles the connection.

Contact failures are off by default. **Nostalgia mode** adds a 30% insertion-failure chance. Blow into the microphone or hold the button to clean the contacts. Audio stays in the browser and is never recorded or uploaded.

## Run

```sh
npm ci
npm run dev
npm run build
npm test
```

Vercel builds with `npm run build` and serves `web/dist`. There is no backend. Obel Mono and Inter are self-hosted.

The Wasm binaries are checked in. To regenerate them, install Rust with the `wasm32-unknown-unknown` target:

```sh
npm run build:chip
npm run build:wipeout
npm run build:recovered
```

Circuit checks:

```sh
npm run test:edges
npm run test:snapshots
npm run test:games
npm run test:wipeout
npm run test:wipeout:long
npm run test:recovered
```

## Research

These cartridges contain dedicated game circuitry, not conventional program ROMs. The “625-B RPG” photographs identify an RPG SD-050, a relative of the Hanimex machines; `625-B` belongs to the PAL television label.

- [Cartridge photographs](research/CARTRIDGE-PHOTOS.md)
- [Hardware and cartridge identification](research/HARDWARE.md)
- [Recovered chips and remaining gaps](research/OTHER-CARTRIDGE-DATA.md)
- [Submarine implementation and benchmarks](research/ay38605/TIMING-UPDATES.md)
- [Wipeout adapter and validation](research/ay38606/PLAYABLE.md)
- [Shared game-dependent latch banks](research/performance/LATCH-BANKS.md)
- [Register-backed timing blocks](research/performance/REGISTERS.md)
- [Chip profiling and browser scheduling](research/performance/README.md)
- [Source provenance](research/PROVENANCE.md)

Chip data retains its original attribution and notices. The Wipeout and Pong imports record conflicting upstream notices and preserve their share-alike attribution separately from the MIT simulation code.

### PC-000: CLIPPY.EXE

A fictional bonus cartridge, separate from the eight historical games. In 3D, click the TV cabinet or focus the desk and press **L** to lift it. Pick up the cartridge underneath. In 2D, click the small **PC-000** tab below the TV. It joins the shelf once found.

The ten scene keys select chrome Clippy, a window tunnel, raster bars, a folder storm, cascading errors, a starfield, plasma, a paperclip army, desktop meltdown and the finale. Left stick / WASD moves the view; right stick / arrows bends and stretches Clippy. Left fire / Space drops a beat; right fire / Enter triggers a glitch. SPEED changes tempo, L-TEAM changes palette, R-TEAM adds trails, AUTO cycles scenes. Power displays a fictional blue screen; Reset reboots. Music is synthesized locally and follows the sound toggle, pause, dialogs and tab visibility. Reduced motion disables the automatic visual movement, trails and glitch bursts.

[Open the demo directly](https://hanimex.vercel.app/?cartridge=clippy). This is new artwork and code, not an emulation of a historical cartridge. The repair-crew Easter egg is planned as a separate release.

### Channel 13

Turn VHF once, then UHF three times (within six seconds between turns). Click the TV knobs in either view, or press **V, U, U, U**. The cartridge pauses while the fictional pirate teletext station is on.

Keys **1–4** select the index, Pong results, classifieds and weather; VHF/UHF browse backward/forward. On Weather, press **Fire** to start a 30-second challenge. Move either joystick left/right (A/D or arrows) to catch rain and avoid lightning. **Back to game** or **Escape** returns to the cartridge; inserting another cartridge also retunes the TV. The broadcast works with console power off or the RF cable disconnected.
