import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const files=[];
function walk(dir){ for(const name of readdirSync(dir)){ const p=join(dir,name); const s=statSync(p); if(s.isDirectory()) walk(p); else if(p.endsWith('.js')) files.push(p); } }
walk('src');
let failed=false;
for(const f of files){ const r=spawnSync(process.execPath,['--check',f],{stdio:'inherit'}); if(r.status!==0) failed=true; }
process.exit(failed?1:0);
