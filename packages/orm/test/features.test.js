'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {scopeRepository}=require('../src/policy');
test('scope cannot be overridden or edited',()=>{
 const calls=[], r={get:f=>{calls.push(f);return f},list:f=>f,create:x=>x,update:(f,c)=>[f,c],delete:f=>f};
 const scoped=scopeRepository(r,{owner_id:3});
 assert.deepEqual(scoped.get({id:2}),{id:2,owner_id:3});
 assert.throws(()=>scoped.get({owner_id:4}),/override/);
 assert.throws(()=>scoped.update({id:1},{owner_id:4}),/cannot be updated/);
 assert.deepEqual(scoped.create({id:5}),{id:5,owner_id:3});
});
