#!/usr/bin/env node
'use strict';
const root=process.env.TARGET_URL||'http://127.0.0.1:3000';
const seconds=Math.max(1,Math.min(3600,Number(process.env.DURATION_SECONDS||60)));
const perSecond=Math.max(1,Math.min(20,Number(process.env.REQUESTS_PER_SECOND||3)));
const paths=['/health','/login','/health','/kb','/dashboard','/tickets'];
let sent=0,fail=0;
async function traffic(){
  const started=Date.now(); let cycle=0;
  while(Date.now()-started<seconds*1000){
    const batch=[];
    for(let i=0;i<perSecond;i++){
      const p=paths[cycle++%paths.length];
      batch.push(fetch(root+p,{redirect:'manual'}).then(r=>{sent++;if(r.status>=500)fail++;}).catch(()=>{fail++;}));
    }
    await Promise.all(batch);
    await new Promise(r=>setTimeout(r,1000));
  }
  console.log(JSON.stringify({target:root,seconds,requests:sent,failures:fail,perSecond}));
}
traffic().catch(e=>{console.error(e);process.exitCode=1});
