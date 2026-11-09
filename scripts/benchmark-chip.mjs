import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const files=['ay38605-reference.wasm','ay38605.wasm'];
const binaries=files.map(file=>readFileSync(`web/src/chip/${file}`));
const modules=await Promise.all(binaries.map(bytes=>WebAssembly.compile(bytes)));
const samples=[[],[]];
for(let round=0;round<4;round++){
  for(const which of round%2 ? [1,0] : [0,1]){
    const e=(await WebAssembly.instantiate(modules[which])).exports;
    if(e.chip_init()||e.chip_run(10000))throw new Error('chip warmup failed');
    const start=performance.now();if(e.chip_run(100000))throw new Error('chip benchmark failed');
    samples[which].push(100000/((performance.now()-start)/1000));
  }
}
const median=a=>{const s=[...a].sort((a,b)=>a-b);return(s[1]+s[2])/2;};
const rates=samples.map(median);
console.log(JSON.stringify({node:process.version,arch:process.arch,nominalClockHz:3579545,engines:files.map((file,i)=>({file,sha256:createHash('sha256').update(binaries[i]).digest('hex'),samplesClocksPerSecond:samples[i],medianClocksPerSecond:rates[i],hardwareSpeedPercent:rates[i]/3579545*100})),speedup:rates[1]/rates[0]},null,2));
