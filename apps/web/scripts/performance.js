import { performance } from 'node:perf_hooks';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const times=[];for(let n=0;n<31;n++){const start=performance.now();const r=await fetch('http://localhost:3000');await r.text();if(n)times.push(performance.now()-start);}times.sort((a,b)=>a-b);
const files={};for(const name of ['public/styles.css','public/app.js','public/ad-controller.js','public/ad-config.js']){const b=await readFile(name);files[name]={bytes:b.length,gzipBytes:gzipSync(b).length};}
const report={scope:'Local loopback requests, warm server; not a production latency guarantee',samples:30,medianMs:Number(times[15].toFixed(2)),p95Ms:Number(times[28].toFixed(2)),files};await writeFile('../../docs/performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
