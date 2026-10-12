'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {OjsORM,model}=require('../src');
function fakeDB() {
 const statements=[];
 const db={prepare(sql){const stmt={sql,get(...values){statements.push({sql,values});return {id:1}},all(...values){statements.push({sql,values});return []},run(...values){statements.push({sql,values});return {changes:1}}};return stmt;},transaction(fn){return fn;}};
 return {db,statements};
}
test('parameterize attacker-controlled values',()=>{
 const {db,statements}=fakeDB(), users=new OjsORM(db).repository(model('users',['id','email']));
 const malicious="' OR 1=1 --";
 users.get({email:malicious});
 assert.match(statements[0].sql,/email" = \?/);
 assert.equal(statements[0].values[0],malicious);
 assert.ok(!statements[0].sql.includes(malicious));
});
test('reject injected names and unknown sort columns',()=>{
 assert.throws(()=>model('users; DROP TABLE users',['id']),/Unsafe/);
 const {db}=fakeDB(), repo=new OjsORM(db).repository(model('users',['id','email']));
 assert.throws(()=>repo.list({}, {orderBy:'email DESC; DROP TABLE users'}),/Field not in model/);
});
test('require a filter on update and delete',()=>{
 const {db}=fakeDB(), repo=new OjsORM(db).repository(model('users',['id','email']));
 assert.throws(()=>repo.update({}, {email:'x'}),/Non-empty/);
 assert.throws(()=>repo.delete({}),/Non-empty/);
});
test('bound limit and safe sort direction',()=>{
 const {db,statements}=fakeDB(), repo=new OjsORM(db).repository(model('users',['id','email']));
 repo.list({}, {orderBy:'email',desc:true,limit:5});
 assert.match(statements[0].sql,/ORDER BY "email" DESC LIMIT \?/);
 assert.equal(statements[0].values[0],5);
 assert.throws(()=>repo.list({}, {limit:Infinity}),/Limit/);
});
