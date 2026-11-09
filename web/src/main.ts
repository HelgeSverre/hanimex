import "./style.css";
import { cartridges, cartridgeById, type Cartridge } from "./catalog";
import { createGame, emptyControls, H, W, type Game } from "./games";
import { ConsoleAudio } from "./audio";
const icon = (name: string) => {
  const paths: Record<string, string> = {
    sound:
      '<path d="M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    muted: '<path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3v.1"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    eject: '<path d="m5 13 7-9 7 9H5Zm0 5h14"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m5 9 7 7 7-7"/>',
    up: '<path d="m5 15 7-7 7 7"/>',
    mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? paths.help}</svg>`;
};
function art(id: string) {
  let paths = "";
  switch (id) {
    case "sports":
    case "fundamental":
      paths =
        '<path d="M12 10v40m76-40v40M50 5v8m0 7v8m0 7v8m0 7v8"/><rect x="62" y="24" width="6" height="6" fill="currentColor"/>';
      break;
    case "submarine":
      paths =
        '<path d="M5 20h90M20 17l5 8h46l9-8H20Zm24-7h14v7H44Zm-12 36 7 7h38l8-7H32Zm17-8h12v8H49Zm8-7v7m-24 2v-9m0-4v-3m34 9v8"/>';
      break;
    case "race":
      paths =
        '<path d="M19 1v58M81 1v58M50 1v9m0 7v9m0 7v9m0 7v9"/><rect x="31" y="30" width="12" height="21"/><path d="M27 34v5m20-5v5m-20 6v5m20-5v5"/><rect x="59" y="7" width="10" height="19"/>';
      break;
    case "motorcycle":
      paths =
        '<circle cx="30" cy="37" r="8"/><circle cx="66" cy="37" r="8"/><path d="m30 37 14-15 9 15H30m14-15h13l9 15m-8-25 3 3h-9l-8 7m-2-10h4m-8 34 47 10M8 54h17"/>';
      break;
    case "tank":
      paths =
        '<path d="M18 17h28v24H18Zm-4-3v30m36-30v30m-4-15h18m10 4h13v17H74Zm-4-3v23m21-23v23m-17-14H61"/><path d="M26 5h3m32 17h3M6 39h3"/>';
      break;
    case "wipeout":
      paths =
        '<path d="M8 7h84M8 19h84M8 31h55M8 7v24m21-24v24M50 7v24M71 7v12M92 7v12M35 55h32"/><rect x="65" y="39" width="4" height="4" fill="currentColor"/>';
      break;
    case "shooting":
      paths =
        '<circle cx="50" cy="30" r="20"/><circle cx="50" cy="30" r="10"/><path d="M50 2v14m0 28v14M22 30H8m84 0H78M50 27v6m-3-3h6"/>';
      break;
  }
  return `<svg viewBox="0 0 100 60" fill="none" stroke="currentColor" stroke-width="2">${paths}</svg>`;
}
const cartColor = (c: Cartridge) => `var(--color-cart-${c.color})`;
const cartridgeMarkup = (c: Cartridge) =>
  `<span class="cartridge-label"><span class="cart-code"><span>${c.code}</span><span>TV GAME</span></span><strong class="cart-name">${c.name}</strong><span class="cart-art">${art(c.id)}</span><span class="cart-footer">PROGRAMMABLE CARTRIDGE</span></span>`;
const wing = (n: number) =>
  `<div class="wing"><div class="vent" aria-hidden="true"></div><div class="controller"><div class="joystick-base" tabindex="0" id="joystick-${n}" aria-label="Player ${n + 1} joystick. Drag to move, or use ${n === 0 ? "W A S D" : "arrow"} keys."><span class="stick" aria-hidden="true"></span></div><button class="fire-button" id="fire-${n}" aria-label="Player ${n + 1} serve or fire"></button><span class="controller-label">SERVE / FIRE</span></div></div>`;
const switchMarkup = (id: string, title: string, on: boolean, cls = "") =>
  `<div class="toggle-cell"><span>${title}</span><button id="${id}" class="hardware-switch ${cls}" aria-label="${title}" aria-pressed="${on}"></button></div>`;
const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("App root missing");
root.innerHTML = `<a class="skip-link" href="#screen">Skip to game screen</a><div class="app">
<header class="masthead"><div class="wordmark"><span class="brand-symbol" aria-hidden="true">H</span><div><h1>HANIMEX</h1><p>PROGRAMMABLE TV GAME</p></div></div><div class="top-actions"><button class="quiet-button" id="audio-toggle" aria-pressed="true" aria-label="Sound on">${icon("sound")}<span class="button-label">Sound on</span></button><button class="quiet-button" id="help-open" aria-label="How to play">${icon("help")}<span class="button-label">How to play</span></button></div></header>
<main class="workbench"><section class="tv-area" aria-label="Television"><div class="television" id="television"><div class="screen-surround"><div class="screen" id="crt"><canvas id="screen" width="640" height="480" tabindex="0" aria-label="Game screen. Insert a cartridge, then use W A S D and Space for player one, arrows and Enter for player two.">Game graphics require a canvas-capable browser.</canvas></div></div><div class="tv-panel" aria-hidden="true"><span class="tv-channel">VHF</span><span class="tv-knob"></span><span class="tv-channel">UHF</span><span class="tv-knob"></span><div class="speaker"></div><span class="tv-lamp"></span></div><span class="tv-foot left"></span><span class="tv-foot right"></span></div><div class="tv-under"><span class="channel-label" id="channel-label">CHANNEL 01 / NO CARTRIDGE</span><div class="tv-actions"><button class="text-button" id="pause-toggle" aria-pressed="false">${icon("pause")}Pause</button><button class="text-button" id="fullscreen">${icon("expand")}Full screen</button></div></div><div class="mobile-controls"><div class="mobile-control-group"><button data-mobile="left" aria-label="Move left">${icon("left")}</button><button data-mobile="right" aria-label="Move right">${icon("right")}</button><button data-mobile="up" aria-label="Move up">${icon("up")}</button><button data-mobile="down" aria-label="Move down">${icon("down")}</button></div><button class="mobile-fire" data-mobile="fire">FIRE</button></div></section>
<section class="console-area" aria-label="Hanimex-inspired game console"><div class="console-intro"><h2 class="sr-only">Console</h2><span class="status-led on" id="power-status">POWER ON</span></div><div class="console" id="console">${wing(0)}<div class="console-middle"><button class="cartridge-slot" id="slot" aria-label="Empty cartridge slot. Select a cartridge from the shelf."><span class="slot-caption">INSERT CARTRIDGE</span></button><div class="key-bank" aria-label="Game selection">${Array.from({ length: 10 }, (_, n) => `<button class="game-key" data-mode="${n}" aria-label="Game ${n + 1}" aria-pressed="false" disabled>${n + 1}</button>`).join("")}</div><div class="console-controls">${switchMarkup("power", "ON/OFF", true, "power")}${switchMarkup("speed", "SPEED", false)}${switchMarkup("left-size", "L-TEAM", false)}${switchMarkup("right-size", "R-TEAM", false)}${switchMarkup("serve", "AUTO", true)}<div class="toggle-cell reset-cell"><span>GAME RESET</span><button id="reset" class="reset-key" aria-label="Reset game">RESET</button></div></div><div class="console-badge">HANIMEX</div></div>${wing(1)}</div><div class="console-bottom"><div class="mode-title"><p id="game-title"></p><span id="game-mode"></span></div><button class="text-button" id="eject" disabled>${icon("eject")}Eject</button></div><div class="insert-hint" id="insert-hint">Drag or click a cartridge to insert.</div><div class="state-toast" role="status" aria-live="polite" id="status-message"></div></section></main>
<section class="library" aria-labelledby="library-title"><div class="library-heading"><h2 id="library-title">Cartridges</h2></div><div class="cartridge-shelf">${cartridges.map((c) => `<div class="cartridge-wrap" data-cartridge="${c.id}"><button class="cartridge" data-id="${c.id}" style="--cart-color:${cartColor(c)}" aria-label="Insert ${c.short}, ${c.code}" aria-pressed="false">${cartridgeMarkup(c)}</button><span class="cartridge-caption">${c.code}</span></div>`).join("")}</div></section>
<footer class="app-footer"><div class="footer-controls"><p><span class="keycap">W A S D</span> Player 1 <span class="keycap">SPACE</span> Fire</p><p class="secondary-control"><span class="keycap">← ↑ ↓ →</span> Player 2 <span class="keycap">ENTER</span> Fire</p><p class="secondary-control"><span class="keycap">P</span> Pause</p></div><button class="recreation-note" id="about-open">Browser recreation · About</button></footer></div>
<dialog class="dialog" id="help-dialog" aria-labelledby="help-title"><button class="dialog-close" data-close="help-dialog">Close</button><h2 id="help-title">How to play</h2><p>Drag a cartridge from the shelf into the console slot. You can also click one or press Enter while it’s focused. The orange keys select the games on that cartridge.</p><div class="dialog-controls"><div><strong>PLAYER ONE</strong><p>W A S D to move<br>Space to serve / fire</p></div><div><strong>PLAYER TWO</strong><p>Arrow keys to move<br>Enter to serve / fire</p></div></div><p>Drag either stick on the console to move. The red buttons serve or fire. SPEED, L-TEAM and R-TEAM change the ball or bat settings in the sports games. AUTO serves the ball for you.</p><h3 id="help-game-name">The game</h3><p id="help-game-info">Insert a cartridge to see its controls.</p><h3>Optional contact faults</h3><label><input id="nostalgia-toggle" type="checkbox"/>Nostalgia mode: occasional bad contacts</label><p>When enabled, cartridges occasionally fail to load. Blow into your microphone or use the hold button, then reinsert. Turn this setting off for normal loading.</p><button class="quiet-button" id="try-ritual">Try a contact fault</button></dialog>
<dialog class="dialog" id="about-dialog" aria-labelledby="about-title"><button class="dialog-close" data-close="about-dialog">Close</button><h2 id="about-title">About this recreation</h2><p>Inspired by the Hanimex and RPG SD-050 consoles in the Soundic PC-50x family. “625-B” was part of the PAL television label. Each cartridge held an entire game chip, rather than an ordinary ROM.</p><h3>What is implemented</h3><p>Browser recreations, not cycle-accurate emulation. Some selections share a simplified game model. The console and cartridge labels are newly drawn.</p><p>The project includes research, a Rust prototype, and recovered Submarine chip data traced by Cole Johnson from Sean Riddle’s die photographs.</p><h3>Credits</h3><p><a href="https://nerdstuffbycole.blogspot.com/2019/10/shooter-game-in-silicon-inside-ay-3.html" target="_blank" rel="noopener">Cole Johnson’s Submarine study</a><br><a href="https://www.pong-story.com/sd050.htm" target="_blank" rel="noopener">David Winter’s Pong-Story</a><br><a href="https://typographic.systems/obel-mono" target="_blank" rel="noopener">Obel Mono by Typographic Systems</a> · SIL OFL<br>Inter by Rasmus Andersson · SIL OFL</p></dialog>
<dialog class="dialog" id="blow-dialog" aria-labelledby="blow-title"><button class="dialog-close" data-close="blow-dialog">Close</button><h2 id="blow-title">Cartridge not detected</h2><p>Clean the contacts, then reinsert the cartridge.</p><div class="blow-cartridge" id="blow-cart"><span>SUBMARINE<br>PC-505</span></div><div class="blow-progress" role="progressbar" aria-label="Cartridge cleaning" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="blow-meter"></span></div><p id="blow-status" class="blow-status" role="status" aria-live="polite">Use your microphone, or hold the button for a second.</p><div class="blow-actions"><button class="primary-button" id="use-mic">Use microphone</button><button class="quiet-button hold-blow" id="hold-blow">Hold to blow</button><button class="primary-button" id="reinsert" hidden>Reinsert cartridge</button></div><p class="tiny-note">Microphone audio is measured only in this tab. Nothing is recorded or uploaded.</p></dialog>`;
function el<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element ${selector}`);
  return element;
}
const canvas = el<HTMLCanvasElement>("#screen"),
  context = canvas.getContext("2d");
