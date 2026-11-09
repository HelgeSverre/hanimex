import fs from "node:fs";
import assert from "node:assert/strict";
const modules = await Promise.all(
  ["-reference", ""].map((s) =>
    WebAssembly.compile(fs.readFileSync(`web/src/chip/ay38606${s}.wasm`)),
  ),
);
for (let mode = 1; mode <= 10; mode++) {
  const engines = await Promise.all(
    modules.map(async (m) => (await WebAssembly.instantiate(m)).exports),
  );
  for (const e of engines) {
    assert.equal(e.chip_init(), 0);
    assert.equal(e.chip_input(mode, 60, 180, 0), 0);
  }
  const compare = (label) => {
    for (const [fn, length] of [
      ["chip_nodes", 1633],
      ["chip_raster", 228 * 320],
    ])
      assert.ok(
        Buffer.from(engines[0].memory.buffer, engines[0][fn](), length).equals(
          Buffer.from(engines[1].memory.buffer, engines[1][fn](), length),
        ),
        `mode ${mode}: ${label}: ${fn}`,
      );
    assert.equal(engines[0].chip_fields(), engines[1].chip_fields());
  };
  compare("init");
  const fieldCount =
    process.argv.includes("--long") && [1, 9].includes(mode) ? 128 : 8;
  for (let at = 0; at < 228 * 262 * fieldCount; at += 2048) {
    if (at % 16384 === 0)
      for (const e of engines)
        assert.equal(
          e.chip_input(
            mode,
            40 + ((at / 16384) % 4) * 40,
            200 - ((at / 16384) % 4) * 40,
            at > 228 * 262 * 4 ? 3 | (((at / 16384) % 8) << 2) : 0,
          ),
          0,
        );
    for (const e of engines) assert.equal(e.chip_run(2048), 0);
    compare(at);
  }
  assert.ok(engines[0].chip_fields() >= 7);
  const raster = new Uint8Array(
    engines[0].memory.buffer,
    engines[0].chip_raster(),
    228 * 320,
  );
  assert.ok(
    raster.some((v) => (v & 15) !== 0),
    "video channels must be active",
  );
  fs.mkdirSync("work", { recursive: true });
  fs.writeFileSync(`work/wipeout-mode${mode}.bin`, raster);
  console.log(
    `Wipeout ${mode}: nodes, raster and ${engines[0].chip_fields()} fields match`,
  );
}
