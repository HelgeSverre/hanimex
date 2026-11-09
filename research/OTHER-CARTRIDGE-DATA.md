# Other PC-50x chips: preservation evidence

Research date: 2026-11-09. “Ready” means a downloadable transistor netlist *and*
layout polygons/names sufficient to drive the existing reference engine and die
inspector. It does not mean that a game is merely documented or behaviorally
emulated.

## Decision

**PC-506 / AY-3-8606 is the next practical chip target.** It has a complete
published input-to-netlist artifact set and a close family relationship to the
existing AY-3-8605 work. The score circuitry is reported by its tracer to be
shared with 8605, which makes it a good test for reusable counter/latch
recognition. It must still be imported, wired to the PC-50x host, and compared
against its original JavaScript simulation; no ready Rust or full-speed HDL core
was found.

## Evidence matrix

| PC-50x cartridge | IC | Preserved silicon artifacts | License | Inspector-ready? | Confidence |
| --- | --- | --- | --- | --- | --- |
| PC-508 Fundamental | AY-3-8500/-1 | `VisualP0NG` ships transistor definitions, polygons and node names; `chip-processing` also ships source layers, generated data and an AY-3-8500 Verilog implementation. | Generated data and annotations: CC BY-SA 4.0; `VisualP0NG` program code: MIT; confirm notices per file. | **Yes**, after adapter work. | 🟢 |
| PC-506 Super Wipeout | AY-3-8606/-1 | `chip-processing/GIgames/ay38606` ships input layers plus generated `transdefs.js`, `segdefs.js`, and `nodenames.js`. The processor parameter file embeds CC BY 4.0 attribution. Cole reports the JavaScript circuit simulation worked. | CC BY 4.0 for die-photo derivatives/tracing; scripts CC0. | **Yes**, after adapter work. | 🟢 |
| PC-505 Submarine | AY-3-8605 | This repository preserves recovered `transdefs.js`, polygons and node names from the archived simulation. | CC BY 4.0 data; MIT reference simulator framework. | **Already implemented.** | 🟢 |
| PC-502 Motor Cycle | AY-3-8765 PAL (AY-3-8760 NTSC) | GI system material and cartridge lists identify the part, and catalog/datasheet copies document its external circuit. No public transistor set, annotated die layers, or inspector-compatible HDL was found in the checked primary repositories. | N/A | No. | 🟡 for identity, 🔴 for silicon data |
| PC-503 Tank Battle | AY-3-8710 PAL (AY-3-8710-1 NTSC) | GI's *GIMINI TV Game Circuits* documents the 28-pin circuit and pin-level host wiring. No public transistor set, annotated die layers, or inspector-compatible HDL was found in the checked primary repositories. | N/A | No. | 🟢 for identity/interface, 🔴 for silicon data |
| PC-504 Racing Cars | AY-3-8603/-1 | GI documentation/pinout support found; no public transistor set or annotated layer source found in the checked primary repositories. | N/A | No. | 🟡 for identity, 🔴 for silicon data |
| PC-507 Shooting Gallery | AY-3-8607/-1 | GI documentation/pinout support found; no public transistor set or annotated layer source found in the checked primary repositories. | N/A | No. | 🟡 for identity, 🔴 for silicon data |
| PC-501 Supersportic | AY-3-8610/-1 (not 8600) | Documentation and photographed specimens exist. `chip-processing` has an empty `ay38600` placeholder, not a netlist. A 2019 primary report said 8600-1 still needed highlighted die photos. | No reusable set identified. | No. | 🟡 for identity, 🔴 for silicon data |

The PC-50x cartridge-to-chip mapping above comes from the project's
[hardware research](HARDWARE.md) and is consistent with GI's 1980 catalog
(which lists Roadrace/8603, Warfare/8605, Wipeout/8606, and Shooting Gallery/8607).
AY-3-8500 is a dedicated pong IC in the PC-508 mapping; it is not a ROM dump.

