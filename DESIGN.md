---
name: Hanimex Virtual Console
description: A tactile late-1970s television-game workbench in cream plastic, charcoal, and orange.
colors:
  paper: "oklch(26% 0.012 70)"
  paper-2: "oklch(30% 0.012 70)"
  ink: "oklch(91% 0.02 85)"
  muted: "oklch(74% 0.018 80)"
  rule: "oklch(44% 0.012 75)"
  accent: "oklch(66% 0.18 42)"
  accent-ink: "oklch(19% 0.015 50)"
  focus: "oklch(85% 0.14 80)"
  cream: "oklch(84% 0.03 85)"
  cream-high: "oklch(91% 0.025 85)"
  cream-low: "oklch(64% 0.025 85)"
  label: "oklch(25% 0.012 70)"
  label-muted: "oklch(39% 0.015 70)"
  plastic: "oklch(33% 0.008 80)"
  plastic-high: "oklch(42% 0.008 80)"
  plastic-low: "oklch(22% 0.008 80)"
  well: "oklch(17% 0.008 70)"
  metal: "oklch(66% 0.012 80)"
  metal-high: "oklch(80% 0.012 80)"
  metal-low: "oklch(47% 0.012 80)"
  key-high: "oklch(74% 0.17 45)"
  key-low: "oklch(48% 0.14 38)"
  screen: "oklch(15% 0.018 145)"
  phosphor: "oklch(90% 0.025 110)"
  red: "oklch(62% 0.19 30)"
  overlay: "oklch(10% 0.01 70 / 0.8)"
typography:
  display:
    fontFamily: "Obel Mono, monospace"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "0.04em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Obel Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  sm: "3px"
  md: "8px"
  lg: "14px"
spacing:
  2xs: "0.25rem"
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
  3xl: "4rem"
components:
  quiet-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "38px"
    padding: "0 0.75rem"
  game-key:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "4px"
  cartridge:
    backgroundColor: "{colors.plastic}"
    textColor: "{colors.label}"
    rounded: "7px 7px 5px 5px"
  dialog-primary-button:
    backgroundColor: "{colors.label}"
    textColor: "{colors.cream-high}"
    rounded: "{rounded.sm}"
    padding: "12px 18px"
---

# Design System: Hanimex Virtual Console

## Overview

**Creative North Star: "The Console Workbench"**

This is an Experience-mode recreation, not a dashboard: a warm dark room contains a black CRT, a cream-and-charcoal console, and a shelf of tangible cartridges. Texture comes from molded-plastic gradients, recessed wells, metal trim, scanlines, and deliberate physical depth—not decorative chrome.

**Key Characteristics:**

- Hardware leads; the television, console, and cartridge ritual are the interface.
- Orange marks action, selection, and live status against cream, charcoal, and warm brown.
- Labels are concise, mono, and printed onto the object they describe.

## Colors

Warm brown surroundings make the cream hardware, orange keys, and pale phosphor legible as physical materials.

### Primary

- **Key Orange:** actions, active controls, selection, and status illumination.
- **Warm Paper:** the dark room behind the hardware.

### Neutral

- **Molded Cream:** console shell and light dialog surface, with high/low stops to model the case.
- **Charcoal Plastic:** television, controller, cartridge, and recessed assembly material.
- **Metal Trim:** narrow hardware edges and control details; never a generic UI border system.
- **CRT Green:** screen field and phosphor contrast; scanlines sit over game pixels.

**The Material-First Rule.** Apply color as a material role—case, recess, label, key, metal, glass, screen—not as arbitrary panel decoration.

## Typography

**Display Font:** Obel Mono, monospace.
**Body Font:** Inter, sans-serif.

Obel Mono is the printed-equipment voice for the wordmark, hardware labels, cartridge stock, and key legends. Inter is reserved for instructions, explanatory copy, and dialogs.

### Hierarchy

- **Display:** compact, mono, near-single-line treatment for identity and equipment markings.
- **Body:** readable supporting copy; dialogs use a generous reading line-height.
- **Label:** small mono text for controls, cartridge codes, and keyboard hints.

