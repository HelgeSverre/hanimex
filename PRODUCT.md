# Hanimex virtual console

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
User approved TypeScript + Vite; browser game cores with a future Rust/Wasm option. Static deployment is possible; current work is local in ~/code/hanimex.

## Users
Helge, revisiting a childhood Pong and Submarine console, and visitors interested in playing with this obscure hardware.

## Product Purpose
Make the Soundic/PC-50x Hanimex console family tangible and playable in a full-viewport browser experience.

## Operating Context
A television playing area with a faithful/inspired console at the side. Physically drag swappable cartridges into its slot. All eight PC-50x cartridges are present. Keyboard and touch alternatives must preserve access.

## Capabilities and Constraints
The user requested microphone blowing with a button fallback when optional random cartridge contact failures occur. Permission must be requested only on explicit microphone use. Audio is processed locally and not retained. Nostalgia failures are optional.

Game chips are dedicated circuitry, not ROM programs. Existing Rust prototype is provisional. Recovered AY-3-8605 netlist files are research material; initial browser games must be described as recreations rather than verified exact hardware emulation.

## Brand Commitments
The console's cream case, charcoal center, orange key bank, cartridge slot and two stick controllers are binding hardware references. Preserve the reference identity rather than adopting generic app chrome.

## Evidence on Hand
research/HARDWARE.md; research/EMULATION.md; original GI data books; recovered AY-3-8605 data under research/ay38605; original console photograph under work/console-reference.jpeg (reference only).

## Product Principles
- The hardware and cartridge ritual lead.
- Actual playable behavior, with visible accuracy boundaries.
- The joke never prevents normal play.
- No accounts, microphone uploads, or backend needed.
