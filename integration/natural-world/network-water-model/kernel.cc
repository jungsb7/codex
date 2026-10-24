// Optional N-API acceleration of kernel.cjs; no fast-math, same state/flux equations.
#include <node_api.h>
#include <algorithm>
#include <cmath>
static napi_value step(napi_env env,napi_callback_info info){
 size_t argc=14; napi_value argv[14];napi_get_cb_info(env,info,&argc,argv,nullptr,nullptr);
 if(argc!=14){napi_throw_type_error(env,nullptr,"Expected fourteen Float64Array arguments");return nullptr;}
 double* a[14];size_t lengths[14];
 for(int i=0;i<14;i++){napi_typedarray_type type;void* data; napi_value buffer;size_t offset;if(napi_get_typedarray_info(env,argv[i],&type,&lengths[i],&data,&buffer,&offset)!=napi_ok||type!=napi_float64_array){napi_throw_type_error(env,nullptr,"Expected Float64Array");return nullptr;}a[i]=static_cast<double*>(data);}
 size_t count=lengths[3];
 for(int i=0;i<11;i++)if(lengths[i]!=(i<3?count*12:count)){napi_throw_range_error(env,nullptr,"Array length mismatch");return nullptr;}
 if(lengths[12]!=8||lengths[13]!=7){napi_throw_range_error(env,nullptr,"Parameter length mismatch");return nullptr;}
 for(size_t j=0;j<count;j++)if(!std::isfinite(a[10][j])||a[10][j]<0||a[10][j]>=lengths[11]||std::floor(a[10][j])!=a[10][j]){napi_throw_range_error(env,nullptr,"Invalid delivery index");return nullptr;}
 double *p=a[0],*t=a[1],*pet=a[2],*snow=a[3],*soil=a[4],*ground=a[5],*travel=a[6],*area=a[7],*wet=a[8],*north=a[9],*delivery=a[10],*inflows=a[11],*flux=a[12],*params=a[13];
 const double n=params[1],soilCap=params[2],aquiferCap=params[3],infRate=params[4],soilYears=params[5],groundYears=params[6];
 if(!std::isfinite(params[0])||params[0]<0||params[0]>11||std::floor(params[0])!=params[0]||!std::isfinite(n)||n<1||!std::isfinite(soilYears)||soilYears<=0||!std::isfinite(groundYears)||groundYears<=0){napi_throw_range_error(env,nullptr,"Invalid phase/rate");return nullptr;}
 const size_t phase=static_cast<size_t>(params[0]);
 const double dt=1/(12*n),gr=-std::expm1(-dt/groundYears),sr=-std::expm1(-dt/soilYears),nr=-std::expm1(-.08/n),ng=-std::expm1(-1/(6*n*(groundYears/2))),nt=-std::expm1(-1/(1.5*n));
 for(size_t j=0;j<count;j++){
  const size_t k=j*12+phase;const double precip=p[k]/n,temp=t[k],af=area[j]/1000.0;double s=snow[j],so=soil[j],g=ground[j],tr=travel[j],liquid,ev=0.0,inf=0.0,recharge=0.0,ret=0.0,runoff=0.0,direct=0.0,sub=0.0,delivered=0.0;
  if(north[j]){
   const double fraction=std::max(0.0,std::min(1.0,(1.0-temp)/2.0));s+=precip*fraction;liquid=precip*(1.0-fraction);sub=std::min(s,(3.0+pet[k]*.05)/n);s-=sub;const double melt=std::min(s,std::max(0.0,temp)*3.0*(365.0/12.0)/n);s-=melt;liquid+=melt;
   double fast=0.0;if(wet[j])direct=liquid;else{inf=liquid*std::min(1.0,.8*infRate/1200.0);fast=liquid-inf;so+=inf;const double excess=std::max(0.0,so-150.0);so-=excess;fast+=excess;inf-=excess;ev=std::min(so,pet[k]/n);so-=ev;}
   recharge=so*nr;so-=recharge;g+=recharge;ret=g*ng;g-=ret;tr+=fast+ret;runoff=tr*nt;tr-=runoff;delivered=runoff+direct;
  }else{
   liquid=temp<0.0?0.0:precip;if(temp<0.0)s+=precip;const double melt=std::min(s,std::max(0.0,temp)*540.0*dt);s-=melt;liquid+=melt;
   ret=g*gr;g-=ret;recharge=std::min(so*sr,aquiferCap-g);so-=recharge;g+=recharge;
   if(wet[j])direct=liquid;else{const double demand=std::max(temp+5.0,0.0)*24.0*dt,immediate=std::min(liquid,demand);liquid-=immediate;const double fromSoil=std::min(so,demand-immediate);so-=fromSoil;ev=immediate+fromSoil;inf=std::min({liquid,infRate*dt,soilCap-so});so+=inf;runoff=liquid-inf;}
   delivered=runoff+direct+ret;
  }
  snow[j]=s;soil[j]=so;ground[j]=g;travel[j]=tr;inflows[static_cast<size_t>(delivery[j])]+=delivered*af;
  flux[0]+=precip*af;flux[1]+=(ev+sub)*af;flux[2]+=inf*af;flux[3]+=recharge*af;flux[4]+=ret*af;flux[5]+=runoff*af;flux[6]+=direct*af;flux[7]+=sub*af;
 }
 napi_value result;napi_get_undefined(env,&result);return result;
}
static napi_value init(napi_env env,napi_value exports){napi_value fn;napi_create_function(env,"step",4,step,nullptr,&fn);napi_set_named_property(env,exports,"step",fn);return exports;}
NAPI_MODULE(NODE_GYP_MODULE_NAME,init)
