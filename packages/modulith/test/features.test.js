'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const {Modulith,EventBus,Container}=require('../src');
test('module context event bus and graph', async()=>{
 const m=new Modulith();let seen=0;
 m.register({name:'auth',factory:(_deps,ctx)=>({start(){ctx.events.subscribe('user.created',()=>{seen++})}})});
 await m.start(); await m.events.publish('user.created',{id:1}); assert.equal(seen,1);
 assert.match(m.graph(),/auth/); await m.stop();assert.equal(await m.events.publish('user.created',{}),0);
});
test('event subscribers errors propagate after all run',async()=>{
 const bus=new EventBus();let succeeded=false;
 bus.subscribe('event',()=>{throw Error('bad')});bus.subscribe('event',()=>{succeeded=true});
 await assert.rejects(bus.publish('event',{}),AggregateError);assert.equal(succeeded,true);
});
test('injection container detects provider cycles',()=>{
 const c=new Container();c.provide('a',({resolve})=>resolve('b')).provide('b',({resolve})=>resolve('a'));
 assert.throws(()=>c.resolve('a'),/cycle/);
});
test('failed stop still stops all modules',async()=>{
 const m=new Modulith(),order=[];
 m.register({name:'a',factory:()=>({stop(){order.push('a')}})});
 m.register({name:'b',dependencies:['a'],factory:()=>({stop(){order.push('b');throw Error('oops')}})});
 await m.start();await assert.rejects(m.stop(),AggregateError);assert.deepEqual(order,['b','a']);
});
