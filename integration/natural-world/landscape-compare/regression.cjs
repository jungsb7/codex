'use strict';
// Run the previous browser cases unchanged, redirecting their artifacts to this step.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const target={notes:'landscape-notes',seasonal:'seasonal-loading'}[process.argv[2]];
if(!target)throw Error('Usage: node regression.cjs notes|seasonal');
const file=path.resolve(__dirname,'..',target,'browser-check.cjs'),out=path.join(__dirname,'validation',target),source=fs.readFileSync(file,'utf8'),needle="out=path.join(__dirname,'validation')";
assert(source.includes(needle),'Previous script changed: inspect its artifact destination before rerunning.');
fs.mkdirSync(out,{recursive:true});
const runner=new Module(file,module);runner.filename=file;runner.paths=Module._nodeModulePaths(path.dirname(file));
process.on('exit',()=>{for(const name of fs.readdirSync(out))if(name.endsWith('.png'))fs.unlinkSync(path.join(out,name));});
runner._compile(source.replace(needle,'out='+JSON.stringify(out)),file);
