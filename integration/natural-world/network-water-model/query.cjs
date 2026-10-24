'use strict';
const fs=require('node:fs'),z=require('node:zlib'),crypto=require('node:crypto'),V=require('./view.js');
function read(){const m=require('./output/manifest.json').review,b=fs.readFileSync(__dirname+'/output/'+m.file);if(b.length!==m.bytes||crypto.createHash('sha256').update(b).digest('hex')!==m.sha256)throw Error('Review integrity failure');return V.validate(JSON.parse(z.gunzipSync(b)));}
if(require.main===module){try{console.log(JSON.stringify(V.query(read(),process.argv[2]||'reference',process.argv[3]||'D186192'),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={read,query:V.query};
