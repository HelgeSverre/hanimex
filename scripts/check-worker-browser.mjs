// Browser/Vite integration check of the real worker, including both engines.
export async function checkWorkers() {
  const results = [];
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  for (const chipId of ["ay38605", "ay38606"])
    for (const engine of ["compiled", "reference"]) {
      const worker = new Worker("/src/chip/worker.ts", {
        type: "module",
        name: `${chipId}:${engine}`,
      });
      const frames = [];
      let error;
      worker.onmessage = ({ data }) =>
        data.kind === "error" ? (error = data.message) : frames.push(data);
      worker.onerror = (event) => (error = event.message || "Worker failed");
      const wait = async (predicate) => {
        const deadline = performance.now() + 10000;
        while (!predicate()) {
          if (error) throw Error(error);
          if (performance.now() > deadline)
            throw Error("Worker response timed out");
          await delay(10);
        }
        if (error) throw Error(error);
      };
      const send = (message) => worker.postMessage(message);
      try {
        // These may arrive while fetch/instantiate is still pending.
        send({ kind: "run", running: true });
        send({ kind: "run", running: false });
        await wait(() => frames.length > 0);
        await delay(200);
        const stopped = frames.at(-1).clocks;
        await delay(150);
        check(frames.at(-1).clocks === stopped, "Startup pause did not hold");
        check(
          frames.at(-1).nodes.length === (chipId === "ay38605" ? 1524 : 1633),
          "Inspector node count",
        );
        for (let cycle = 0; cycle < 3; cycle++) {
          for (let i = 0; i < 8; i++) send({ kind: "run", running: true });
          const before = frames.at(-1).clocks;
          await wait(() => frames.at(-1).clocks > before);
          send({
            kind: "input",
            mode: cycle + 1,
            sub: 60 + cycle * 40,
            des: 180 - cycle * 40,
            buttons: cycle,
          });
          const pauseAt = performance.now();
          send({ kind: "run", running: false });
          await delay(200);
          const paused = frames.at(-1).clocks,
            count = frames.length;
          await delay(150);
          check(frames.length === count, "Paused worker kept publishing");
          const clockNode = chipId === "ay38605" ? 1365 : 95;
          const oldClock = frames.at(-1).nodes[clockNode];
          send({ kind: "step", clocks: 0.5 });
          await wait(() => frames.length > count);
          check(
            frames.at(-1).clocks === paused + 0.5,
            "Half-clock step was not exact",
          );
          check(
            frames.at(-1).nodes[clockNode] === 1 - oldClock,
            "Clock probe did not toggle",
          );
          check(
            performance.now() - pauseAt < 2000,
            "Input/pause handling stalled",
          );
        }
        check(!error, error);
        results.push({
          chipId,
          engine,
          startupPause: true,
          repeatedRun: true,
          pause: true,
          halfClockStep: true,
          inputChanges: true,
        });
      } finally {
        worker.terminate();
      }
    }
  return results;
}
