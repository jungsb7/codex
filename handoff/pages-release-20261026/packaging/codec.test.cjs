'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),K=require('./codec.js');
const field=values=>{const b=Buffer.alloc(values.length*8);values.forEach((v,i)=>b.writeDoubleLE(v,i*8));return{type:'f64',data:b.toString('base64')};};
test('legacy decoder preserves signed zero, subnormals and extreme finite numbers',()=>{
 const a=[-0,0,Number.MIN_VALUE,-Number.MIN_VALUE,Number.MAX_VALUE,-Number.MAX_VALUE,Math.PI];const d=K.decode(field(a),a.length);a.forEach((v,i)=>assert(Object.is(v,d[i])));
});
test('reject malformed payload dimensions, encodings and nonfinite values',()=>{
 assert.throws(()=>K.decode(field([1]),2));assert.throws(()=>K.decode(field([1]),-1));assert.throws(()=>K.decode(field([Infinity]),1));
 assert.throws(()=>K.raw({...field([1]),type:'unknown',count:1},1));
 assert.throws(()=>K.raw({...field([1]),type:'f64-xor-byte-planes',count:1,stride:0},1));
});
test('sampled bases cannot reference missing, cyclic or incompatible fields',()=>{
 const f={...field([0]),type:'f64-xor-sampled-base-planes',count:1,base:'a',baseStride:1,baseOffset:0};
 assert.throws(()=>K.raw(f,1,{}),/Missing/);assert.throws(()=>K.raw(f,1,{a:f}),/Cyclic/);
 assert.throws(()=>K.raw({...f,baseStride:2},1,{a:field([1])}),/dimensions/);
});