if (!context) throw new Error("Canvas unavailable");
const ctx = context;
const slot = el<HTMLButtonElement>("#slot"),
  audio = new ConsoleAudio();
let active: Cartridge | undefined,
  game: Game | undefined,
  mode = 0,
  powered = true,
  paused = false,
  contactFault = false,
  nostalgia = false,
  bootTime = 0;
let simAccumulator = 0,
  lastTime = performance.now(),
  idleTime = 0;
const controls = emptyControls();
let focusScene: (() => void) | undefined;
const keys = new Set<string>();
const stickInputs = [
  { x: 0, y: 0, fire: false },
  { x: 0, y: 0, fire: false },
];
const mobileKeys = new Set<string>();
let aim: { x: number; y: number; fire: boolean } | undefined;
const dialogs = Array.from(
  document.querySelectorAll<HTMLDialogElement>("dialog"),
);
try {
  nostalgia = localStorage.getItem("hanimex.nostalgia") === "true";
  audio.enabled = localStorage.getItem("hanimex.sound") !== "false";
} catch {
  /* Storage may be unavailable in private/embedded contexts. */
}
const setStatus = (s: string) => {
  el("#status-message").textContent = s;
};
const savePrefs = () => {
  try {
    localStorage.setItem("hanimex.nostalgia", String(nostalgia));
    localStorage.setItem("hanimex.sound", String(audio.enabled));
  } catch {
    /* Preferences are optional. */
  }
};
function clearInput() {
  keys.clear();
  mobileKeys.clear();
  aim = undefined;
  stickInputs.forEach((s, n) => {
    s.x = 0;
    s.y = 0;
    s.fire = false;
    el(`#joystick-${n} .stick`).style.transform = "";
  });
}
function syncUI() {
  el("#power-status").classList.toggle("on", powered);
  el("#power-status").textContent = powered ? "POWER ON" : "POWER OFF";
  el("#power").setAttribute("aria-pressed", String(powered));
  el("#game-title").textContent = active?.short ?? "";
  el("#game-mode").textContent = active
    ? `${mode + 1} · ${active.modes[mode]}`
    : "";
  el("#channel-label").textContent =
    `CHANNEL 01 / ${!powered ? "POWER OFF" : contactFault ? "NO SIGNAL" : active ? active.name : "NO CARTRIDGE"}`;
  el<HTMLButtonElement>("#eject").disabled = !active;
  el<HTMLButtonElement>("#eject").hidden = !active;
  slot.setAttribute(
    "aria-label",
    active
      ? `${active.short} inserted. Press to eject.`
      : "Empty cartridge slot. Select a cartridge from the shelf.",
  );
  slot.innerHTML = active
    ? `<span class="inserted-cart" style="--cart-color:${cartColor(active)}"><span class="inserted-label"><strong>${active.name}</strong><span>${active.code} / PROGRAMMABLE</span></span></span>`
    : '<span class="slot-caption">INSERT CARTRIDGE</span>';
  document
    .querySelectorAll<HTMLButtonElement>(".game-key")
    .forEach((key, n) => {
      key.disabled = !active || n >= active.modes.length;
      key.setAttribute("aria-pressed", String(!!active && n === mode));
      key.setAttribute(
        "aria-label",
        active && active.modes[n]
          ? `Select game ${n + 1}: ${active.modes[n]}`
          : `Game ${n + 1}, unavailable`,
      );
      key.title = active?.modes[n] ?? "No game";
    });
  document.querySelectorAll<HTMLElement>(".cartridge-wrap").forEach((w) => {
    const inserted = w.dataset.cartridge === active?.id;
    w.classList.toggle("is-inserted", inserted);
    w.querySelector("button")?.setAttribute("aria-pressed", String(inserted));
    const caption = w.querySelector(".cartridge-caption");
    if (caption)
      caption.textContent = inserted
        ? "IN THE CONSOLE"
        : (cartridgeById(w.dataset.cartridge ?? "")?.code ?? "");
  });
  el("#insert-hint").innerHTML = contactFault
    ? `${icon("arrow")}Bad contacts. <button class="text-button" id="repair-contact">Blow on cartridge</button>`
    : active
      ? ``
      : `${icon("arrow")}Drag a cartridge into the slot, or click to insert.`;
  document
    .querySelector("#repair-contact")
    ?.addEventListener("click", openRepair);
  el("#help-game-name").textContent = active?.short ?? "The game";
  el("#help-game-info").textContent = active
    ? `${active.story} ${active.controls}`
    : "Insert a cartridge to see its controls.";
  el<HTMLInputElement>("#nostalgia-toggle").checked = nostalgia;
  el("#audio-toggle").setAttribute("aria-pressed", String(audio.enabled));
  el("#audio-toggle").setAttribute(
    "aria-label",
    audio.enabled ? "Sound on" : "Sound off",
  );
  el("#audio-toggle").innerHTML =
    `${icon(audio.enabled ? "sound" : "muted")}<span class="button-label">Sound ${audio.enabled ? "on" : "off"}</span>`;
}
function insert(cartridge: Cartridge, clean = false) {
  active = cartridge;
  mode = cartridge.id === "sports" ? 2 : cartridge.id === "submarine" ? 3 : 0;
  game = createGame(cartridge.id, mode);
  contactFault = !clean && nostalgia && Math.random() < 0.22;
  bootTime = 0.3;
  paused = false;
  clearInput();
  syncUI();
  slot.querySelector(".inserted-cart")?.classList.add("seating");
  syncPause();
  void audio.wake().then(() => audio.play("insert"));
  setStatus(
    contactFault
      ? `${cartridge.short}: bad contacts. Use “Blow on cartridge” to try again.`
      : `${cartridge.short} inserted. ${cartridge.modes[mode]}.`,
  );
  canvas.focus({ preventScroll: true });
  focusScene?.();
}
function eject() {
  if (!active) return;
  audio.play("eject");
  const name = active.short;
  active = undefined;
  game = undefined;
  contactFault = false;
  clearInput();
  syncUI();
  setStatus(`${name} returned to the shelf.`);
}
function setMode(n: number) {
  if (!active || n >= active.modes.length) return;
  mode = n;
  game = createGame(active.id, mode);
  clearInput();
  audio.play("switch");
  syncUI();
  setStatus(active.modes[mode]);
}
function syncPause() {
  el("#pause-toggle").setAttribute("aria-pressed", String(paused));
  el("#pause-toggle").innerHTML =
    `${icon(paused ? "play" : "pause")}${paused ? "Resume" : "Pause"}`;
}
el("#audio-toggle").addEventListener("click", () => {
  audio.enabled = !audio.enabled;
  savePrefs();
  syncUI();
  void audio.wake();
});
el("#eject").addEventListener("click", eject);
slot.addEventListener("click", () => {
  if (active) eject();
  else document.querySelector<HTMLButtonElement>(".cartridge")?.focus();
});
el("#power").addEventListener("click", () => {
  powered = !powered;
  clearInput();
  if (powered && active) game = createGame(active.id, mode);
  audio.play("switch");
  syncUI();
});
for (const [id, property] of [
  ["speed", "fast"],
  ["left-size", "smallLeft"],
  ["right-size", "smallRight"],
  ["serve", "autoServe"],
] as const) {
  el(`#${id}`).addEventListener("click", () => {
    controls[property] = !controls[property];
    el(`#${id}`).setAttribute("aria-pressed", String(controls[property]));
    audio.play("switch");
  });
}
el("#reset").addEventListener("click", () => {
  if (active) game = createGame(active.id, mode);
  paused = false;
  clearInput();
  syncPause();
  audio.play("switch");
  setStatus("Game reset.");
});
document
  .querySelectorAll<HTMLButtonElement>(".game-key")
  .forEach((key) =>
    key.addEventListener("click", () => setMode(Number(key.dataset.mode))),
  );
