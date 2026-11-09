# Research provenance

Research date: 2026-11-09. No sellers or preservation authors were contacted; no purchases were made.

## Downloaded manufacturer document

`GIMINI_TV_Game_Circuits_197801.pdf`, 92 pages, General Instrument, January 1978.

Downloaded from: https://ftpmirror.your.org/pub/misc/bitsavers/components/gi/_dataBooks/GIMINI_TV_Game_Circuits_197801.pdf

Original archive URL: https://bitsavers.org/components/gi/_dataBooks/GIMINI_TV_Game_Circuits_197801.pdf (returned HTTP 403 in this session; mirror succeeded).

The PDF is an archived third-party manufacturer document, not project-authored material. Its original rights remain with their holders. Printed page 28 describes AY-3-8610 selection and rules; pp.30-36 describe its games; p.54 describes the submarine cartridge. Printed and PDF page numbers happen to match for these inspected pages.

## Source repositories inspected

- https://gitlab.com/TheProgrammerIncarnate/chip-processing — HEAD `d32997903d84d95dbbea6da0cb55496cc16ab387`. GitLab repository API shows `GIgames/ay38605` contains only `.gitkeep`. Presence of that directory is not presence of the netlist.
- https://gitlab.com/TheProgrammerIncarnate/VisualP0NG — HEAD `f413f25118c26e96afe09bd9720aa81e44dc4fe1`. Local scratch checkout under `work/VisualP0NG`. This is AY-3-8500-1, not AY-3-8610 or AY-3-8605. README identifies MIT code with file-specific notices; related annotated chip data has separate CC BY-SA notices. No upstream implementation was copied into this project's Rust core.

## Historical Submarine simulation

Author report: https://nerdstuffbycole.blogspot.com/2019/10/shooter-game-in-silicon-inside-ay-3.html

Historical target: https://nerdydelights.droppages.com/ChipSim/MultiSim/AY-3-8605.html — returned HTTP 404 through the research browser. The first Internet Archive CDX attempt returned a temporary-offline page. A later direct 2020-09-28 capture succeeded: transdefs.js, segdefs.js, nodenames.js and support.js are preserved under research/ay38605 with original license headers and SHA256SUMS. See that directory README for source URLs.

Die photographer: Sean Riddle, https://seanriddledecap.blogspot.com/2018/05/gi-ay-3-8605-ball-and-paddle-games-ay-3.html . Photo and netlist licenses must be verified independently before redistribution; the blog's default license does not automatically license every linked artifact.

## Physical hardware leads (volatile)

- https://www.ebay.ie/itm/127764115529 — advertised as “Soundic (hanimex) 625-b Game Console And Games,” two games, no power cable; observed AU$216.20 on the detail page. Exact identity/condition and shipping to Norway unverified. The seller's `Model: Tempest` metadata conflicts with the title and should not be trusted without checking the photographs.
- https://www.willhaben.at/iad/kaufen-und-verkaufen/d/spielkonsole-vintage-mit-1-spiel-1413181754/ — advertised Hanimex programmable machine with PC-501 in Vienna, €100. Availability and exact model unverified beyond the indexed listing.

Searches covered exact name/variants; SD-050/070/090; PC-501/505; AY-3-8610/8605; ROM/dump/emulator/netlist; GitHub/GitLab; manufacturer books; original photos; gameplay and sale leads. Negative results are bounded search results, not proof of nonexistence.

Downloaded PDF SHA-256: `090dac76335e023cf7f683511c212973f28aaf2a757852834175e6fc1d0327c2`.

## Conflicting GI specifications

The 1978 GIMINI system description (p.54) gives an early 15-point submarine game and 2:1 destroyer/submarine speed ratio. The later 1980 catalog AY-3-8605 datasheet specifies a 30-point game and different movement timings. These descriptions must not be silently combined as one verified hardware specification. The Rust prototype currently models the early description; the web prototype uses a 30-point game. Neither has yet been validated against the recovered transistor simulation.
