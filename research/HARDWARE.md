# Hardware research: “Hanimex 625-B RPG”

## Conclusion

The surviving photographs identify the machine most precisely as an **RPG
SD-050**, a member of Soundic's **PC-50x** family.  It is a cartridge-based
Pong system made in Hong Kong around 1978, with the cartridge carrying the
actual General Instrument (GI) game ASIC.  It is therefore a sound target for
an emulator, but it is not a conventional ROM-cartridge console: each
cartridge contains fixed game logic, rather than a program to dump.

This does *not* disprove the childhood memory of a Hanimex. Hanimex sold
closely related PC-50x machines, as did Punto Rojo, Soundic, Grandstand,
Binatone and others. An emulator aimed at the PC-50x cartridge interface and
GI chips should cover the relevant Hanimex variants. The remaining variation
is principally case, controller wiring/controls, and RF television hardware.

Confidence: **high** for the PC-50x/ASIC conclusion; **high** that the
photographed unit is RPG SD-050; **medium** for a one-to-one equivalence to
every Hanimex SD-050/TVG-070C revision.

## Resolving the name

The highly visible Imgur album is titled “Hanimex 625-B RPG pong console”, but
its original 2,933 × 1,968 photograph was later catalogued as
**RPG SD-050 Programmable Video Game** on Wikimedia Commons. Commons links it
to the owner's original Spanish forum post. In that post the owner says the
system reached Spain as *Punto Rojo*, was sold across Europe as Soundic,
Hanimex and “Programmable TV”, and was designated SD-050. This is strong
provenance for treating “Hanimex 625-B RPG” as a conflation of sibling
distributor names, not as a distinct Hanimex model.

`625-B PAL system` on the base label is a **television standard/RF label**
(VHF channel 1 in the photograph), not a machine or cartridge model number.
The label also specifies six UM-2/C cells or a 9 V DC, 200 mA adaptor. A
collector survey independently says 625-B appears on the cartridge consoles
of this Soundic family. Do not use it as a search term for ROM images.

## Cartridge hardware, not ROMs

Pong-Story's contemporary-collector documentation explicitly states that
SD-050 cartridges contain a GI chip, not a ROM. Its photographed PC-501
Supersportic cartridge has a single **AY-3-8610** and two paddle-position
trimmers; an independently photographed example has 36 edge contacts and the
same sole IC. The console mostly supplies power, input controls, audio/RF
support, and cartridge selection wiring.

The practical implication is that an archive may contain cartridge photos,
schematics, die images, or behavioural simulations, but a “PC-505 ROM dump”
would be a category error. That does **not** mean preservation work is absent:
Cole Johnson reverse-engineered an authentic AY-3-8605 die into a netlist and
published a browser-level simulation in 2019. It is a valuable correctness
oracle and shows that transistor-level preservation is possible; it should not
be represented as a released, production-ready emulator core.

| Cartridge | Game family | Chip | Confidence |
| --- | --- | --- | --- |
| PC-501 Supersportic | eight ball/paddle + two target games | AY-3-8610 | High; opened cartridge and GI documentation |
| PC-502 Motor Cycle | motorcycle | AY-3-8765 PAL (some lists say 8760) | Medium |
| PC-503 Tank Battle | tanks | AY-3-8710 | Medium-high |
| PC-504 Racing Cars | road race | AY-3-8603 | Medium-high |
| **PC-505 Submarine** | naval/submarine battle | **AY-3-8605** | High for chip/family; direct die simulation |
| PC-506 Super Wipeout | block/wipeout | AY-3-8606 | Medium-high |
| PC-507 Shooting Gallery | light-gun targets | AY-3-8607 | Medium |
| PC-508 Fundamental | basic ball/paddle | AY-3-8500 | Low-medium; inferred, not opened |

The remembered **Pong + Submarine** combination is particularly plausible:
PC-501 supplies the Pong/sports set and PC-505 is the Submarine/Sea Battle
cartridge. The PC-505's AY-3-8605 is a better first accuracy target than most
undocumented cartridges because it has both GI-era documentation and a
published die/netlist simulation.

## Emulator boundary

Emulate the GI chip and a small PC-50x host abstraction. Render component or
composite-video-derived pixels directly, while initially omitting RF modulation
and exact PAL analogue artefacts. RF differs across sibling consoles even when
their gameplay hardware is similar: a photographed Hanimex TVG-070C has
625-B PAL/VHF channel 1, while a Grandstand sibling uses UK System I/UHF 36.

The January 1978 GI *GIMINI TV Game Circuits* catalogue is the primary design
document. For the AY-3-8610 it specifies a 625-line PAL version, 28-pin
interface, two-axis bat inputs, scoring to 15, five rebound zones, speed-up
after seven hits, selection strobes, reset, and discrete hit/score tones. It
is sufficient for a documented PC-501 implementation. For PC-505, use the
same document for interface/host behaviour, then validate timing and obscure
state transitions against the AY-3-8605 simulation.

No console service schematic was found. Teardown evidence for the related
Hanimex TVG-070C shows the cartridge connector, two small support ICs, DIN
controller/light-gun sockets, a button board, and an RF sub-board, but not a
complete circuit diagram. Treat exact analogue colour, audio, controller
resistor values, and individual revision differences as open research.

## Sources and evidence quality

Primary / near-primary:

- [General Instrument, *GIMINI TV Game Circuits* (January 1978)](https://www.pong-story.com/GIMINI1978.pdf): chip pinouts, application circuits, game behaviour, and PC-50x-style system diagrams.
- [RPG SD-050 original photograph and attribution](https://commons.wikimedia.org/wiki/File:RPG_SD-050_Programmable_Video_Game_(1).jpg), and its [owner's original post](https://www.elotrolado.net/hilo_consola-hanimex-sd-050-punto-rojo-soundic-y-cable-de-antena-rf_2364968): exact photographed specimen and its distribution-name context.
- [Cole Johnson's AY-3-8605 die/netlist simulation report](https://nerdstuffbycole.blogspot.com/2019/10/shooter-game-in-silicon-inside-ay-3.html): direct silicon-derived PC-505 behaviour, with stated limitations.

Collector / secondary, useful but cross-check where possible:

- [Pong-Story’s SD-050 clone survey](https://www.pong-story.com/sd050.htm): cartridge-not-ROM statement and Hanimex family link.
- [RetroTechCollection’s photographed cartridge table](https://retrotechwiki.com/Grandstand_Programmable_Cartridges): PC-50x chip map, opened PC-501 details, and confidence caveats.
- [Related Hanimex/Grandstand maintenance and teardown notes](https://retrotechwiki.com/Grandstand_Colour_Programmable_SD070_General_Maintenance): PCB and RF-variant evidence; explicitly reports that no service manual/schematic was found.
