# Cartridge photo references

The black shell and green-and-white label remembered by Helge match the appearance of the Submarine PC-505 specimen photographed by Avon Fox. Helge confirmed that this looks like the cartridge he remembers. The photograph still does not establish his particular regional release or selector wiring.

- [Submarine PC-505, full-size front photo](https://www.the-liberator.net/site-files/retro-games/games/hanimex-sd-050-sd-070-sd-090-games/hanimex-sd-050-070-090-submarine-pc-505.JPG): black ribbed shell, bright green label, white lettering and three white game diagrams.
- [Supersportic PC-501, black-shell front photo](https://www.the-liberator.net/site-files/retro-games/games/hanimex-sd-050-sd-070-sd-090-games/hanimex-sd-050-070-090-supersportic-pc-501-black.JPG): black shell, red label, white game pictograms.
- [Super Wipeout PC-506, front photo](https://www.the-liberator.net/site-files/retro-games/games/hanimex-sd-050-sd-070-sd-090-games/hanimex-sd-050-070-090-superbwipeout-pc-506.JPG): blue-label specimen.
- [Collector's gallery](https://www.the-liberator.net/site-files/retro-games/games/hanimex-sd-050-sd-070-sd-090-game-cartridges.htm): front and rear views, plus Motor Cycle, Car Race and white-shell Supersportic variants.

Photos remain on the photographer's site; they have not been added as app assets. The Submarine and black Supersportic full-size photographs were visually inspected on 2026-11-09. Their watermark credits Avon Fox and says the image may be used unaltered with the watermark intact.

The pictured Submarine label lists selection numbers 3, 7, 2, 10, 6 and 1. These differ from the emulator's current six-selection presentation. Do not infer a new chip-pin mapping from this photograph alone; identifying the console's selector wiring is separate work.

## Recreated artwork (2026-11-09)

Both the 2D interface and WebGL desk use newly drawn SVGs in `web/public/cartridges/`. The generator is `scripts/build-cartridge-art.py`; run it with `uv run --script scripts/build-cartridge-art.py`. Its dependencies are pinned in the adjacent script lockfile. Inter lettering is converted to paths, with shared glyph definitions, so the two renderers use identical lettering without a font-loading race. No source photograph or crop is shipped.

The redraw follows the wide black ribbed shell, rounded inset label border, italic heading, printed game panels, orientation box and footer. Tank and Fundamental use the black shell family as a deliberate adaptation: the particular reference specimens below have cream shells. Sports pictograms, tank drawings and game screens are hand-drawn approximations, not pixel-exact tracings. Fundamental is based on a low-resolution group photograph; its small diagrams and instructions are approximate. The original printed selector numbers are retained where legible, independently of emulator selection mappings.

Additional references inspected:

- [Tank Battle PC-503 collector photograph](https://forums.atariage.com/topic/247835-wtb-pc-503-tank-battle-game-cartridge/): orange label, three illustrated tanks, cream shell.
- [Shooting Gallery PC-507 photographs by Retro Ordenadores Orty](https://retroordenadoresorty.blogspot.com/2024/05/cartucho-shooting-gallery-pc-507-y.html): lavender label, three target/trajectory diagrams and black shell. Front image: “PC-507 Shooting Gallery F3.jpg”.
- [Fundamental PC-508 research by Sly DC](https://slydc.blogspot.com/2016/11/pc-508-fundamental-cartridge.html): the first group photograph, “hongkong-px-501-508-carts.jpg”, shows the cream label and shell. This is weaker evidence for fine details than the larger individual front photographs.

Colours are median RGB values from unlettered patches in the downloaded reference images, interpreted as sRGB. They match those photo samples, not a calibrated measurement of original printing ink. Lighting, ageing and camera processing vary across photographs. White ink is represented by a shared warm white (`#f1f0df`); black linework by `#171a19`. The 3D label material bypasses tone mapping and scene lighting so its base colours agree with the 2D artwork.

| Cartridge | Label sRGB | Sample rectangle (left, top, right, bottom), original pixels |
| --- | --- | --- |
| Supersportic | `#6f1612` | 430, 725, 470, 750 |
| Motor Cycle | `#ff1a18` | 430, 725, 470, 750 |
| Tank Battle | `#ee7604` | 70, 165, 100, 195 |
| Car Race GP | `#f3e706` | 430, 725, 470, 750 |
| Submarine | `#02ac59` | 430, 650, 470, 680 |
| SuperbWipeout | `#0198db` | 430, 725, 470, 750 |
| Shooting Gallery | `#7c63b9` | 2150, 1180, 2200, 1230 |
| Fundamental | `#e0cb9b` | 324, 85, 333, 90 |
