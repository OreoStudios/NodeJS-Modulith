#!/usr/bin/env node
'use strict';
// Deterministic, authenticated BENIGN traffic for false-positive measurements.
// For local educational Docker SupportDesk only. Does not mutate tickets.
const root=(process.env.TARGET_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const seconds=Math.max(1,Math.min(3600,Number(process.env.DURATION_SECONDS||60)));
const perSecond=Math.max(1,Math.min(20,Number(process.env.REQUESTS_PER_SECOND||3)));
const email=process.env.DEMO_EMAIL||'jdupont@supportdesk.local';
const password=process.env.DEMO_PASSWORD||'User_1234';
const tasks=[
  {path:'/dashboard'},
  {path:'/tickets'},
  {path:'/tickets/1'},
  {path:'/profile'},
  {path:'/kb'},
  {path:'/kb/view?doc=vpn-guide.html'},
  {path:'/tickets?status=open'},
  {path:'/tickets/search',method:'POST',search:'VPN'},
  {path:'/health'}
];
function cookieOf(response){
  return response.headers.get('set-cookie')?.split(';')[0]||null;
}
function csrfOf(html){
  return html.match(/name="_csrf" value="([^"]+)"/)?.[1]||null;
}
async function initialize(){
  const page=await fetch(root+'/login',{redirect:'manual'});
  if(!page.ok) throw Error('Login page unavailable: '+page.status);
  const csrf=csrfOf(await page.text()), firstCookie=cookieOf(page);
  if(!csrf||!firstCookie) throw Error('Login CSRF token or session cookie missing');
  const request=new URLSearchParams({_csrf:csrf,email,password});
  const login=await fetch(root+'/login',{method:'POST',redirect:'manual',
    headers:{Cookie:firstCookie,'Content-Type':'application/x-www-form-urlencoded'},
    body:request});
  if(login.status!==302) throw Error('Demo user authentication failed: '+login.status);
  const cookie=cookieOf(login)||firstCookie;
  const tickets=await fetch(root+'/tickets',{headers:{Cookie:cookie}});
  if(!tickets.ok) throw Error('Authenticated ticket list unavailable: '+tickets.status);
  const token=csrfOf(await tickets.text());
  if(!token) throw Error('Authenticated CSRF token missing');
  return {cookie,csrf:token};
}
async function traffic(){
  const auth=await initialize();
  const started=Date.now();
  const counts={},errors=[],responseDurations=[];
  let sent=0,cycle=0;
  while(Date.now()-started<seconds*1000){
    const calls=[];
    for(let i=0;i<perSecond;i++){
      const task=tasks[cycle++%tasks.length];
      calls.push((async()=>{
        const begin=performance.now();
        const body=task.method==='POST'
          ?new URLSearchParams({_csrf:auth.csrf,search:task.search}):undefined;
        try{
          const r=await fetch(root+task.path,{
            method:task.method||'GET',redirect:'manual',
            headers:{Cookie:auth.cookie,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},
            body,signal:AbortSignal.timeout(5000)
          });
          sent++;counts[r.status]=(counts[r.status]||0)+1;
          if(r.status!==200) errors.push({path:task.path,status:r.status});
          await r.arrayBuffer();
        }catch(error){sent++;errors.push({path:task.path,error:error.message});}
        responseDurations.push(performance.now()-begin);
      })());
    }
    await Promise.all(calls);
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  responseDurations.sort((a,b)=>a-b);
  const percentile=p=>responseDurations[Math.max(0,Math.ceil(responseDurations.length*p)-1)]||0;
  const output={
    kind:'normal_authenticated_traffic',target:root,
    duration_seconds:Math.round((Date.now()-started)/1000),
    expected_seconds:seconds,requests:sent,
    configured_requests_per_second:perSecond,actual_requests_per_second:
      Number((sent/((Date.now()-started)/1000)).toFixed(2)),
    response_statuses:counts,unexpected_responses:errors.length,
    sample_errors:errors.slice(0,5),latency_p95_ms:Number(percentile(.95).toFixed(2)),
    latency_p99_ms:Number(percentile(.99).toFixed(2))
  };
  console.log(JSON.stringify(output,null,2));
  if(errors.length)process.exitCode=1;
}
traffic().catch(error=>{console.error(error.message);process.exitCode=1;});
