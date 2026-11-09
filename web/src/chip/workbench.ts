import "../style.css";
import "./workbench.css";
interface Layout {
  names: Record<string, number>;
  nodeCount: number;
  transistorCount: number;
  segments: number[][];
}
export async function openWorkbench(id: "ay38606" | "ay38500") {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  const title =
    id === "ay38606" ? "PC-506 · Super Wipeout" : "PC-508 · Fundamental";
  const chipName = id === "ay38606" ? "AY-3-8606-1" : "AY-3-8500";
  document.title = `${chipName} — Circuit workbench`;
  app.className = "circuit-workbench";
  app.innerHTML = `<header><a href="/?engine=compiled">← Console</a><nav aria-label="Cartridge"><a href="?lab=ay38606">Super Wipeout</a><a href="?lab=ay38500">Fundamental</a></nav></header>
  <main><section class="workbench-die"><canvas width="1000" height="1000" aria-label="Live transistor circuit layout"></canvas></section>
  <section class="workbench-controls"><p>${title}</p><h1>${chipName}</h1><p>Transistor reference</p><p class="workbench-note">${id === "ay38606" ? 'Pin-level workbench. <a href="/?cartridge=wipeout">Play Super Wipeout</a>' : "Pin-level model. Console controls and video are not wired yet."}</p>
  <div class="workbench-buttons"><button data-action="run" disabled>Run chip</button><button data-action="edge" disabled>½ clock</button><button data-action="clock" disabled>1 clock</button><button data-action="reset" disabled>Reset circuit</button></div>
  <label>Signal<select aria-label="Signal"></select></label><output class="workbench-value" aria-live="off"></output><output class="workbench-time" aria-live="off"></output><p class="workbench-status" role="status">Loading circuit…</p>
  <footer>Cole Johnson / Sean Riddle · <a href="https://github.com/HelgeSverre/hanimex/tree/main/research/${id}" target="_blank" rel="noopener">Source and data notices</a></footer></section></main>`;
  app
    .querySelector<HTMLAnchorElement>(`a[href="?lab=${id}"]`)!
    .setAttribute("aria-current", "page");
  const status = app.querySelector<HTMLElement>(".workbench-status")!;
  const canvas = app.querySelector("canvas")!;
  const context = canvas.getContext("2d");
  if (!context) {
    status.textContent = "Canvas unavailable";
    return;
  }
  let worker: Worker | undefined;
  try {
    const url =
      id === "ay38606"
        ? new URL("./recovered/ay38606.json", import.meta.url)
        : new URL("./recovered/ay38500.json", import.meta.url);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not load chip layout");
    const layout: Layout = await response.json();
    let extentX = 0,
      extentY = 0;
    const segments = layout.segments.map(([node, layer, ...points]) => {
      const path = new Path2D();
      for (let i = 0; i < points.length; i += 2) {
        if (i === 0) path.moveTo(points[i], points[i + 1]);
        else path.lineTo(points[i], points[i + 1]);
        extentX = Math.max(extentX, points[i]);
        extentY = Math.max(extentY, points[i + 1]);
      }
      path.closePath();
      return { node, layer, path };
    });
    const scale = 980 / Math.max(extentX, extentY);
    const select = app.querySelector("select")!;
    for (const [name, node] of Object.entries(layout.names))
      select.add(new Option(name, String(node)));
    let selected = layout.names.clk;
    select.value = String(selected);
    let nodes: Uint8Array | undefined;
    const draw = () => {
      context.resetTransform();
      context.fillStyle = "#0c1819";
      context.fillRect(0, 0, 1000, 1000);
      context.translate(10, 990);
      context.scale(scale, -scale);
      for (const s of segments) {
        context.fillStyle = nodes?.[s.node]
          ? ["#e7c97e", "#e5ede1", "#74cbbd", "#e79763"][s.layer % 4]
          : ["#273d3b", "#354949", "#203331", "#304142"][s.layer % 4];
        context.fill(s.path);
      }
      context.strokeStyle = "#ff7841";
      context.lineWidth = 2 / scale;
      for (const s of segments) if (s.node === selected) context.stroke(s.path);
      const label =
        Object.entries(layout.names).find(
          ([, node]) => node === selected,
        )?.[0] ?? "unnamed";
      app.querySelector(".workbench-value")!.textContent =
        `${label} · node ${selected} · ${nodes ? (nodes[selected] ? "HIGH" : "LOW") : "—"}`;
    };
    select.onchange = () => {
      selected = Number(select.value);
      draw();
    };
    canvas.onclick = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x =
        ((1000 * (event.clientX - rect.left)) / rect.width - 10) / scale;
      const y =
        (990 - (1000 * (event.clientY - rect.top)) / rect.height) / scale;
      context.save();
      context.resetTransform();
      const hit = segments.find((s) => context.isPointInPath(s.path, x, y));
      context.restore();
      if (hit) {
        selected = hit.node;
        select.value = String(selected);
        draw();
      }
    };
    worker = new Worker(new URL("./workbench-worker.ts", import.meta.url), {
      type: "module",
    });
    let running = false;
    const run = app.querySelector<HTMLButtonElement>('[data-action="run"]')!;
    worker.onmessage = ({ data }) => {
      if (data.kind === "error") {
        status.textContent = data.message;
        for (const b of app.querySelectorAll("button")) b.disabled = true;
        return;
      }
      nodes = data.nodes;
      running = data.running;
      run.textContent = running ? "Pause chip" : "Run chip";
      for (const b of app.querySelectorAll<HTMLButtonElement>("button"))
        b.disabled =
          running &&
          (b.dataset.action === "edge" || b.dataset.action === "clock");
      app.querySelector(".workbench-time")!.textContent =
        `${(data.edges / 2).toLocaleString()} clocks`;
      const summary = `${layout.nodeCount.toLocaleString()} nodes · ${layout.transistorCount.toLocaleString()} transistor entries`;
      if (status.textContent !== summary) status.textContent = summary;
      draw();
    };
    worker.onerror = () => {
      status.textContent = "Circuit worker failed";
      for (const b of app.querySelectorAll("button")) b.disabled = true;
    };
    run.onclick = () => worker!.postMessage({ kind: "run", running: !running });
    for (const [action, edges] of [
      ["edge", 1],
      ["clock", 2],
    ] as const)
      app.querySelector<HTMLButtonElement>(
        `[data-action="${action}"]`,
      )!.onclick = () => worker!.postMessage({ kind: "step", edges });
    app.querySelector<HTMLButtonElement>('[data-action="reset"]')!.onclick =
      () => worker!.postMessage({ kind: "reset" });
    worker.postMessage({ kind: "init", id, reset: layout.names.reset });
    window.addEventListener("pagehide", (event) => {
      if (!event.persisted) worker?.terminate();
    });
    draw();
  } catch (error) {
    worker?.terminate();
    status.textContent =
      error instanceof Error ? error.message : "Could not load circuit";
  }
}
