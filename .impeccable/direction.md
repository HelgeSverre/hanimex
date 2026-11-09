# Console workbench direction

Mode: Experience. Build path: code first because this is an interactive app screen. The user explicitly specified the hardware, full viewport, side-console layout, cartridge drag/drop and blowing ritual; shape that directly rather than reopening the visual direction.

First viewport: large black CRT at left (roughly 60% of desktop); a front/top view of the original cream/charcoal/orange hardware at right; eight tangible cartridges on a bottom shelf. No landing-page hero, marketing CTA, floating app cards or decorative dashboard widgets.

Signature: a cartridge keeps its grabbed offset while being dragged, highlights the actual console slot and seats there; selection also works with click/Enter. Optional contact failure leads to local microphone blowing or hold-button fallback and reinsertion.

Palette: warm dark brown room, ivory physical hardware, charcoal molded plastic, orange keycaps. Type: self-hosted Obel Mono display + Inter body. Hardware labels inherit the same grammar. All colors and fonts use tokens.

Responsive: fill desktop viewport without vertical scrolling at ordinary laptop sizes; smaller screens stack TV and console and allow the cartridge shelf to scroll. Each cartridge remains keyboard insertable. Controls and instructions remain available.

Accuracy: all game cores are behavioral browser recreations, explicitly distinguished from original-chip/netlist verification. Do not fabricate restored ROMs or preservation accuracy.


## WebGL experiment

On branch webgl-experiment, the first viewport is a real Three.js/WebGL desk scene. A larger, deeper and boxier CRT occupies the left; the cream/charcoal/orange console is on the right; eight cartridge objects sit at the front. Game graphics are a live CanvasTexture on the 4:3 curved screen. Raycasting drives cartridge pick/drop, keys, switches, sticks and screen aim. TV view hides foreground cartridges so they cannot obscure play. Orbit/zoom and an HTML cartridge popover provide alternate access; ?view=2d preserves the original interface. The original production domain remains on main; the experiment is published separately.
