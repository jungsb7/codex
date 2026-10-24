#include <node_api.h>
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <stdexcept>
#include <string>
#include <vector>
using std::vector;
static void need(bool x,const std::string& s){if(!x)throw std::runtime_error(s);}
static napi_value prop(napi_env e,napi_value o,const char* k){napi_value v;need(napi_get_named_property(e,o,k,&v)==napi_ok,std::string("Missing ")+k);return v;}
static double number(napi_env e,napi_value o,const char* k){double v;need(napi_get_value_double(e,prop(e,o,k),&v)==napi_ok&&std::isfinite(v),std::string("Invalid ")+k);return v;}
static vector<double> array(napi_env e,napi_value o,const char* k){napi_typedarray_type type;size_t len,offset;void* data;napi_value b;need(napi_get_typedarray_info(e,prop(e,o,k),&type,&len,&data,&b,&offset)==napi_ok&&type==napi_float64_array,std::string("Expected Float64Array ")+k);return vector<double>((double*)data,(double*)data+len);}
static void put(napi_env e,napi_value o,const char* key,const vector<double>& a){napi_value b,t;void* data;need(napi_create_arraybuffer(e,a.size()*8,&data,&b)==napi_ok,"Allocation failure");std::copy(a.begin(),a.end(),(double*)data);napi_create_typedarray(e,napi_float64_array,a.size(),b,0,&t);napi_set_named_property(e,o,key,t);}
static void putnum(napi_env e,napi_value o,const char* key,double x){napi_value v;napi_create_double(e,x,&v);napi_set_named_property(e,o,key,v);}
struct Curve{
 vector<double> z,area,moment,knot;
 Curve(const vector<double>& bed,const vector<double>& a,size_t from,size_t to){need(to>from&&to<=bed.size(),"Empty curve");vector<double> weights;for(size_t i=from;i<to;i++){need(std::isfinite(bed[i])&&a[i]>0&&std::isfinite(a[i])&&(i==from||bed[i]>=bed[i-1]),"Invalid geometry");if(z.empty()||z.back()!=bed[i]){z.push_back(bed[i]);weights.push_back(a[i]);}else weights.back()+=a[i];}area.push_back(0);moment.push_back(0);for(size_t k=0;k<z.size();k++){double dz=z[k]-z[0];knot.push_back(dz*area.back()-moment.back());area.push_back(area.back()+weights[k]);moment.push_back(moment.back()+weights[k]*dz);}}
 double level(double v) const{if(v<=0)return z[0];size_t k=std::max(size_t(1),size_t(std::upper_bound(knot.begin(),knot.end(),v)-knot.begin()));return z[0]+(v+moment[k])/area[k];}
 double wetArea(double l)const{if(l<=z[0])return 0;size_t k=std::upper_bound(z.begin(),z.end(),l)-z.begin();return area[k];}
 double volume(double l)const{size_t k=std::upper_bound(z.begin(),z.end(),l)-z.begin();return std::max(0.,(l-z[0])*area[k]-moment[k]);}
};
struct Edge{size_t a;int b;double crest,width,coefficient;};
static double head(double level,double crest){double h=std::max(0.,level-crest);return h*std::sqrt(h);}
struct Solver{
 const vector<Curve>& curves;const vector<Edge>& edges;vector<vector<size_t>> adj;vector<double> stage,v;int maxIterations=0;double maxResidual=0;size_t rootIterations=0,roots=0;
 Solver(const vector<Curve>& c,const vector<Edge>& e):curves(c),edges(e),adj(c.size()),stage(c.size()),v(c.size()){for(size_t k=0;k<e.size();k++){adj[e[k].a].push_back(k);if(e[k].b>=0)adj[e[k].b].push_back(k);}}
 void solve(const vector<double>& available,double dt,vector<double>& storage,vector<double>& transfer){
  const size_t n=curves.size();for(size_t i=0;i<n;i++){v[i]=available[i];stage[i]=curves[i].level(v[i]);}
  bool converged=false;double residual=0;int iteration=0;
  for(;iteration<800;iteration++){
   for(size_t i=0;i<n;i++){
    double supply=available[i];for(size_t k:adj[i]){const auto& e=edges[k];int other=e.a==i?e.b:int(e.a);supply+=dt*e.width*e.coefficient*head(other<0?0:stage[other],e.crest);}
    double lo=0,hi=supply,x=std::clamp(v[i],lo,hi);bool root=false;roots++;
    for(int k=0;k<70;k++){rootIterations++;
     double level=curves[i].level(x),out=0,deriv=0;for(size_t ek:adj[i]){const auto& e=edges[ek];double h=std::max(0.,level-e.crest),c=dt*e.width*e.coefficient;out+=c*h*std::sqrt(h);deriv+=c*1.5*std::sqrt(h);}
     double f=x+out-supply,tolerance=std::max(1e-5,supply*2e-14);if(std::abs(f)<=tolerance){root=true;break;}if(f>0)hi=x;else lo=x;double a=curves[i].wetArea(level),candidate=x-f/(a>0?1+deriv/a:1);double next=candidate>lo&&candidate<hi?candidate:(lo+hi)/2;if(next==x){root=true;break;}x=next;
    }
    // Tiny curve inversion noise can bound Newton's final equation error.
    v[i]=x;stage[i]=curves[i].level(x);(void)root;
   }
   residual=0;converged=true;for(size_t i=0;i<n;i++){double r=v[i]-available[i];for(size_t k:adj[i]){const auto& e=edges[k];int other=e.a==i?e.b:int(e.a);r+=dt*e.width*e.coefficient*(head(stage[i],e.crest)-head(other<0?0:stage[other],e.crest));}residual=std::max(residual,std::abs(r));if(std::abs(r)>std::max(.01,available[i]*2e-12))converged=false;}if(converged)break;
  }
  need(converged,"Hydraulic solver did not converge; max residual="+std::to_string(residual));maxIterations=std::max(maxIterations,iteration+1);maxResidual=std::max(maxResidual,residual);
  storage=available;for(size_t k=0;k<edges.size();k++){const auto& e=edges[k];double q=dt*e.width*e.coefficient*(head(stage[e.a],e.crest)-head(e.b<0?0:stage[e.b],e.crest));transfer[k]=q;storage[e.a]-=q;if(e.b>=0)storage[e.b]+=q;}
  for(size_t i=0;i<n;i++){need(std::isfinite(storage[i])&&storage[i]>=0,"Nonfinite/negative surface storage at pond "+std::to_string(i)+": "+std::to_string(storage[i]));}
 }
};
static napi_value run(napi_env env,napi_callback_info info){try{
 size_t argc=1;napi_value argv[1];napi_get_cb_info(env,info,&argc,argv,nullptr,nullptr);need(argc==1,"Expected model object");const napi_value input=argv[0],opts=prop(env,input,"options");
 const int years=int(number(env,opts,"years")),steps=int(number(env,opts,"substeps")),owners=int(number(env,input,"owners")),lake=int(number(env,input,"lakeNode"));need(years>=1&&years<=100&&steps>=1&&steps<=240&&owners>=1,"Invalid horizon");
 const double soilCap=number(env,opts,"soilCapacityMm"),aquiferCap=number(env,opts,"aquiferCapacityMm"),infRate=number(env,opts,"infiltrationMmPerYear"),soilYears=number(env,opts,"soilDrainYears"),groundYears=number(env,opts,"groundwaterReturnYears"),evap=number(env,opts,"evaporationMPerYear");need(soilCap>0&&aquiferCap>0&&infRate>0&&soilYears>0&&groundYears>0&&evap>=0,"Invalid rates");
 auto p=array(env,input,"p"),t=array(env,input,"t"),pet=array(env,input,"pet"),snow=array(env,input,"snow"),soil=array(env,input,"soil"),ground=array(env,input,"ground"),travel=array(env,input,"travel"),north=array(env,input,"north"),sourceArea=array(env,input,"sourceArea"),sourcePond=array(env,input,"sourcePond"),sourceZ=array(env,input,"sourceZ"),sourceOwner=array(env,input,"sourceOwner"),surface=array(env,input,"surface"),starts=array(env,input,"start"),bed=array(env,input,"bed"),areas=array(env,input,"area"),nodeOwner=array(env,input,"nodeOwner"),edgeA=array(env,input,"edgeA"),edgeB=array(env,input,"edgeB"),crest=array(env,input,"edgeCrest"),width=array(env,input,"edgeWidth"),coeff=array(env,input,"edgeCoefficient"),background=array(env,input,"background"),lakeRain=array(env,input,"lakeRain"),lakeEvap=array(env,input,"lakeEvap");
 const size_t ns=snow.size(),np=surface.size(),ne=edgeA.size();need(starts.size()==np+1&&nodeOwner.size()==np&&background.size()==np*12&&lake>=0&&size_t(lake)<np&&lakeRain.size()==12&&lakeEvap.size()==12,"Invalid pond dimensions");
 for(const auto* a:{&soil,&ground,&travel,&north,&sourceArea,&sourcePond,&sourceZ,&sourceOwner})need(a->size()==ns,"Source length mismatch");for(const auto* a:{&p,&t,&pet})need(a->size()==ns*12,"Forcing length mismatch");for(const auto* a:{&edgeB,&crest,&width,&coeff})need(a->size()==ne,"Edge length mismatch");need(bed.size()==areas.size()&&starts[0]==0&&starts.back()==bed.size(),"Column length mismatch");
 for(size_t j=0;j<ns;j++){need(sourcePond[j]>=0&&sourcePond[j]<np&&std::floor(sourcePond[j])==sourcePond[j]&&sourceOwner[j]>=0&&sourceOwner[j]<owners&&std::floor(sourceOwner[j])==sourceOwner[j]&&sourceArea[j]>0,"Invalid source assignment");for(const auto* a:{&snow,&soil,&ground,&travel})need(std::isfinite((*a)[j])&&(*a)[j]>=0,"Invalid source state");need(nodeOwner[size_t(sourcePond[j])]==sourceOwner[j],"Source owner crosses pond owner");}
 for(size_t k=0;k<p.size();k++)need(std::isfinite(p[k])&&p[k]>=0&&std::isfinite(t[k])&&std::isfinite(pet[k])&&pet[k]>=0,"Invalid source climate");
 for(auto* field:{&p,&t,&pet}){vector<double> phase(ns*12);for(size_t j=0;j<ns;j++)for(size_t m=0;m<12;m++)phase[m*ns+j]=(*field)[j*12+m];field->swap(phase);}
 vector<Curve> curves;for(size_t i=0;i<np;i++){need(nodeOwner[i]>=0&&nodeOwner[i]<owners&&std::floor(nodeOwner[i])==nodeOwner[i]&&surface[i]>=0&&std::isfinite(surface[i]),"Invalid pond state");need(starts[i]>=0&&std::floor(starts[i])==starts[i],"Invalid curve offset");curves.emplace_back(bed,areas,size_t(starts[i]),size_t(starts[i+1]));}
 vector<Edge> edges;for(size_t k=0;k<ne;k++){need(edgeA[k]>=0&&edgeA[k]<np&&std::floor(edgeA[k])==edgeA[k]&&edgeB[k]>=-1&&edgeB[k]<np&&std::floor(edgeB[k])==edgeB[k]&&edgeA[k]!=edgeB[k]&&std::isfinite(crest[k])&&width[k]>0&&std::isfinite(width[k])&&coeff[k]>0&&std::isfinite(coeff[k]),"Invalid edge");edges.push_back({size_t(edgeA[k]),int(edgeB[k]),crest[k],width[k],coeff[k]});}
 for(double x:background)need(x>=0&&std::isfinite(x),"Invalid background load");
 constexpr size_t nf=15,na=18;const double dt=1./(12*steps),seconds=dt*365*86400,gr=-std::expm1(-dt/groundYears),sr=-std::expm1(-dt/soilYears),nr=-std::expm1(-.08/steps),ng=-std::expm1(-1./(6*steps*(groundYears/2))),nt=-std::expm1(-1./(1.5*steps));
 vector<double> totals(owners*nf,0),annual(years*owners*na,0),forward(ne,0),reverse(ne,0),firstForward(ne,-1),firstReverse(ne,-1),maxStage(np),levels(np),available(np),transfer(ne),row(owners*nf),maximumSoil(owners,0),maximumGround(owners,0);
 auto inventory=[&](){vector<double> v(owners*5,0);for(size_t j=0;j<ns;j++){size_t o=size_t(sourceOwner[j])*5;double a=sourceArea[j]/1000;v[o]+=snow[j]*a;v[o+1]+=soil[j]*a;v[o+2]+=ground[j]*a;v[o+3]+=travel[j]*a;}for(size_t i=0;i<np;i++)v[size_t(nodeOwner[i])*5+4]+=surface[i];return v;};
 const auto initial=inventory();for(size_t i=0;i<np;i++)levels[i]=maxStage[i]=curves[i].level(surface[i]);Solver solver(curves,edges);double maxAnnualResidual=0,maxRelativeAnnualResidual=0;size_t executed=0;
 for(int year=0;year<years;year++){
  auto start=inventory();std::fill(row.begin(),row.end(),0);
  for(int phase=0;phase<12;phase++)for(int step=0;step<steps;step++){
   available=surface;
   for(size_t j=0;j<ns;j++){
    size_t k=phase*ns+j,pond=size_t(sourcePond[j]),o=size_t(sourceOwner[j])*nf;double prec=p[k]/steps,temp=t[k],af=sourceArea[j]/1000,s=snow[j],so=soil[j],g=ground[j],tr=travel[j],liquid,ev=0,inf=0,recharge=0,ret=0,runoff=0,direct=0,sub=0,delivered=0;bool wet=sourceZ[j]<levels[pond];
    if(north[j]){
     double fraction=std::clamp((1-temp)/2,0.,1.);s+=prec*fraction;liquid=prec*(1-fraction);sub=std::min(s,(3+pet[k]*.05)/steps);s-=sub;double melt=std::min(s,std::max(0.,temp)*3*(365./12)/steps);s-=melt;liquid+=melt;
     double fast=0;if(wet)direct=liquid;else{inf=liquid*std::min(1.,.8*infRate/1200);fast=liquid-inf;so+=inf;double excess=std::max(0.,so-150);so-=excess;fast+=excess;inf-=excess;ev=std::min(so,pet[k]/steps);so-=ev;}
     recharge=so*nr;so-=recharge;g+=recharge;ret=g*ng;g-=ret;tr+=fast+ret;runoff=tr*nt;tr-=runoff;delivered=runoff+direct;
    }else{
     liquid=temp<0?0:prec;if(temp<0)s+=prec;double melt=std::min(s,std::max(0.,temp)*540*dt);s-=melt;liquid+=melt;ret=g*gr;g-=ret;recharge=std::min(so*sr,aquiferCap-g);so-=recharge;g+=recharge;
     if(wet)direct=liquid;else{double demand=std::max(temp+5,0.)*24*dt,immediate=std::min(liquid,demand);liquid-=immediate;double fromSoil=std::min(so,demand-immediate);so-=fromSoil;ev=immediate+fromSoil;inf=std::min({liquid,infRate*dt,soilCap-so});so+=inf;runoff=liquid-inf;}delivered=runoff+direct+ret;
    }
    snow[j]=s;soil[j]=so;ground[j]=g;travel[j]=tr;available[pond]+=delivered*af;
    row[o]+=prec*af;row[o+2]+=(ev+sub)*af;row[o+3]+=sub*af;row[o+4]+=inf*af;row[o+5]+=recharge*af;row[o+6]+=ret*af;row[o+7]+=runoff*af;row[o+8]+=direct*af;maximumSoil[size_t(sourceOwner[j])]=std::max(maximumSoil[size_t(sourceOwner[j])],so);maximumGround[size_t(sourceOwner[j])]=std::max(maximumGround[size_t(sourceOwner[j])],g);
   }
   for(size_t i=0;i<np;i++){
    size_t o=size_t(nodeOwner[i])*nf;double load=background[i*12+phase]/steps;available[i]+=load;row[o+1]+=load;
    if(int(i)==lake){double rain=curves[i].wetArea(levels[i])*lakeRain[phase]/steps;available[i]+=rain;row[o+14]+=rain;}
    double depth=int(i)==lake?lakeEvap[phase]/steps:evap*dt,z=curves[i].level(available[i]),after=std::min(available[i],curves[i].volume(std::max(curves[i].z[0],z-depth)));row[o+9]+=available[i]-after;available[i]=after;
   }
   solver.solve(available,seconds,surface,transfer);executed++;
   for(size_t k=0;k<ne;k++){
    const auto& e=edges[k];double v=transfer[k];size_t a=size_t(nodeOwner[e.a])*nf;
    if(v>=0){forward[k]+=v;if(v>1&&firstForward[k]<0)firstForward[k]=executed*dt;}else{reverse[k]-=v;if(v< -1&&firstReverse[k]<0)firstReverse[k]=executed*dt;}
    if(e.b<0){if(v>=0)row[a+13]+=v;else row[a+12]-=v;}else{size_t b=size_t(nodeOwner[e.b])*nf;if(a!=b){if(v>=0){row[a+11]+=v;row[b+10]+=v;}else{row[a+10]-=v;row[b+11]-=v;}}}
   }
   for(size_t i=0;i<np;i++){levels[i]=curves[i].level(surface[i]);maxStage[i]=std::max(maxStage[i],levels[i]);}
  }
  auto end=inventory();for(size_t o=0;o<size_t(owners);o++){
   double before=0,after=0;for(size_t k=0;k<5;k++){before+=start[o*5+k];after+=end[o*5+k];}size_t r=o*nf,a=(year*owners+o)*na;double incoming=row[r]+row[r+1]+row[r+10]+row[r+12]+row[r+14],outgoing=row[r+2]+row[r+9]+row[r+11]+row[r+13],res=before+incoming-outgoing-after;maxAnnualResidual=std::max(maxAnnualResidual,std::abs(res));maxRelativeAnnualResidual=std::max(maxRelativeAnnualResidual,std::abs(res)/std::max(1.,before+incoming));need(std::abs(res)<=std::max(.2,(before+incoming)*2e-10),"Owner water balance failure "+std::to_string(o)+" residual "+std::to_string(res));
   for(size_t k=0;k<nf;k++){annual[a+k]=row[r+k];totals[r+k]+=row[r+k];}annual[a+nf]=before;annual[a+nf+1]=after;annual[a+nf+2]=res;
  }
  if((year+1)%5==0){std::fprintf(stdout,"{\"year\":%d,\"steps\":%d,\"iterations\":%d,\"equationResidualM3\":%.9g}\n",year+1,steps,solver.maxIterations,solver.maxResidual);std::fflush(stdout);}
 }
 const auto final=inventory();vector<double> finalSource(ns*4),wetArea(np);for(size_t j=0;j<ns;j++){finalSource[j*4]=snow[j];finalSource[j*4+1]=soil[j];finalSource[j*4+2]=ground[j];finalSource[j*4+3]=travel[j];}for(size_t i=0;i<np;i++)wetArea[i]=curves[i].wetArea(levels[i]);
 napi_value out;napi_create_object(env,&out);put(env,out,"initial",initial);put(env,out,"final",final);put(env,out,"totals",totals);put(env,out,"annual",annual);put(env,out,"forward",forward);put(env,out,"reverse",reverse);put(env,out,"firstForward",firstForward);put(env,out,"firstReverse",firstReverse);put(env,out,"surface",surface);put(env,out,"levels",levels);put(env,out,"maxStage",maxStage);put(env,out,"wetArea",wetArea);put(env,out,"finalSource",finalSource);put(env,out,"maximumSoil",maximumSoil);put(env,out,"maximumGround",maximumGround);putnum(env,out,"executedSteps",executed);putnum(env,out,"maxIterations",solver.maxIterations);putnum(env,out,"meanRootIterations",double(solver.rootIterations)/solver.roots);putnum(env,out,"maxEquationResidualM3",solver.maxResidual);putnum(env,out,"maxAnnualResidualM3",maxAnnualResidual);putnum(env,out,"maxRelativeAnnualResidual",maxRelativeAnnualResidual);return out;
 }catch(const std::exception& e){napi_throw_error(env,nullptr,e.what());return nullptr;}}
static napi_value init(napi_env env,napi_value exports){napi_value f;napi_create_function(env,"run",3,run,nullptr,&f);napi_set_named_property(env,exports,"run",f);return exports;}
NAPI_MODULE(NODE_GYP_MODULE_NAME,init)
