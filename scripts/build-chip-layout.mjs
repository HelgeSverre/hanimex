import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({});
vm.runInContext(readFileSync('research/ay38605/segdefs.js','utf8'),c);
writeFileSync('web/src/chip/layout.json',JSON.stringify(c.segdefs.map(s=>[s[0],s[2],...s.slice(3)]))+'\n');
