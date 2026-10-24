'use strict';
// Optional acceleration. Supply official Node headers matching the local runtime.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const include=process.argv[2],output=path.resolve(process.argv[3]||'/tmp/network-water-kernel.node');
if(!include||!fs.existsSync(path.join(include,'node_api.h')))throw Error('Usage: node compile-native.cjs /path/to/include/node [/tmp/kernel.node]');
execFileSync('g++',['-O3','-shared','-fPIC','-ffp-contract=off','-I'+path.resolve(include),__dirname+'/kernel.cc','-o',output],{stdio:'inherit'});console.log('WATER_NATIVE='+output);