**The Printed-Label Rule.** Use Obel Mono for a label that appears to live on the physical object; do not use it to turn paragraphs into terminal text.

## Layout

Desktop is a two-column workbench: the CRT is the larger left object and the console is the right object; the eight-cartridge shelf spans beneath. At desktop widths of at least 960px and adequate height, the app fills the viewport and scales the television and shelf to avoid ordinary-laptop vertical scrolling. Above 1500px, outer breathing room and object scale increase.

At 800px and below, the workbench becomes a vertical sequence: CRT first, then console, then a horizontally scrollable, snap-aligned cartridge shelf. Utility labels collapse to icons where needed, and 44px touch controls appear under the television. At 380px and below, the same composition compresses without removing the core hardware controls.

## Elevation & Depth

Depth is structural and physical. Case shells use a darker bottom edge and a soft external shadow; slots, screen surrounds, and wells use inset darkness; active keycaps translate down. Dragged cartridges rise above the console with the strongest shadow. The screen adds glass, scanlines, and an inset black edge rather than card-like elevation.

**The Recess-and-Lip Rule.** Use depth to explain how a part is built or pressed. Flat generic cards and floating dashboard panels do not belong here.

## Shapes

The system mixes precise small control corners with soft molded hardware: 3px for utility controls, 8px for dialogs and slots, 14px for larger tokenized forms, and deliberately larger bespoke radii for the CRT and console shell. Controls have visible lower lips, cartridge bodies are slightly irregular in tilt, and round elements are reserved for knobs, joystick bases, lamps, and fire buttons.

## Components

### Buttons

- **Quiet utility button:** thin rule, small corner, transparent at rest; on hover it gains the secondary paper surface. Focus is always a 2px focus-color outline with a 4px offset.
- **Game keys and reset:** orange, beveled, mono-labeled physical keys. Selected keys darken, lighten their label, and move down; disabled keys remain visibly unavailable.
- **Hardware switches:** charcoal tracks with a metal lever that changes angle when pressed. Do not substitute toggles with modern pill switches.

### Cards / Containers

- **CRT and console:** they are hardware assemblies, not cards: gradient material, dark lower lip, structural shadow, and compound internal parts.
- **Dialogs:** cream-high reading surfaces over the dark overlay, with a modest rounded corner and a dark label-color primary action.

### Navigation

The masthead is a physical control bar: compact wordmark left, quiet sound/help controls right. The shelf is the game inventory; each cartridge is a focusable action with its code beneath rather than a navigation tile.

### Signature Components

- **Cartridge and slot:** cartridges can be clicked, keyboard-inserted, or dragged while preserving their grab offset. A valid target gets an orange outline; seating animates once it is inserted; the selected shelf item dims and labels itself as in the console.
- **Contact-fault dialog:** the optional failure state uses the same physical cartridge form, local microphone/hold action choices, progress, and a clear reinsert state.

## Do's and Don'ts

### Do:

- **Do** retain the hierarchy of CRT, console, then shelf on every viewport.
- **Do** make focus, pressed, selected, disabled, drag-ready, and reduced-motion states explicit.
- **Do** use orange sparingly for action and live state, and preserve cream/charcoal material contrast.

### Don't:

- **Don't** replace the hardware scene with a hero, dashboard, card grid, or floating app chrome.
- **Don't** flatten molded depth into uniform rounded rectangles or generic shadows.
- **Don't** hide keyboard insertion, touch controls, or the non-microphone fallback on smaller devices.


## WebGL experiment

The webgl-experiment branch adds a Three.js WebGL desk in web/src/webgl.ts. Console and cartridges are modeled geometry, with raycasting and a live game-canvas CRT texture. The CRT cabinet is 9.6 × 7 × 3.4 scene units; its 7.1 × 5.325 screen stays 4:3. Rounded edge radii are restrained to keep the cabinet boxy. Static cartridge ribs and contacts are batched to reduce draw calls. A TV view frames play, hides foreground cartridges, and adjusts distance for portrait screens. The HTML cartridge popover, retained 2D view, dialogs and keyboard controls provide alternatives to 3D picking. Materials retain the cream, charcoal, orange and Obel Mono/Inter direction.
