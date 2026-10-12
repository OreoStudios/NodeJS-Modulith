'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Modulith } = require('../src');
test('dependency order and named exports', async () => {
 const m = new Modulith().register({name:'api',dependencies:['db'],factory:({db})=>({connected:db.ready})})
 .register({name:'db',factory:()=>({ready:true})});
 assert.deepEqual(m.order(),['db','api']); await m.start(); assert.equal(m.get('api').connected,true); await m.stop();
});
test('reject circular graph', () => assert.throws(() => new Modulith()
.register({name:'a',dependencies:['b'],factory:()=>({})})
.register({name:'b',dependencies:['a'],factory:()=>({})}).order(),/Circular/));
test('reject undeclared dependency', () => assert.throws(() => new Modulith().register({name:'a',dependencies:['none'],factory:()=>({})}).order(),/Missing/));
