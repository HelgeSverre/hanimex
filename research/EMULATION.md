# Emulation research: AY-3-8605 / PC-505 Submarine

## Finding

The remembered submarine game is a very strong match for the **PC-505 Submarine** cartridge. Its game IC is General Instrument's **AY-3-8605 Warfare**: the 625-line/CCIR part, while AY-3-8605-1 is the 525-line version. It is a dedicated NMOS TV-game chip, not a CPU with a readable cartridge ROM. Game logic, sprites, video timing, collision detection, scoring, and most sound generation reside in the chip; the PC-505 board carries it with passive support components.

That explains why no ordinary ROM image is available or expected. A conventional dumper cannot yield a binary game program. It also makes a faithful emulator possible without possessing an original console: its external behaviour is documented, and a transistor-level reconstruction survives.

## Why it matches the memory

GI's original 1980 data catalogue calls the chip family *Warfare*. It describes one- or two-player games with submarines, destroyers, cargo ships, and spaceships, naming *Sea Battle*, *Counterattack I and II*, *Night Battle*, and *Space Battle I and II*. It specifies depth charges, missiles, and torpedoes. The primary source is [GI Microelectronics Data Catalog 1980, pp. 8-22–8-26](https://www.bitsavers.org/components/gi/_dataBooks/1980_GI_Microelectronics_Data_Catalog.pdf).

Sea Battle puts a destroyer above a horizontally moving submarine, with a cargo ship to protect. The submarine fires upward torpedoes and the destroyer drops depth charges. Counterattack is a one-player variant against the chip's automatic submarine. Night Battle hides ships except while firing. The Space Battle selections change the naval graphics to spaceships and missiles. A submarine/u-boat game remembered as a primitive Space-Invaders-like shooter therefore fits PC-505 well, though it is not a Space Invaders port.

The PC-50x cartridge catalogue independently maps **PC-505 → Submarine → AY-3-8605**. It records six selections: Sea Battle, Destroyer, Night Sea, Submarine, Space A, and Space B; it also says the AY-3-8605 is the cartridge's only IC. See [Retro Ordenadores Orty](https://retroordenadoresorty.blogspot.com/p/consola-pong-circuitos-integrados-ic.html). The direct visual reference is the [period-hardware gameplay video](https://www.youtube.com/watch?v=hOlo2gDndT0) embedded in the silicon study below.

## Behavioural specification

The data sheet documents two one-axis analogue controls, or one axis of the common two-axis joysticks. Each controls only horizontal motion. The interface includes separate torpedo and depth-charge fire inputs, reset, two skill switches, and a two-strobe/three-select game-button matrix. Scores appear on screen and the game ends at 30 points.

Its timings provide a defensible calibration target: cargo ship traversal is 16 seconds, destroyer traversal 5.3 seconds, submarine traversal 8 seconds; a torpedo moves upward one scan line per frame and needs about 1.67 seconds to travel 100 lines; a depth charge falls one line every two frames and needs about 3.34 seconds to travel the same distance. The documented sound categories are engine, sonar, fire, and explosion. The AY-3-8605 produces CCIR-compatible sync, colour-burst location, and blanking from a 3.579545 MHz clock. Exact references are catalogue pp. 8-22 (interface/timing), 8-23 (reference circuit), and 8-24–8-26 (all game modes).

## Existing exact reconstruction

Cole Johnson's 2019 [“Shooter game in silicon: inside the AY-3-8605 chip”](https://nerdstuffbycole.blogspot.com/2019/10/shooter-game-in-silicon-inside-ay-3.html) reports that a physical chip was decapped and photographed by Sean Riddle, then traced into a 2,777-transistor netlist and run in a browser simulator. It identifies five moving objects (cargo ship, destroyer, submarine, torpedo, depth charge), seven position counters, scan counters, score logic, the colour matrix, and slow logic responsible for delayed submarine movement and sonar/blinking. The ship graphics use a hardware lookup table and shift register, not a conventional ROM.

The original simulator URL, https://nerdydelights.droppages.com/ChipSim/MultiSim/AY-3-8605.html, currently returns CloudFront 403 and cannot be relied on as a live source. This is a delivery failure, not evidence that the reconstruction was lost. A 2020-09-28 Wayback capture exposes these recoverable assets:

- [transistor netlist](https://web.archive.org/web/20200928213704id_/http://nerdydelights.droppages.com/ChipSim/MultiSim/UniqueFiles/ay38605/transdefs.js)
- [silicon polygons](https://web.archive.org/web/20200928213704id_/http://nerdydelights.droppages.com/ChipSim/MultiSim/UniqueFiles/ay38605/segdefs.js)
- [node names](https://web.archive.org/web/20200928213704id_/http://nerdydelights.droppages.com/ChipSim/MultiSim/UniqueFiles/ay38605/nodenames.js)
- [chip-specific support code](https://web.archive.org/web/20200928213704id_/http://nerdydelights.droppages.com/ChipSim/MultiSim/UniqueFiles/ay38605/support.js)

The recovered netlist artefacts have CC BY 4.0 headers crediting Sean Riddle's die photos and Cole Johnson's tracing; the browser simulator framework has MIT headers. Keep visible attribution if these artefacts are used. The related [VisualP0NG GitLab repository](https://gitlab.com/TheProgrammerIncarnate/VisualP0NG) is MIT-licensed, but presently contains only the AY-3-8500 simulator, not the AY-3-8605 netlist. The checked chip-processing `GIgames/ay38605` path has only .gitkeep at its checked commit. These are useful leads but are not a complete reusable AY-3-8605 Rust core.

## Implementation boundary

The current Rust implementation is intentionally a **provisional behavioural PC-505 emulator**: two naval modes, approximate rendering, headless PPM output, and turn-based CLI input. It has no audio, ROM loader, or claim of transistor/netlist accuracy. This makes the remembered game playable and supplies a test harness while preserving the distinction between behavioural recreation and hardware emulation.

For an accuracy phase, ingest the recovered CC-BY netlist and either compile its transistor graph into an event-driven Rust simulation or translate it to gate/Verilog form and compare frames with footage. A naive loop over 2,777 transistors at 3.579545 MHz will be too slow; Johnson reached the same conclusion and proposed netlist-to-Verilog conversion. Use the documented timings and period video as regression references.

## AY-3-8610 scope

PC-501/Supersportic uses the separate AY-3-8610 dedicated chip. Its fixed game matrix is Tennis, Hockey, Squash, Practice, Soccer, Basketball, Basketball Practice, Gridball, Target I, and Target II. It is not a compatible binary/ROM format and should become a separate cartridge core after Submarine.
