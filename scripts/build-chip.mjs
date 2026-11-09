import { execFileSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
execFileSync(process.execPath, ['scripts/build-netlist.mjs'], {stdio:'inherit'});
for (const args of [['fmt'], ['build','--release','--target','wasm32-unknown-unknown']]) {
  execFileSync('cargo',[...args,'--manifest-path','crates/ay38605/Cargo.toml'],{stdio:'inherit'});
}
copyFileSync('crates/ay38605/target/wasm32-unknown-unknown/release/ay38605.wasm','web/src/chip/ay38605.wasm');
