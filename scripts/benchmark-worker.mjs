// Run against Vite in a browser. Both cases use the real worker, including
// input dispatch, raster transfers and cooperative scheduling.
export async function benchmarkWorker({ rounds = 4, durationMs = 3000 } = {}) {
  const samples = [];
  for (const chipId of ["ay38605", "ay38606"]) {
    for (let round = 0; round < rounds; round++) {
      for (const version of round % 2
        ? ["message", "timer"]
        : ["timer", "message"]) {
        const file =
          version === "timer" ? "worker-timer-baseline.ts" : "worker.ts";
        const result = await new Promise((resolve, reject) => {
          const worker = new Worker(`/src/chip/${file}`, {
            type: "module",
            name: `${chipId}:compiled`,
          });
          let start;
          const timeout = setTimeout(() => {
            worker.terminate();
            reject(Error("Worker benchmark timed out"));
          }, 30000);
          const finish = (f) => {
            clearTimeout(timeout);
            worker.terminate();
            f();
          };
          worker.onerror = () => finish(() => reject(Error("Worker failed")));
          worker.onmessage = ({ data }) => {
            if (data.kind === "error")
              return finish(() => reject(Error(data.message)));
            if (data.clocks < 500000) return;
            const now = performance.now();
            start ??= { time: now, clocks: data.clocks };
            if (now - start.time >= durationMs)
              finish(() =>
                resolve({
                  chipId,
                  round,
                  version,
                  clocks: data.clocks - start.clocks,
                  milliseconds: now - start.time,
                  clocksPerSecond:
                    ((data.clocks - start.clocks) * 1000) / (now - start.time),
                }),
              );
          };
          worker.postMessage({
            kind: "input",
            mode: 1,
            sub: 200,
            des: 200,
            buttons: 0,
          });
          worker.postMessage({ kind: "run", running: true });
        });
        samples.push(result);
      }
    }
  }
  const summary = ["ay38605", "ay38606"].map((chipId) => {
    const median = (version) => {
      const a = samples
        .filter((s) => s.chipId === chipId && s.version === version)
        .map((s) => s.clocksPerSecond)
        .sort((a, b) => a - b);
      return (
        (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2
      );
    };
    const before = median("timer"),
      after = median("message");
    return {
      chipId,
      before,
      after,
      speedup: after / before,
      hardwareSpeedPercent: (after / 3579545) * 100,
    };
  });
  return {
    userAgent: navigator.userAgent,
    rounds,
    durationMs,
    samples,
    summary,
  };
}