el("#pause-toggle").addEventListener("click", () => {
  paused = !paused;
  clearInput();
  syncPause();
});
el("#fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el("#television").requestFullscreen();
  } catch {
    setStatus("Full screen is unavailable in this browser.");
  }
});
function openDialog(id: string) {
  clearInput();
  const dialog = el<HTMLDialogElement>(id);
  if (!dialog.open) dialog.showModal();
}
el("#help-open").addEventListener("click", () => openDialog("#help-dialog"));
el("#about-open").addEventListener("click", () => openDialog("#about-dialog"));
document
  .querySelectorAll<HTMLButtonElement>("[data-close]")
  .forEach((b) =>
    b.addEventListener("click", () =>
      el<HTMLDialogElement>(`#${b.dataset.close}`).close(),
    ),
  );
dialogs.forEach((dialog) => {
  dialog.addEventListener("click", (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  });
  dialog.addEventListener("close", () => {
    clearInput();
    if (dialog.id === "blow-dialog") stopMic();
  });
});
el("#nostalgia-toggle").addEventListener("change", () => {
  nostalgia = el<HTMLInputElement>("#nostalgia-toggle").checked;
  savePrefs();
  if (!nostalgia && contactFault) {
    contactFault = false;
    syncUI();
    setStatus("Contacts restored. Nostalgia mode is off.");
  }
});
el("#try-ritual").addEventListener("click", () => {
  el<HTMLDialogElement>("#help-dialog").close();
  if (!active) insert(cartridges[4], true);
  contactFault = true;
  syncUI();
  openRepair();
});
// Pointer capture keeps the cartridge attached to the same grab point on mouse, pen and touch.
let drag:
  | {
      pointer: number;
      startX: number;
      startY: number;
      offsetX: number;
      offsetY: number;
      button: HTMLButtonElement;
      ghost?: HTMLElement;
      cartridge: Cartridge;
    }
  | undefined;
