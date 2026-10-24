'use strict';
const fs=require('node:fs'),z=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict'),previous=require('../coupled-water-model/source.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function additional(){const manifest=require('./inputs/manifest.json'),parts=manifest.parts.map(p=>{assert(/^forcing-\d\d\.bin$/.test(p.file));const b=fs.readFileSync(__dirname+'/inputs/'+p.file);assert.equal(b.length,p.bytes);assert.equal(hash(b),p.sha256);return b;}),b=Buffer.concat(parts);assert.equal(hash(b),manifest.sha256);return previous.unpack(JSON.parse(z.gunzipSync(b)));}
function read(){const a=previous.unpack(previous.read()),b=additional();assert(b.cells.every(c=>!a.index.has(c)));return {parts:[a,b],lookup:new Map([...a.cells.map((c,i)=>[c,[0,i]]),...b.cells.map((c,i)=>[c,[1,i]])])};}
module.exports={read};
