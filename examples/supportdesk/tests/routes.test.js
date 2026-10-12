'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {buildApp} = require('../src/app');
let server, base, shutdown, folder;
async function call(route, options={}) {
  return fetch(base+route,{redirect:'manual',...options});
}
function form(values){return new URLSearchParams(values).toString();}
async function login(email,password){
  const response=await call('/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:form({email,password})});
  return {response,cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function token(cookie, route='/tickets'){
  const response=await call(route,{headers:{Cookie:cookie}});
  assert.equal(response.status,200);
  const html=await response.text();
  const match=html.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(match,'CSRF token must be in HTML');
  return match[1];
}
test.before(async()=>{
  folder=fs.mkdtempSync(path.join(os.tmpdir(),'ojs-sentinel-x-'));
  const created=await buildApp({databasePath:path.join(folder,'test.db'),logFile:path.join(folder,'events.jsonl'),
    sessionSecret:'test-only-secret-at-least-32-characters-long'});
  shutdown=created.shutdown;
  server=created.app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  base='http://127.0.0.1:'+server.address().port;
});
test.after(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve));
  if(shutdown)await shutdown();
  if(folder)fs.rmSync(folder,{force:true,recursive:true});
});
test('health and authentication are functional',async()=>{
  const health=await call('/health');assert.equal(health.status,200);assert.equal((await health.json()).status,'ok');
  const bad=await login('admin@supportdesk.local','wrongpassword');assert.equal(bad.response.status,401);
  const good=await login('admin@supportdesk.local','Admin_123');assert.equal(good.response.status,302);
  const dashboard=await call('/dashboard',{headers:{Cookie:good.cookie}});
  assert.equal(dashboard.status,200);assert.match(await dashboard.text(),/Recent tickets/);
});
test('Prometheus exposition format and auth metrics',async()=>{
  const response=await call('/metrics');assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/plain/);
  const output=await response.text();
  assert.match(output,/# TYPE supportdesk_http_duration_seconds histogram/);
  assert.match(output,/supportdesk_auth_failure_total [1-9]/);
  assert.match(output,/supportdesk_http_duration_seconds_bucket\{le="\+Inf"\}/);
});
test('ordinary user denied foreign ticket export',async()=>{
  const user=await login('jdupont@supportdesk.local','User_1234');assert.equal(user.response.status,302);
  const foreign=await call('/tickets/2/export',{headers:{Cookie:user.cookie}});
  assert.equal(foreign.status,403);
  const own=await call('/tickets/1/export',{headers:{Cookie:user.cookie}});
  assert.equal(own.status,200);assert.match(await own.text(),/TICKET #1/);
});
test('path traversal is refused and a security event is emitted',async()=>{
  const user=await login('jdupont@supportdesk.local','User_1234');
  const invalid=await call('/kb/view?doc=..%2F..%2Fetc%2Fpasswd',{headers:{Cookie:user.cookie}});
  assert.equal(invalid.status,404);
  const valid=await call('/kb/view?doc=vpn-guide.html',{headers:{Cookie:user.cookie}});
  assert.equal(valid.status,200);
  assert.match(await valid.text(),/VPN Guide/);
});
test('SQL injection attempt is logged but not executed; CSRF enforced',async()=>{
  const user=await login('jdupont@supportdesk.local','User_1234');
  const missing=await call('/tickets/search',{method:'POST',
    headers:{Cookie:user.cookie,'Content-Type':'application/x-www-form-urlencoded'},body:form({search:'VPN'})});
  assert.equal(missing.status,403);
  const csrf=await token(user.cookie);
  const attempt=await call('/tickets/search',{method:'POST',
    headers:{Cookie:user.cookie,'Content-Type':'application/x-www-form-urlencoded'},
    body:form({_csrf:csrf,search:"' OR 1=1 --"})});
  assert.equal(attempt.status,200);
  const html=await attempt.text();
  assert.match(html,/No matching tickets/);
  const log=fs.readFileSync(path.join(folder,'events.jsonl'),'utf8');
  assert.match(log,/"event_type":"suspicious_sql_input"/);
  assert.doesNotMatch(log,/"body":"['"]?password/);
});
test('comment HTML is escaped in EJS output',async()=>{
  const user=await login('jdupont@supportdesk.local','User_1234');
  const csrf=await token(user.cookie,'/tickets/1');
  const response=await call('/tickets/1/comment',{method:'POST',headers:{Cookie:user.cookie,
    'Content-Type':'application/x-www-form-urlencoded'},body:form({_csrf:csrf,content:'<script>alert(1)</script>'})});
  assert.equal(response.status,302);
  const detail=await call('/tickets/1',{headers:{Cookie:user.cookie}});
  const html=await detail.text();
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.match(html,/&lt;script&gt;/);
});
test('admin SSRF endpoint is blocked, profile updates remain functional',async()=>{
  const admin=await login('admin@supportdesk.local','Admin_123');
  const csrf=await token(admin.cookie,'/admin');
  const response=await call('/admin/fetch',{method:'POST',headers:{Cookie:admin.cookie,
    'Content-Type':'application/x-www-form-urlencoded'},body:form({_csrf:csrf,url:'http://127.0.0.1:1'})});
  assert.equal(response.status,403);
  const profile=await call('/profile',{headers:{Cookie:admin.cookie}});
  assert.equal(profile.status,200);
  const update=await call('/profile',{method:'POST',headers:{Cookie:admin.cookie,
    'Content-Type':'application/x-www-form-urlencoded'},body:form({_csrf:csrf,display_name:'Security Team',theme:'dark'})});
  assert.equal(update.status,302);
  const log=fs.readFileSync(path.join(folder,'events.jsonl'),'utf8');
  for(const type of ['auth_failure','auth_success','access_denied','blocked_path_traversal','blocked_ssrf'])
    assert.ok(log.includes('"event_type":"'+type+'"'),type+' missing');
});
