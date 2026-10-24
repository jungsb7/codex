'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const include=process.argv[2],output=path.resolve(process.argv[3]||'/tmp/pond-network.node');if(!include||!fs.existsSync(path.join(include,'node_api.h')))throw Error('Usage: node compile.cjs /official/node/include/node [/tmp/pond-network.node]');execFileSync('g++',['-std=c++17','-O3','-shared','-fPIC','-ffp-contract=off','-I'+path.resolve(include),__dirname+'/native.cc','-o',output],{stdio:'inherit'});console.log(output);
