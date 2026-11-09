# AY-3-8606-1 / PC-506 Super Wipeout

Imported from [Cole Johnson’s Chip Processing repository](https://gitlab.com/TheProgrammerIncarnate/chip-processing/-/tree/d32997903d84d95dbbea6da0cb55496cc16ab387/GIgames/ay38606) on 2026-11-09, commit `d32997903d84d95dbbea6da0cb55496cc16ab387`. SHA-256 checksums are in [hashes.json](hashes.json). The original three JavaScript artifacts are preserved verbatim.

Die photographs: Sean Riddle. Annotation and processing: Cole Johnson.

## Data notices

The upstream notices disagree. The generated JavaScript headers say **CC BY 3.0 US**, the processor parameter header says **CC BY 4.0**, and the directory README says **CC BY-SA 4.0** for photographs and annotation. Copies of both upstream documents are included. We preserve all notices and distribute our generated Rust data and layout derivatives under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), including attribution and share-alike requirements. This records the discrepancy; it does not claim the upstream notices have been reconciled.

The Rust solver code retains its separate MIT license.

## Archived console support

The original simulator’s [support.js](https://web.archive.org/web/20200928213704id_/http://nerdydelights.droppages.com/ChipSim/MultiSim/UniqueFiles/ay38606/support.js) was recovered on 2026-11-09 and preserved verbatim as `support.js`, including its MIT notice. It documents selection strobing, paddle charging and pin defaults. Its SHA-256 is recorded in `support-sha256.txt`. The archived transistor tuples and names match the imported Chip Processing artifacts.

## Implementation status

A separate Rust/Wasm build runs the actual recovered switch network. The browser circuit workbench renders its node bytes on the recovered polygons and provides run/pause, reset, named probes and half-clock stepping. It reuses the unchanged Submarine transistor solver with this chip’s own node count, transistor topology and power rails.

The console now also runs a playable Rust/Wasm adapter with compiled gates, latch cells and horizontal timing logic. A separate build retains the unchanged transistor solver. Both feed the same live chip inspector. See [adapter and validation](PLAYABLE.md) for controls, tests and limitations. The imported NTSC silicon variant still needs checking against the PAL Hanimex cartridge; colour and analog sound are unfinished.

`npm run test:recovered` compares every node against the preserved JavaScript solver over 10,200 clock edges per chip, with input changes, repeated reset and invalid-pin checks. This validates the solver port, not physical-console fidelity or gameplay.

Run `npm run build:recovered` to regenerate the workbench data, layout and Wasm binaries. Open `?lab=ay38606` in the app. The playable engines are regenerated with `npm run build:wipeout`; open `?cartridge=wipeout`.
