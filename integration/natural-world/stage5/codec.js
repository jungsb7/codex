(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NaturalMapCodec=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const littleEndian=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
 function decode(text,n,type='u8'){
  let bytes;if(typeof Uint8Array.fromBase64==='function')bytes=Uint8Array.fromBase64(text);else if(typeof Buffer!=='undefined'){const b=Buffer.from(text,'base64');bytes=new Uint8Array(b.buffer,b.byteOffset,b.byteLength);}else{const raw=atob(text);bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);}
  if(bytes.length!==n*(type==='u8'?1:4))throw Error('격자 데이터 크기가 맞지 않습니다.');if(type==='u8')return bytes;
  const Type=type==='f32'?Float32Array:Int32Array;if(littleEndian&&bytes.byteOffset%4===0)return new Type(bytes.buffer,bytes.byteOffset,n);
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),values=new Type(n);for(let i=0;i<n;i++)values[i]=type==='f32'?view.getFloat32(i*4,true):view.getInt32(i*4,true);return values;
 }
 // Reuse the original sampler and metadata; populate its captured arrays once.
 function create(C,data){const model=C.create({...data,fields:{}});model.data=data;for(const[k,v]of Object.entries(data.fields))model.a[k]=decode(v.data,model.n,v.type);return model;}
 return {decode,create};
});