let suppressClick = false;
function cleanupDrag() {
  if (!drag) return;
  drag.ghost?.remove();
  drag.button.classList.remove("dragging");
  slot.classList.remove("drop-ready");
  drag = undefined;
}
function overSlot(x: number, y: number) {
  const r = slot.getBoundingClientRect();
  return (
    x >= r.left - 30 &&
    x <= r.right + 30 &&
    y >= r.top - 35 &&
    y <= r.bottom + 35
  );
}
document.querySelectorAll<HTMLButtonElement>(".cartridge").forEach((button) => {
  button.addEventListener("click", (e) => {
    if (suppressClick) {
      e.preventDefault();
      return;
    }
    const cart = cartridgeById(button.dataset.id ?? "");
    if (cart) insert(cart);
  });
  button.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || drag) return;
    const cartridge = cartridgeById(button.dataset.id ?? "");
    if (!cartridge) return;
    const r = button.getBoundingClientRect();
    drag = {
      pointer: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - r.left,
      offsetY: e.clientY - r.top,
      button,
      cartridge,
    };
    button.setPointerCapture(e.pointerId);
  });
  button.addEventListener("pointermove", (e) => {
    const d = drag;
    if (!d || d.pointer !== e.pointerId) return;
    if (!d.ghost && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 5)
      return;
    if (!d.ghost) {
      const r = button.getBoundingClientRect();
      d.ghost = button.cloneNode(true) as HTMLElement;
      d.ghost.classList.add("drag-ghost");
      d.ghost.setAttribute("aria-hidden", "true");
      d.ghost.tabIndex = -1;
      d.ghost.style.width = `${r.width}px`;
      d.ghost.style.height = `${r.height}px`;
      d.ghost.style.left = "0";
      d.ghost.style.top = "0";
      document.body.append(d.ghost);
      button.classList.add("dragging");
    }
    d.ghost.style.transform = `translate(${e.clientX - d.offsetX}px,${e.clientY - d.offsetY}px) rotate(-5deg)`;
    slot.classList.toggle("drop-ready", overSlot(e.clientX, e.clientY));
  });
  button.addEventListener("pointerup", (e) => {
    if (!drag || drag.pointer !== e.pointerId) return;
    const d = drag;
    const wasDragging = !!d.ghost,
      drop = wasDragging && overSlot(e.clientX, e.clientY);
    cleanupDrag();
    if (wasDragging) {
      suppressClick = true;
      setTimeout(() => {
        suppressClick = false;
      }, 0);
      if (drop) insert(d.cartridge);
    }
  });
  button.addEventListener("pointercancel", cleanupDrag);
  button.addEventListener("lostpointercapture", cleanupDrag);
});
for (let n = 0; n < 2; n++) {
  const joystick = el(`#joystick-${n}`);
  const moveStick = (e: PointerEvent) => {
    const r = joystick.getBoundingClientRect(),
      x = Math.max(
        -1,
        Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width * 0.45)),
      ),
      y = Math.max(
        -1,
        Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height * 0.45)),
      );
    stickInputs[n].x = x;
    stickInputs[n].y = y;
    el(`#joystick-${n} .stick`).style.transform =
      `translate(${x * 9}px,${y * 6}px) rotate(${x * 22}deg)`;
  };
  joystick.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    joystick.setPointerCapture(e.pointerId);
    moveStick(e);
    void audio.wake();
  });
  joystick.addEventListener("pointermove", (e) => {
    if (joystick.hasPointerCapture(e.pointerId)) moveStick(e);
  });
  joystick.addEventListener("lostpointercapture", () => {
    stickInputs[n].x = 0;
    stickInputs[n].y = 0;
    el(`#joystick-${n} .stick`).style.transform = "";
  });
  const fire = el(`#fire-${n}`);
  fire.addEventListener("pointerdown", (e) => {
    fire.setPointerCapture(e.pointerId);
    stickInputs[n].fire = true;
    void audio.wake();
  });
  fire.addEventListener("lostpointercapture", () => {
    stickInputs[n].fire = false;
  });
  fire.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") stickInputs[n].fire = true;
  });
  fire.addEventListener("keyup", () => {
    stickInputs[n].fire = false;
  });
  fire.addEventListener("blur", () => {
    stickInputs[n].fire = false;
  });
}
document.querySelectorAll<HTMLElement>("[data-mobile]").forEach((b) => {
  b.addEventListener("pointerdown", (e) => {
    b.setPointerCapture(e.pointerId);
    mobileKeys.add(b.dataset.mobile ?? "");
    void audio.wake();
  });
  b.addEventListener("lostpointercapture", () =>
    mobileKeys.delete(b.dataset.mobile ?? ""),
  );
});
const gameKeys = [
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "Enter",
];
window.addEventListener("keydown", (e) => {
  if (dialogs.some((d) => d.open) || e.ctrlKey || e.metaKey || e.altKey) return;
  const target = e.target as HTMLElement;
  const inControl = !!target.closest("button,input,a,select");
  if (inControl && (e.code === "Space" || e.code === "Enter")) return;
  if (e.code === "KeyP" && !e.repeat) {
    paused = !paused;
    syncPause();
    clearInput();
    e.preventDefault();
    return;
  }
  if (gameKeys.includes(e.code)) {
    keys.add(e.code);
    e.preventDefault();
    void audio.wake();
  }
  if (/^Digit[0-9]$/.test(e.code) && !e.repeat)
    setMode(e.code === "Digit0" ? 9 : Number(e.code.slice(-1)) - 1);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", clearInput);
document.addEventListener("visibilitychange", () => {
  clearInput();
  lastTime = performance.now();
  if (document.hidden) stopMic();
});
window.addEventListener("pagehide", stopMic);
canvas.addEventListener("pointerleave", () => {
  if (aim && !aim.fire) aim = undefined;
});
canvas.addEventListener("pointermove", (e) => {
  if (active?.id !== "shooting") return;
  const r = canvas.getBoundingClientRect();
  aim = {
    x: ((e.clientX - r.left) / r.width) * W,
    y: ((e.clientY - r.top) / r.height) * H,
    fire: aim?.fire ?? false,
  };
});
canvas.addEventListener("pointerdown", (e) => {
  if (active?.id === "shooting") {
    const r = canvas.getBoundingClientRect();
    aim = {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
      fire: true,
    };
    canvas.setPointerCapture(e.pointerId);
    void audio.wake();
  } else {
    stickInputs[0].fire = true;
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener("lostpointercapture", () => {
  if (aim) aim.fire = false;
  stickInputs[0].fire = false;
});
// The microphone is opt-in, measured locally and disconnected on success, close, hide or timeout.
let micStream: MediaStream | undefined,
  micContext: AudioContext | undefined,
  micAnalyser: AnalyserNode | undefined,
  micFrame = 0,
  micEpoch = 0,
  micDeadline = 0,
  micStarted = 0,
  micBaseline = 0.015;
let blowProgress = 0,
  holding = false,
  cleaned = false;
const blowDialog = el<HTMLDialogElement>("#blow-dialog");
function stopMic() {
  micEpoch++;
  cancelAnimationFrame(micFrame);
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = undefined;
  micAnalyser = undefined;
  const c = micContext;
  micContext = undefined;
  if (c) void c.close().catch(() => {});
  el<HTMLButtonElement>("#use-mic").disabled = cleaned;
}
function updateBlow(amount: number) {
  if (cleaned) return;
  blowProgress = Math.min(1, blowProgress + amount);
  el("#blow-meter").style.transform = `scaleX(${blowProgress})`;
  el(".blow-progress").setAttribute(
    "aria-valuenow",
    String(Math.round(blowProgress * 100)),
  );
  if (blowProgress >= 1) {
    cleaned = true;
    holding = false;
    stopMic();
    el("#blow-status").textContent =
      "Contacts cleaned. Reinsert the cartridge.";
    el<HTMLButtonElement>("#hold-blow").disabled = true;
    el<HTMLButtonElement>("#use-mic").hidden = true;
    el<HTMLButtonElement>("#reinsert").hidden = false;
    el("#reinsert").focus();
  }
}
function openRepair() {
  if (!active) return;
  blowProgress = 0;
  cleaned = false;
  holding = false;
  el("#blow-meter").style.transform = "scaleX(0)";
  el(".blow-progress").setAttribute("aria-valuenow", "0");
  el("#blow-status").textContent =
    "Use your microphone, or hold the button for a second.";
  el("#blow-cart").style.setProperty("--cart-color", cartColor(active));
  el("#blow-cart").innerHTML = `<span>${active.name}<br>${active.code}</span>`;
  el<HTMLButtonElement>("#hold-blow").disabled = false;
  el<HTMLButtonElement>("#use-mic").disabled = false;
  el<HTMLButtonElement>("#use-mic").hidden = false;
  el<HTMLButtonElement>("#reinsert").hidden = true;
  openDialog("#blow-dialog");
}
el("#use-mic").addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    el("#blow-status").textContent =
      "Microphone access needs HTTPS or localhost. Use Hold to blow instead.";
    return;
  }
  stopMic();
  const epoch = micEpoch;
  el<HTMLButtonElement>("#use-mic").disabled = true;
  el("#blow-status").textContent =
    "Allow microphone access, then give the cartridge a gentle blow.";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });
    if (epoch !== micEpoch || !blowDialog.open) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    micStream = stream;
    micContext = new AudioContext();
    await micContext.resume();
    if (epoch !== micEpoch) return;
    micAnalyser = micContext.createAnalyser();
    micAnalyser.fftSize = 1024;
    micContext.createMediaStreamSource(stream).connect(micAnalyser);
    micStarted = performance.now();
    micDeadline = micStarted + 12000;
    micBaseline = 0.015;
    el("#blow-status").textContent =
      "Listening locally. Blow toward your microphone.";
    const buffer = new Float32Array(1024);
    let previous = performance.now();
    const measure = (now: number) => {
      if (!micAnalyser || epoch !== micEpoch) return;
      const dt = Math.min(0.08, (now - previous) / 1000);
      previous = now;
      micAnalyser.getFloatTimeDomainData(buffer);
      let energy = 0;
      for (const value of buffer) energy += value * value;
      const rms = Math.sqrt(energy / buffer.length);
      if (now - micStarted < 400) micBaseline = Math.max(micBaseline, rms);
      else if (rms > Math.max(0.035, micBaseline * 2.3)) updateBlow(dt / 0.8);
      if (cleaned) return;
      if (now > micDeadline) {
        stopMic();
        el("#blow-status").textContent =
          "No sustained blowing detected. Try again, or use Hold to blow.";
        return;
      }
      micFrame = requestAnimationFrame(measure);
    };
    micFrame = requestAnimationFrame(measure);
  } catch {
    stopMic();
    el("#blow-status").textContent =
      "Microphone access was unavailable. Hold the button to blow instead.";
  }
});
const hold = el("#hold-blow");
hold.addEventListener("pointerdown", (e) => {
  if (cleaned) return;
  hold.setPointerCapture(e.pointerId);
  holding = true;
  el("#blow-status").textContent = "Blowing…";
});
hold.addEventListener("lostpointercapture", () => {
  holding = false;
});
hold.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    holding = true;
  }
});
hold.addEventListener("keyup", () => {
  holding = false;
});
hold.addEventListener("blur", () => {
  holding = false;
});
blowDialog.addEventListener("close", () => {
  holding = false;
});
el("#reinsert").addEventListener("click", () => {
  const cart = active;
  blowDialog.close();
  if (cart) insert(cart, true);
});
function drawIdle() {
  ctx.fillStyle = "#101610";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = powered ? "#cbd0bc" : "#283027";
  ctx.font = '22px "Obel Mono",monospace';
  if (!powered) {
    ctx.fillText("POWER OFF", W / 2, 245);
    return;
  }
  if (contactFault) {
    ctx.font = '24px "Obel Mono",monospace';
    ctx.fillText("NO SIGNAL", 320, 220);
    ctx.font = '13px "Obel Mono",monospace';
    ctx.fillText("CHECK CARTRIDGE CONTACTS", 320, 252);
    for (let j = 0; j < 16; j++) {
      ctx.fillStyle = j % 2 ? "#1b241c" : "#182018";
      ctx.fillRect(0, (j * 39 + idleTime * 40) % 480, W, 1);
    }
    return;
  }
  ctx.font = '19px "Obel Mono",monospace';
  ctx.fillText("INSERT A CARTRIDGE", 320, 232);
  ctx.font = '12px "Obel Mono",monospace';
  ctx.fillStyle = "#87917f";
  ctx.fillText("CLICK OR DRAG ONE INTO THE SLOT.", 320, 265);
  ctx.strokeStyle = "#485345";
  ctx.lineWidth = 2;
  ctx.strokeRect(268, 135, 104, 47);
  ctx.fillStyle = "#485345";
  ctx.fillRect(280, 173, 80, 5);
}
function frame(now: number) {
  const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  idleTime += dt;
  if (holding && blowDialog.open) updateBlow(dt / 1.2);
  const blocked = paused || dialogs.some((d) => d.open) || document.hidden;
  const axis = (negative: string, positive: string) =>
    (keys.has(positive) ? 1 : 0) - (keys.has(negative) ? 1 : 0);
  controls.left = {
    x: clampInput(
      axis("KeyA", "KeyD") +
        (mobileKeys.has("right") ? 1 : 0) -
        (mobileKeys.has("left") ? 1 : 0) +
        stickInputs[0].x,
    ),
    y: clampInput(
      axis("KeyW", "KeyS") +
        (mobileKeys.has("down") ? 1 : 0) -
        (mobileKeys.has("up") ? 1 : 0) +
        stickInputs[0].y,
    ),
    fire: keys.has("Space") || stickInputs[0].fire || mobileKeys.has("fire"),
  };
  controls.right = {
    x: clampInput(axis("ArrowLeft", "ArrowRight") + stickInputs[1].x),
    y: clampInput(axis("ArrowUp", "ArrowDown") + stickInputs[1].y),
    fire: keys.has("Enter") || stickInputs[1].fire,
  };
  controls.aim = aim;
  if (powered && active && game && !contactFault) {
    if (bootTime > 0) {
      bootTime -= dt;
      ctx.fillStyle = "#101610";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#cbd0bc";
      ctx.fillRect(35, H / 2, W - 70, 2);
    } else {
      if (!blocked) {
        simAccumulator += dt;
        while (simAccumulator >= 1 / 50) {
          game.update(1 / 50, controls);
          simAccumulator -= 1 / 50;
        }
        game.drainSounds().forEach((sound) => audio.play(sound));
      }
      game.draw(ctx);
      if (paused) {
        ctx.fillStyle = "#101610";
        ctx.fillRect(230, 215, 180, 48);
        ctx.fillStyle = "#cbd0bc";
        ctx.font = '20px "Obel Mono",monospace';
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", 320, 247);
      }
    }
  } else drawIdle();
  requestAnimationFrame(frame);
}
function clampInput(n: number) {
  return Math.max(-1, Math.min(1, n));
}
syncUI();
requestAnimationFrame(frame);

