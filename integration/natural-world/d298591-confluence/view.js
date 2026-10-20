(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.ConfluenceView=factory(root.ConfluenceCandidate);})(globalThis,function(H){
'use strict';
function validate(d){
 if(d?.schema!=='d298591-confluence-catalog/1'||!Array.isArray(d.presets)||d.presets.length!==10||!d.presets.every(p=>typeof p.id==='string'&&!H.validate(p.input).length)||d.sourceLedger?.schema!=='source-increment-audit/1'||d.sourceLedger.periods?.length!==12||d.automaticAdoption!==false||d.unresolvedReaches!==23022)throw Error('자료 형식이 맞지 않습니다.');
 return d;
}
function result(d,input,options){return {schema:'d298591-confluence-selection/1',provenance:d.provenance,context:d.context,candidate:H.solve(input,options),actual:H.solve(null).actual,automaticAdoption:false,physicalResolvedReaches:0,unresolvedReaches:23022};}
return {validate,result};
});