## Primary sources checked

- [Cole Johnson: AY-3-8606 simulated circuit](https://nerdstuffbycole.blogspot.com/2019/03/the-ay-3-8606-another-successfully.html) — describes the completed JavaScript simulation, reports 2,975 transistors and 1,633 nodes, links to the source files, and distinguishes the unpublished next Verilog step.
- [Chip Processing: AY-3-8606 source tree](https://gitlab.com/TheProgrammerIncarnate/chip-processing/-/tree/master/GIgames/ay38606) — downloadable input layers and generated netlist/layout artifacts. Its [readme](https://gitlab.com/TheProgrammerIncarnate/chip-processing/-/blob/master/GIgames/ay38606/readme.md) gives the CC BY 4.0 provenance.
- [Chip Processing: AY-3-8500 source tree](https://gitlab.com/TheProgrammerIncarnate/chip-processing/-/tree/master/GIgames/ay38500) — input layers, generated data and the `ay38500NTSC.v` implementation. Its [readme](https://gitlab.com/TheProgrammerIncarnate/chip-processing/-/blob/master/GIgames/ay38500/readme.md) assigns CC BY-SA 4.0 to images/annotation.
- [VisualP0NG](https://gitlab.com/TheProgrammerIncarnate/VisualP0NG) — MIT JavaScript simulation with `SourceFiles/transdefs.js`, `segdefs.js`, and `nodenames.js` for AY-3-8500.
- [Cole Johnson: AY-3-8500 FPGA result](https://nerdstuffbycole.blogspot.com/2019/07/playable-emulation-and-more.html) — reports a complete die-derived Verilog implementation. That is useful for validation, but adopting it would need a separate licence/source audit.
- [GI 1980 data catalog](https://www.bitsavers.org/components/gi/_dataBooks/1980_GI_Microelectronics_Data_Catalog.pdf) — authoritative part/game/pin documentation for 8603, 8605, 8606 and 8607; it is not a transistor-level artifact.
- [GI *GIMINI TV Game Circuits*](https://bitsavers.org/components/gi/_dataBooks/GIMINI_TV_Game_Circuits_197801.pdf) — primary schematic and control wiring for AY-3-8710-1. It demonstrates that Tank Battle can be modeled more accurately at the host interface, but provides no die/netlist data.
- [Radofin Tele-sports IV cartridge list](https://retro.co.za/consoles/) — corroborating physical-system list for Skill Cycle / AY-3-8765 and Tank War / AY-3-8710; both part numbers retain a question mark there, so GI documentation takes precedence for chip identity.
- [2019 AY-3-8600 status](https://forums.atariage.com/topic/288619-tennis-a-pong-chip-port-to-the-intellivision/) — the tracer says die images existed but highlighted photos/netlist did not. This supports treating the empty repository directory as a placeholder, not evidence of recovered logic.

## Recommended implementation order

1. Import **AY-3-8606** under a separate `research/ay38606` provenance folder;
   preserve its original notices and hashes, generate Rust/TypeScript data, then
   build reference-versus-compiled differential tests before changing the UI.
2. Reuse the 8605 host abstraction only after verifying pin-level differences:
   selection is strobed, and paddle/ball/skill pins differ. Keep a distinct
   PC-506 adapter and inspector title so it cannot silently pretend to be 8605.
3. Use **AY-3-8500** second. Its finished HDL is potentially a useful oracle,
   but its CC BY-SA data and separate code licensing should be kept isolated
   from the CC BY 8605/8606 artifact paths.
4. For 8603, 8607 and 8610, retain behavioral recreations until a decap plus
   traced data is found or created. Datasheets, photographs, and game footage
   do not support a faithful transistor inspector.

## Limits

I found no PC-50x ROM dumps because these cartridges contain dedicated game
chips rather than ROMs. “No public netlist found” means the primary repositories
and the cited tracer's publications were checked; it is not proof that no
private decap, scan, or HDL exists.
