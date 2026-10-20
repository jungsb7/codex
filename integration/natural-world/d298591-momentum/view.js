(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.MomentumView=factory(root.MomentumCandidate);})(globalThis,function(M){
'use strict';
function validate(d){if(d?.schema!=='d298591-momentum-catalog/1'||d.presets?.length!==13||!d.presets.every(p=>typeof p.id==='string'&&!M.validate(p.input).length)||d.automaticAdoption!==false||d.unresolvedReaches!==23022)throw Error('자료 형식이 맞지 않습니다.');return d;}
function result(d,input){return {schema:'d298591-momentum-selection/1',provenance:d.provenance,context:d.context,candidate:M.solve(input),automaticAdoption:false,physicalResolvedReaches:0,unresolvedReaches:23022};}
return {validate,result};
});