// This branch defaults to the WebGL desk; ?view=2d retains the original interface.
if (new URLSearchParams(location.search).get("view") !== "2d") {
  void (async () => {
    await document.fonts.ready;
    const { WebGLDesk } = await import("./webgl");
    const stage = document.createElement("main");
    stage.className = "scene-stage";
    stage.setAttribute("aria-label", "3D console desk");
    stage.innerHTML =
      '<div class="scene-toolbar"><button class="quiet-button" id="scene-library">Cartridges</button><span class="scene-hint">Drag to rotate · Scroll to zoom</span><div class="scene-view-actions"><button class="quiet-button" id="scene-repair" hidden>Clean contacts</button><button class="quiet-button" id="scene-eject" disabled>Eject</button><button class="quiet-button" id="scene-tv">TV view</button></div></div>';
    const app = el(".app");
    const library = el<HTMLElement>(".library");
    const workbench = el<HTMLElement>(".workbench");
    app.insertBefore(stage, el(".app-footer"));
    let tv = false;
    let desk: InstanceType<typeof WebGLDesk>;
    const restore2D = () => {
      desk?.dispose();
      focusScene = undefined;
      const mobile = stage.querySelector(".mobile-controls");
      if (mobile) el(".tv-area").append(mobile);
      document.body.classList.remove("webgl-mode");
      el<HTMLAnchorElement>(".skip-link").href = "#screen";
      workbench.hidden = false;
      library.removeAttribute("popover");
      stage.remove();
      document.querySelector("#view-2d")?.remove();
    };
    try {
      desk = new WebGLDesk(stage, canvas, {
        state: () => ({
          active: active?.id,
          mode,
          modeCount: active?.modes.length ?? 0,
          fault: contactFault,
          powered,
          fast: controls.fast,
          autoServe: controls.autoServe,
          smallLeft: controls.smallLeft,
          smallRight: controls.smallRight,
          left: controls.left,
          right: controls.right,
        }),
        insert: (id) => {
          const cart = cartridgeById(id);
          if (cart) insert(cart);
          desk.focus();
        },
        eject: () => {
          eject();
          desk.focus();
        },
        mode: (n) => {
          setMode(n);
          desk.focus();
        },
        toggle: (id) => {
          el(`#${id}`).click();
          desk.focus();
        },
        fire: (n, down) => {
          stickInputs[n].fire = down;
        },
        stick: (n, x, y) => {
          stickInputs[n].x = x;
          stickInputs[n].y = y;
        },
        aim: (value) => {
          aim = value;
        },
        gesture: () => {
          void audio.wake();
        },
      });
      focusScene = () => desk.focus();
      document.body.classList.add("webgl-mode");
      el<HTMLAnchorElement>(".skip-link").href = "#scene-screen";
      workbench.hidden = true;
      library.setAttribute("popover", "auto");
      el("#scene-library").addEventListener("click", () =>
        library.togglePopover(),
      );
      el("#scene-repair").addEventListener("click", openRepair);
      el("#scene-eject").addEventListener("click", () => {
        eject();
        desk.focus();
      });
      el("#scene-tv").addEventListener("click", () => {
        tv = !tv;
        desk.setTVView(tv);
        el("#scene-tv").textContent = tv ? "Desk view" : "TV view";
        desk.focus();
      });
      const view2d = document.createElement("a");
      view2d.id = "view-2d";
      view2d.className = "quiet-button";
      view2d.href = "?view=2d";
      view2d.textContent = "2D view";
      el(".top-actions").prepend(view2d);
      document.querySelectorAll<HTMLButtonElement>(".cartridge").forEach((b) =>
        b.addEventListener("click", () => {
          if (library.matches(":popover-open")) library.hidePopover();
          desk.focus();
        }),
      );
      const mobile = el(".mobile-controls");
      stage.append(mobile);
      stage.addEventListener("webgl-unavailable", () => {
        restore2D();
        setStatus("WebGL is unavailable. Using the 2D console.");
      });
      window.addEventListener(
        "pagehide",
        (event) => {
          if (!event.persisted) desk.dispose();
        },
        { once: true },
      );
    } catch {
      restore2D();
      setStatus("WebGL is unavailable. Using the 2D console.");
    }
  })();
}

if (new URLSearchParams(location.search).get("view") === "2d") {
  const link = document.createElement("a");
  link.className = "quiet-button";
  link.href = "./";
  link.textContent = "3D view";
  link.style.textDecoration = "none";
  el(".top-actions").prepend(link);
}
