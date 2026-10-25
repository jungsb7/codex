// Phase51: optional conservative snow/ice transport, surface freezing and frost feedback.
#include <node_api.h>
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdio>
#include <stdexcept>
#include <string>
#include <vector>
using std::vector;
static void need(bool x,const std::string& s){if(!x)throw std::runtime_error(s);}
static napi_value prop(napi_env e,napi_value o,const char* k){napi_value v;need(napi_get_named_property(e,o,k,&v)==napi_ok,std::string("Missing ")+k);return v;}
static bool has(napi_env e,napi_value o,const char* k){bool present=false;napi_has_named_property(e,o,k,&present);return present;}
static double number(napi_env e,napi_value o,const char* k){double v;need(napi_get_value_double(e,prop(e,o,k),&v)==napi_ok&&std::isfinite(v),std::string("Invalid ")+k);return v;}
static vector<double> array(napi_env e,napi_value o,const char* k){napi_typedarray_type type;size_t len,offset;void* data;napi_value b;need(napi_get_typedarray_info(e,prop(e,o,k),&type,&len,&data,&b,&offset)==napi_ok&&type==napi_float64_array,std::string("Expected Float64Array ")+k);return vector<double>((double*)data,(double*)data+len);}
static void put(napi_env e,napi_value o,const char* key,const vector<double>& a){napi_value b,t;void* data;need(napi_create_arraybuffer(e,a.size()*8,&data,&b)==napi_ok,"Allocation failure");std::copy(a.begin(),a.end(),(double*)data);napi_create_typedarray(e,napi_float64_array,a.size(),b,0,&t);napi_set_named_property(e,o,key,t);}
static void putnum(napi_env e,napi_value o,const char* key,double x){napi_value v;napi_create_double(e,x,&v);napi_set_named_property(e,o,key,v);}
#include "../internal-pond-model/poly.h"
struct Curve{
 double frozen=0;
 vector<Poly> polys;
 Curve(const vector<Poly>& ps):polys(ps){need(!ps.empty(),"Empty polynomial group");std::sort(polys.begin(),polys.end(),[](const Poly& a,const Poly& b){return a.z[0]<b.z[0];});double lo=ps[0].z[0];for(auto p:ps)lo=std::min(lo,p.z[0]);z.push_back(lo);}
 double polyLevel(double v)const{if(v<=0)return z[0];if(polys.size()==1)return polys[0].level(v);double lo=z[0],hi=polys[0].level(v),x=hi;for(int j=0;j<70;j++){double f=baseVolume(x)-v;if(std::abs(f)<=std::max(1e-30,v*2e-14))break;if(f>0)hi=x;else lo=x;double a=wetArea(x),next=a>0?x-f/a:-1;next=next>lo&&next<hi?next:(lo+hi)/2;if(next==x)break;x=next;}return x;}
 vector<double> z,area,moment,knot;
 Curve(Span bed,Span a,size_t from,size_t to){need(to>from&&to<=bed.n,"Empty curve");vector<double> weights;for(size_t i=from;i<to;i++){need(std::isfinite(bed[i])&&a[i]>0&&std::isfinite(a[i])&&(i==from||bed[i]>=bed[i-1]),"Invalid geometry");if(z.empty()||z.back()!=bed[i]){z.push_back(bed[i]);weights.push_back(a[i]);}else weights.back()+=a[i];}area.push_back(0);moment.push_back(0);for(size_t k=0;k<z.size();k++){double dz=z[k]-z[0];knot.push_back(dz*area.back()-moment.back());area.push_back(area.back()+weights[k]);moment.push_back(moment.back()+weights[k]*dz);}}
 double level(double v)const{return baseLevel(v+frozen);}
 double volume(double l)const{return std::max(0.,baseVolume(l)-frozen);}
 double baseLevel(double v) const{if(!polys.empty())return polyLevel(v);if(v<=0)return z[0];size_t k=std::max(size_t(1),size_t(std::upper_bound(knot.begin(),knot.end(),v)-knot.begin()));return z[0]+(v+moment[k])/area[k];}
 double wetArea(double l)const{if(!polys.empty()){double a=0;for(auto p:polys){if(p.z[0]>=l)break;a+=p.area(l);}return a;}if(l<=z[0])return 0;size_t k=std::upper_bound(z.begin(),z.end(),l)-z.begin();return area[k];}
 double baseVolume(double l)const{if(!polys.empty()){double v=0;for(auto p:polys){if(p.z[0]>=l)break;v+=p.volume(l);}return v;}size_t k=std::upper_bound(z.begin(),z.end(),l)-z.begin();return std::max(0.,(l-z[0])*area[k]-moment[k]);}
};
struct Edge{size_t a;int b;double crest,width,coefficient;};
static double head(double level,double crest){double h=std::max(0.,level-crest);return h*std::sqrt(h);}
struct Solver{
 bool forcePair;const vector<Curve>& curves;const vector<Edge>& edges;vector<vector<size_t>> adj;vector<double> stage,v;int maxIterations=0;double maxResidual=0,maxNormalizedPairResidual=0,maxPairToleranceM3=0;size_t rootIterations=0,roots=0,dryLiquidLimitedExchanges=0;double maximumUnavailableLiquidDemandM3=0;
 Solver(const vector<Curve>& c,const vector<Edge>& e,bool pair=false):forcePair(pair),curves(c),edges(e),adj(c.size()),stage(c.size()),v(c.size()){for(size_t k=0;k<e.size();k++){adj[e[k].a].push_back(k);if(e[k].b>=0)adj[e[k].b].push_back(k);}}
 // Symmetric edge sweeps of bounded two-reservoir implicit exchange.
 // Each pair retains nonnegative donor storage and transfers water exactly once.
 void pairwise(const vector<double>& available,double dt,vector<double>& storage,vector<double>& transfer){
  storage=available;std::fill(transfer.begin(),transfer.end(),0);
  auto exchange=[&](size_t k,double seconds){const auto& e=edges[k];double ha=curves[e.a].level(storage[e.a]),hb=e.b<0?0:curves[e.b].level(storage[e.b]),pa=head(ha,e.crest),pb=head(hb,e.crest);if(pa==pb)return;const double c=seconds*e.width*e.coefficient;const bool oceanIn=e.b<0&&pb>pa;size_t donor=oceanIn?e.a:pa>pb?e.a:size_t(e.b);int receiver=oceanIn?-1:pa>pb?e.b:int(e.a);double before=storage[donor],other=receiver<0?0:storage[receiver];if(!oceanIn&&before==0)return;
   // Frozen displacement can leave a positive head at zero mobile liquid.
   // The constrained solution is at the donor-volume boundary when the
   // unconstrained weir demand would exceed all available liquid.
   if(forcePair&&!oceanIn){double demand=c*(head(curves[donor].level(0),e.crest)-head(receiver<0?0:curves[receiver].level(other+before),e.crest));if(demand>=before){storage[donor]=0;if(receiver>=0)storage[receiver]=other+before;transfer[k]+=(donor==e.a?before:-before);dryLiquidLimitedExchanges++;maximumUnavailableLiquidDemandM3=std::max(maximumUnavailableLiquidDemandM3,demand-before);return;}}
   bool remaining=false;double limit;if(oceanIn)limit=c*pb;else{limit=before/2;double midpoint=limit-c*(head(curves[donor].level(before-limit),e.crest)-head(receiver<0?0:curves[receiver].level(other+limit),e.crest));remaining=midpoint<0;}
   double lo=0,hi=std::sqrt(limit),u=hi,res=0,bound=0,amount=0,newDonor=before;int iteration=0;bool solved=false;roots++;
   for(;iteration<100;iteration++){rootIterations++;double small=u*u;amount=oceanIn?small:remaining?before-small:small;newDonor=oceanIn?before+amount:remaining?small:before-amount;double dh=curves[donor].level(newDonor),rh=oceanIn?0:receiver<0?0:curves[receiver].level(other+amount),dp=head(dh,e.crest),rp=head(rh,e.crest),da=curves[donor].wetArea(dh),ra=receiver<0?0:curves[receiver].wetArea(rh),dhp=dp>0?1.5*std::sqrt(dh-e.crest):0,rhp=rp>0?1.5*std::sqrt(rh-e.crest):0;res=oceanIn?amount-c*(pb-dp):remaining?small-before+c*(dp-rp):amount-c*(dp-rp);double derivative=2*u*(1+c*((da>0?dhp/da:0)+(ra>0?rhp/ra:0))),ulpD=std::nextafter(dh,INFINITY)-dh,ulpR=std::nextafter(rh,INFINITY)-rh;bound=std::max({1e-9,(oceanIn?before+limit:before)*2e-14,4*c*(dhp*ulpD+rhp*ulpR)+8*2.220446049250313e-16*(before+amount)});if(std::abs(res)<=bound){solved=true;break;}if(res>0)hi=u;else lo=u;double next=derivative>0?u-res/derivative:-1;next=next>lo&&next<hi?next:(lo+hi)/2;if(next==u)break;u=next;}
   need(solved,"Balanced pair solver failed edge="+std::to_string(k)+" residual="+std::to_string(res)+" tolerance="+std::to_string(bound));maxNormalizedPairResidual=std::max(maxNormalizedPairResidual,std::abs(res)/bound);maxPairToleranceM3=std::max(maxPairToleranceM3,bound);maxIterations=std::max(maxIterations,iteration+1);maxResidual=std::max(maxResidual,std::abs(res));
   need(newDonor>=0&&std::isfinite(newDonor),"Invalid balanced donor storage");storage[donor]=newDonor;if(oceanIn)transfer[k]-=amount;else{if(receiver>=0)storage[receiver]=other+amount;transfer[k]+=(donor==e.a?amount:-amount);}
  };
  for(size_t k=0;k<edges.size();k++)exchange(k,dt/2);for(size_t k=edges.size();k-->0;)exchange(k,dt/2);
  for(double v:storage)need(v>=0&&std::isfinite(v),"Invalid conservative pair storage");
 }
 void solve(const vector<double>& available,double dt,vector<double>& storage,vector<double>& transfer){
  if(forcePair||std::any_of(curves.begin(),curves.end(),[](const Curve& c){return !c.polys.empty();})){pairwise(available,dt,storage,transfer);return;}
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
#include "cryo.h"
static napi_value run(napi_env env,napi_callback_info info){try{
 size_t argc=1;napi_value argv[1];napi_get_cb_info(env,info,&argc,argv,nullptr,nullptr);need(argc==1,"Expected model object");const napi_value input=argv[0],opts=prop(env,input,"options");
 const int years=int(number(env,opts,"years")),steps=int(number(env,opts,"substeps")),owners=int(number(env,input,"owners")),lake=int(number(env,input,"lakeNode"));need(years>=1&&years<=100&&steps>=1&&steps<=240&&owners>=1,"Invalid horizon");
 const double soilCap=number(env,opts,"soilCapacityMm"),aquiferCap=number(env,opts,"aquiferCapacityMm"),infRate=number(env,opts,"infiltrationMmPerYear"),soilYears=number(env,opts,"soilDrainYears"),groundYears=number(env,opts,"groundwaterReturnYears"),evap=number(env,opts,"evaporationMPerYear");need(soilCap>0&&aquiferCap>0&&infRate>0&&soilYears>0&&groundYears>0&&evap>=0,"Invalid rates");
 auto p=array(env,input,"p"),t=array(env,input,"t"),pet=array(env,input,"pet"),snow=array(env,input,"snow"),soil=array(env,input,"soil"),ground=array(env,input,"ground"),travel=array(env,input,"travel"),north=array(env,input,"north"),sourceArea=array(env,input,"sourceArea"),sourcePond=array(env,input,"sourcePond"),sourceZ=array(env,input,"sourceZ"),sourceOwner=array(env,input,"sourceOwner"),surface=array(env,input,"surface"),starts=array(env,input,"start"),bed=has(env,input,"polyZ")?vector<double>{}:array(env,input,"bed"),areas=has(env,input,"polyZ")?vector<double>{}:array(env,input,"area"),nodeOwner=array(env,input,"nodeOwner"),edgeA=array(env,input,"edgeA"),edgeB=array(env,input,"edgeB"),crest=array(env,input,"edgeCrest"),width=array(env,input,"edgeWidth"),coeff=array(env,input,"edgeCoefficient"),background=array(env,input,"background"),lakeRain=array(env,input,"lakeRain"),lakeEvap=array(env,input,"lakeEvap");
 auto sourceBed=has(env,input,"sourceBed")&&!has(env,input,"polyZ")?array(env,input,"sourceBed"):vector<double>{},sourceStart=has(env,input,"sourceStart")?array(env,input,"sourceStart"):vector<double>{};const bool floodInfiltration=has(env,opts,"floodInfiltration")&&number(env,opts,"floodInfiltration")>0;
 auto bedView=has(env,input,"polyZ")?view(env,input,"bed"):Span{bed.data(),bed.size()},areaView=has(env,input,"polyZ")?view(env,input,"area"):Span{areas.data(),areas.size()},sourceView=has(env,input,"polyZ")&&has(env,input,"sourceBed")?view(env,input,"sourceBed"):Span{sourceBed.data(),sourceBed.size()};
 const size_t ns=snow.size(),np=surface.size(),ne=edgeA.size();need(starts.size()==np+1&&nodeOwner.size()==np&&background.size()==np*12&&lake>=0&&size_t(lake)<np&&lakeRain.size()==12&&lakeEvap.size()==12,"Invalid pond dimensions");
 for(const auto* a:{&soil,&ground,&travel,&north,&sourceArea,&sourcePond,&sourceZ,&sourceOwner})need(a->size()==ns,"Source length mismatch");for(const auto* a:{&p,&t,&pet})need(a->size()==ns*12,"Forcing length mismatch");for(const auto* a:{&edgeB,&crest,&width,&coeff})need(a->size()==ne,"Edge length mismatch");need(bedView.n==areaView.n&&starts[0]==0&&starts.back()==bedView.n,"Column length mismatch");
 auto rainWeights=has(env,input,"rainWeights")?array(env,input,"rainWeights"):vector<double>{},rainRegion=has(env,input,"rainRegion")?array(env,input,"rainRegion"):vector<double>{};if(!rainWeights.empty()){need(rainRegion.size()==ns&&rainWeights.size()%(12*steps)==0,"Invalid rain profile dimensions");const size_t regions=rainWeights.size()/(12*steps);for(double r:rainRegion)need(std::isfinite(r)&&r>=0&&r<regions&&std::floor(r)==r,"Invalid rain region");for(size_t r=0;r<regions;r++)for(int phase=0;phase<12;phase++){double total=0;for(int step=0;step<steps;step++){double w=rainWeights[(r*12+phase)*steps+step];need(std::isfinite(w)&&w>=0,"Invalid rain weight");total+=w;}need(std::abs(total-steps)<steps*1e-10,"Rain profile changes period precipitation");}}else need(rainRegion.empty(),"Missing rain weights");
 for(size_t j=0;j<ns;j++){need(sourcePond[j]>=0&&sourcePond[j]<np&&std::floor(sourcePond[j])==sourcePond[j]&&sourceOwner[j]>=0&&sourceOwner[j]<owners&&std::floor(sourceOwner[j])==sourceOwner[j]&&sourceArea[j]>0,"Invalid source assignment");for(const auto* a:{&snow,&soil,&ground,&travel})need(std::isfinite((*a)[j])&&(*a)[j]>=0,"Invalid source state");need(nodeOwner[size_t(sourcePond[j])]==sourceOwner[j],"Source owner crosses pond owner");}
 if(sourceView.n>0){need(sourceStart.size()==ns+1&&sourceStart.front()==0&&sourceStart.back()==sourceView.n,"Invalid subgrid source offsets");for(size_t j=0;j<ns;j++){need(sourceStart[j]>=0&&std::floor(sourceStart[j])==sourceStart[j]&&sourceStart[j+1]>sourceStart[j]&&sourceStart[j+1]<=sourceView.n&&std::floor(sourceStart[j+1])==sourceStart[j+1],"Empty/invalid source curve");for(size_t k=size_t(sourceStart[j]);k<size_t(sourceStart[j+1]);k++)need(std::isfinite(sourceView[k])&&(k==size_t(sourceStart[j])||sourceView[k]>=sourceView[k-1]),"Unsorted source terrain");}}else need(sourceStart.empty(),"Missing subgrid source terrain");
 for(size_t k=0;k<p.size();k++)need(std::isfinite(p[k])&&p[k]>=0&&std::isfinite(t[k])&&std::isfinite(pet[k])&&pet[k]>=0,"Invalid source climate");
 for(auto* field:{&p,&t,&pet}){vector<double> phase(ns*12);for(size_t j=0;j<ns;j++)for(size_t m=0;m<12;m++)phase[m*ns+j]=(*field)[j*12+m];field->swap(phase);}
 vector<Poly> bank;vector<double> nodePolyStart,nodePolyIds,sourcePoly;
 if(has(env,input,"polyZ")){auto z=view(env,input,"polyZ"),v=view(env,input,"polyV"),a=view(env,input,"polyA"),b=view(env,input,"polyB"),t=view(env,input,"polyT");auto starts=array(env,input,"polyStart");need(z.n==v.n&&z.n==a.n&&z.n==b.n&&z.n==t.n&&starts.size()>1&&starts.front()==0&&starts.back()==z.n,"Invalid polynomial bank");for(size_t i=0;i+1<starts.size();i++){need(starts[i]>=0&&std::floor(starts[i])==starts[i]&&starts[i+1]>starts[i]&&starts[i+1]<=z.n&&std::floor(starts[i+1])==starts[i+1],"Invalid polynomial offset");size_t from=starts[i],len=starts[i+1]-from;for(size_t k=from;k<from+len;k++){need(std::isfinite(z[k])&&std::isfinite(v[k])&&std::isfinite(a[k])&&std::isfinite(b[k])&&std::isfinite(t[k])&&v[k]>=0&&a[k]>=-1e-5,"Invalid polynomial coefficient");if(k>from)need(z[k]>z[k-1]&&v[k]>=v[k-1],"Unsorted polynomial bank");}need(v[from]==0&&a[from+len-1]>0&&b[from+len-1]==0&&t[from+len-1]==0,"Invalid polynomial endpoints");bank.push_back({z.p+from,v.p+from,a.p+from,b.p+from,t.p+from,len});}
 nodePolyStart=array(env,input,"nodePolyStart");nodePolyIds=array(env,input,"nodePolyIds");sourcePoly=array(env,input,"sourcePoly");need(nodePolyStart.size()==np+1&&nodePolyStart.front()==0&&nodePolyStart.back()==nodePolyIds.size()&&sourcePoly.size()==ns,"Invalid polynomial mapping");for(size_t i=0;i<np;i++)need(nodePolyStart[i]>=0&&std::floor(nodePolyStart[i])==nodePolyStart[i]&&nodePolyStart[i+1]>=nodePolyStart[i]&&nodePolyStart[i+1]<=nodePolyIds.size(),"Invalid node polynomial offset");for(double x:nodePolyIds)need(x>=0&&x<bank.size()&&std::floor(x)==x,"Invalid node polynomial id");for(double x:sourcePoly)need(x>=-1&&x<bank.size()&&std::floor(x)==x,"Invalid source polynomial id");
 }
 vector<Curve> curves;for(size_t i=0;i<np;i++){need(nodeOwner[i]>=0&&nodeOwner[i]<owners&&std::floor(nodeOwner[i])==nodeOwner[i]&&surface[i]>=0&&std::isfinite(surface[i]),"Invalid pond state");need(starts[i]>=0&&std::floor(starts[i])==starts[i],"Invalid curve offset");if(!bank.empty()&&nodePolyStart[i+1]>nodePolyStart[i]){vector<Poly> ps;for(size_t j=nodePolyStart[i];j<size_t(nodePolyStart[i+1]);j++)ps.push_back(bank[size_t(nodePolyIds[j])]);curves.emplace_back(ps);}else curves.emplace_back(bedView,areaView,size_t(starts[i]),size_t(starts[i+1]));}
 bed.clear();bed.shrink_to_fit();areas.clear();areas.shrink_to_fit();
 vector<Edge> edges;for(size_t k=0;k<ne;k++){need(edgeA[k]>=0&&edgeA[k]<np&&std::floor(edgeA[k])==edgeA[k]&&edgeB[k]>=-1&&edgeB[k]<np&&std::floor(edgeB[k])==edgeB[k]&&edgeA[k]!=edgeB[k]&&std::isfinite(crest[k])&&width[k]>0&&std::isfinite(width[k])&&coeff[k]>0&&std::isfinite(coeff[k]),"Invalid edge");need(crest[k]>=curves[size_t(edgeA[k])].z[0]&&(edgeB[k]<0||crest[k]>=curves[size_t(edgeB[k])].z[0]),"Crest below discrete pond floor");edges.push_back({size_t(edgeA[k]),int(edgeB[k]),crest[k],width[k],coeff[k]});}
 for(double x:background)need(x>=0&&std::isfinite(x),"Invalid background load");
 const bool cryoEnabled=has(env,input,"ice");Cryo cryo;if(cryoEnabled){cryo.init(env,input,ns,np);for(size_t i=0;i<np;i++)curves[i].frozen=cryo.surfaceIce[i];}
 const size_t nf=floodInfiltration?16:15,na=nf+3;const double dt=1./(12*steps),seconds=dt*365*86400,gr=-std::expm1(-dt/groundYears),sr=-std::expm1(-dt/soilYears),nr=-std::expm1(-.08/steps),ng=-std::expm1(-1./(6*steps*(groundYears/2))),nt=-std::expm1(-1./(1.5*steps));
 vector<double> totals(owners*nf,0),annual(years*owners*na,0),forward(ne,0),reverse(ne,0),firstForward(ne,-1),firstReverse(ne,-1),maxStage(np),levels(np),available(np),transfer(ne),row(owners*nf),maximumSoil(owners,0),maximumGround(owners,0);
 const size_t nperiod=years*12; vector<double> periodLevels((nperiod+1)*np),periodStorage((nperiod+1)*np),periodMin(nperiod*np),periodMax(nperiod*np),traceLevels(cryoEnabled?0:nperiod*np*steps,0),periodInventory((nperiod+1)*owners*5),periodLedger(nperiod*owners*nf),periodForward(nperiod*ne,0),periodReverse(nperiod*ne,0),previousRow(owners*nf,0);
 vector<double> cryoSource(cryoEnabled?nperiod*ns*3:0),cryoFlux(cryoEnabled?nperiod*ns*4:0),cryoSurface(cryoEnabled?nperiod*np*3:0);
 vector<double> wetFractions(ns,0),floodNeed(ns,0),pondNeed(np,0),pondScale(np,0);size_t partialWetSteps=0;double maximumFloodInfiltrationStepM3=0;
 auto inventory=[&](){vector<double> v(owners*5,0);for(size_t j=0;j<ns;j++){size_t o=size_t(sourceOwner[j])*5;double a=sourceArea[j]/1000;v[o]+=(snow[j]+(cryoEnabled?cryo.ice[j]:0))*a;v[o+1]+=soil[j]*a;v[o+2]+=ground[j]*a;v[o+3]+=travel[j]*a;}for(size_t i=0;i<np;i++)v[size_t(nodeOwner[i])*5+4]+=surface[i]+(cryoEnabled?cryo.surfaceIce[i]:0);return v;};
 const auto initial=inventory();for(size_t i=0;i<np;i++)levels[i]=maxStage[i]=curves[i].level(surface[i]);Solver solver(curves,edges,cryoEnabled);double maxAnnualResidual=0,maxRelativeAnnualResidual=0;size_t executed=0;
 std::copy(initial.begin(),initial.end(),periodInventory.begin());std::copy(levels.begin(),levels.end(),periodLevels.begin());std::copy(surface.begin(),surface.end(),periodStorage.begin());
 for(int year=0;year<years;year++){
  auto start=inventory();std::fill(row.begin(),row.end(),0);
  std::fill(previousRow.begin(),previousRow.end(),0);
  for(int phase=0;phase<12;phase++){const size_t slot=year*12+phase;if(cryoEnabled)cryo.resetFlux();for(size_t i=0;i<np;i++)periodMin[slot*np+i]=periodMax[slot*np+i]=levels[i];
  for(int step=0;step<steps;step++){
   if(cryoEnabled){cryo.thermalStep(phase,dt,t,curves,surface,edges,coeff);for(size_t i=0;i<np;i++)levels[i]=curves[i].level(surface[i]);}
   available=surface;
   for(size_t j=0;j<ns;j++){
    size_t k=phase*ns+j,pond=size_t(sourcePond[j]),o=size_t(sourceOwner[j])*nf;double prec=p[k]/steps,temp=t[k],af=sourceArea[j]/1000;if(!rainWeights.empty())prec*=rainWeights[(size_t(rainRegion[j])*12+phase)*steps+step];double fraction=sourceZ[j]<levels[pond]?1:0;
    if(sourceView.n>0){auto from=sourceView.p+size_t(sourceStart[j]),to=sourceView.p+size_t(sourceStart[j+1]);fraction=double(std::lower_bound(from,to,levels[pond])-from)/double(to-from);}if(!sourcePoly.empty()&&sourcePoly[j]>=0){const auto& q=bank[size_t(sourcePoly[j])];fraction=q.area(levels[pond])/q.a[q.n-1];}wetFractions[j]=fraction;if(fraction>0&&fraction<1)partialWetSteps++;
    double iceMelt=0,permeability=1;if(cryoEnabled){iceMelt=cryo.sourceStep(j,snow[j],prec,temp,pet[k],north[j],dt,sourceArea[j]);permeability=cryo.permeability(j);}
    auto advance=[&](bool wet){double s=snow[j],so=soil[j],g=ground[j],tr=travel[j],liquid,ev=0,inf=0,recharge=0,ret=0,runoff=0,direct=0,sub=0,delivered=0;
    if(north[j]){
     double fraction=std::clamp((1-temp)/2,0.,1.);s+=prec*fraction;liquid=prec*(1-fraction);sub=std::min(s,(3+pet[k]*.05)/steps);s-=sub;double melt=std::min(s,std::max(0.,temp)*3*(365./12)/steps);s-=melt;liquid+=melt+iceMelt;
     double fast=0;if(wet)direct=liquid;else{inf=liquid*std::min(1.,.8*infRate/1200*permeability);fast=liquid-inf;so+=inf;double excess=std::max(0.,so-150);so-=excess;fast+=excess;inf-=excess;ev=std::min(so,pet[k]/steps);so-=ev;}
     recharge=so*nr*permeability;so-=recharge;g+=recharge;ret=g*ng*permeability;g-=ret;tr+=fast+ret;runoff=tr*nt;tr-=runoff;delivered=runoff+direct;
    }else{
     liquid=temp<0?0:prec;if(temp<0)s+=prec;double melt=std::min(s,std::max(0.,temp)*540*dt);s-=melt;liquid+=melt+iceMelt;ret=g*gr*permeability;g-=ret;recharge=std::min(so*sr*permeability,aquiferCap-g);so-=recharge;g+=recharge;
     if(wet)direct=liquid;else{double demand=std::max(temp+5,0.)*24*dt,immediate=std::min(liquid,demand);liquid-=immediate;double fromSoil=std::min(so,demand-immediate);so-=fromSoil;ev=immediate+fromSoil;inf=std::min({liquid,infRate*dt*permeability,soilCap-so});so+=inf;runoff=liquid-inf;}delivered=runoff+direct+ret;
    }
    return std::array<double,12>{s,so,g,tr,ev,inf,recharge,ret,runoff,direct,sub,delivered};};
    auto values=advance(fraction>=1);if(fraction>0&&fraction<1){auto wet=advance(true);for(size_t k=0;k<values.size();k++)values[k]=(1-fraction)*values[k]+fraction*wet[k];}double s=values[0],so=values[1],g=values[2],tr=values[3],ev=values[4],inf=values[5],recharge=values[6],ret=values[7],runoff=values[8],direct=values[9],sub=values[10],delivered=values[11];
    snow[j]=s;soil[j]=so;ground[j]=g;travel[j]=tr;available[pond]+=delivered*af;
    row[o]+=prec*af;row[o+2]+=(ev+sub)*af;row[o+3]+=sub*af;row[o+4]+=inf*af;row[o+5]+=recharge*af;row[o+6]+=ret*af;row[o+7]+=runoff*af;row[o+8]+=direct*af;maximumSoil[size_t(sourceOwner[j])]=std::max(maximumSoil[size_t(sourceOwner[j])],so);maximumGround[size_t(sourceOwner[j])]=std::max(maximumGround[size_t(sourceOwner[j])],g);
   }
   if(cryoEnabled)cryo.move(dt,sourceArea,sourceZ,sourceOwner,row,nf);
   if(floodInfiltration){std::fill(pondNeed.begin(),pondNeed.end(),0);for(size_t j=0;j<ns;j++){double cap=north[j]?150:soilCap;floodNeed[j]=wetFractions[j]*std::min(infRate*dt*(cryoEnabled?cryo.permeability(j):1),std::max(0.,cap-soil[j]))*sourceArea[j]/1000;pondNeed[size_t(sourcePond[j])]+=floodNeed[j];}for(size_t i=0;i<np;i++)pondScale[i]=pondNeed[i]>0?std::min(1.,available[i]/pondNeed[i]):0;double stepInfiltration=0;for(size_t j=0;j<ns;j++){size_t p=size_t(sourcePond[j]),o=size_t(sourceOwner[j])*nf;double v=floodNeed[j]*pondScale[p];soil[j]+=v/(sourceArea[j]/1000);row[o+4]+=v;row[o+15]+=v;stepInfiltration+=v;maximumSoil[size_t(sourceOwner[j])]=std::max(maximumSoil[size_t(sourceOwner[j])],soil[j]);}for(size_t i=0;i<np;i++)available[i]-=std::min(available[i],pondNeed[i]);maximumFloodInfiltrationStepM3=std::max(maximumFloodInfiltrationStepM3,stepInfiltration);}
   for(size_t i=0;i<np;i++){
    size_t o=size_t(nodeOwner[i])*nf;double load=background[i*12+phase]/steps;available[i]+=load;row[o+1]+=load;
    if(int(i)==lake){double rain=curves[i].wetArea(levels[i])*lakeRain[phase]/steps;available[i]+=rain;row[o+14]+=rain;}
    double depth=int(i)==lake?lakeEvap[phase]/steps:evap*dt,z=curves[i].level(available[i]),after=std::min(available[i],curves[i].volume(std::max(curves[i].z[0],z-depth)));row[o+9]+=available[i]-after;available[i]=after;
   }
   solver.solve(available,seconds,surface,transfer);executed++;
   for(size_t k=0;k<ne;k++){
    const auto& e=edges[k];double v=transfer[k];if(v>=0)periodForward[slot*ne+k]+=v;else periodReverse[slot*ne+k]-=v;size_t a=size_t(nodeOwner[e.a])*nf;
    if(v>=0){forward[k]+=v;if(v>1&&firstForward[k]<0)firstForward[k]=executed*dt;}else{reverse[k]-=v;if(v< -1&&firstReverse[k]<0)firstReverse[k]=executed*dt;}
    if(e.b<0){if(v>=0)row[a+13]+=v;else row[a+12]-=v;}else{size_t b=size_t(nodeOwner[e.b])*nf;if(a!=b){if(v>=0){row[a+11]+=v;row[b+10]+=v;}else{row[a+10]-=v;row[b+11]-=v;}}}
   }
   for(size_t i=0;i<np;i++){levels[i]=curves[i].level(surface[i]);maxStage[i]=std::max(maxStage[i],levels[i]);}
   for(size_t i=0;i<np;i++){periodMin[slot*np+i]=std::min(periodMin[slot*np+i],levels[i]);periodMax[slot*np+i]=std::max(periodMax[slot*np+i],levels[i]);if(!cryoEnabled)traceLevels[(slot*np+i)*steps+step]=levels[i];}
  }
   std::fprintf(stdout,"{\"period\":%d,\"steps\":%d,\"iterations\":%d,\"residualM3\":%.9g}\n",phase+1,steps,solver.maxIterations,solver.maxResidual);std::fflush(stdout);
   if(cryoEnabled){for(size_t j=0;j<ns;j++){size_t q=(slot*ns+j)*3;cryoSource[q]=snow[j];cryoSource[q+1]=cryo.ice[j];cryoSource[q+2]=cryo.soilT[j];}std::copy(cryo.sourceFlux.begin(),cryo.sourceFlux.end(),cryoFlux.begin()+slot*ns*4);for(size_t i=0;i<np;i++){size_t q=(slot*np+i)*3;cryoSurface[q]=cryo.surfaceIce[i];cryoSurface[q+1]=cryo.surfaceFlux[i*2];cryoSurface[q+2]=cryo.surfaceFlux[i*2+1];}}
   auto snapshot=inventory();std::copy(snapshot.begin(),snapshot.end(),periodInventory.begin()+(slot+1)*owners*5);std::copy(levels.begin(),levels.end(),periodLevels.begin()+(slot+1)*np);std::copy(surface.begin(),surface.end(),periodStorage.begin()+(slot+1)*np);
   for(size_t j=0;j<row.size();j++){periodLedger[slot*row.size()+j]=row[j]-previousRow[j];previousRow[j]=row[j];}
   for(size_t o=0;o<size_t(owners);o++){double before=0,after=0;for(size_t k=0;k<5;k++){before+=periodInventory[slot*owners*5+o*5+k];after+=snapshot[o*5+k];}size_t r=slot*owners*nf+o*nf;double incoming=periodLedger[r]+periodLedger[r+1]+periodLedger[r+10]+periodLedger[r+12]+periodLedger[r+14],outgoing=periodLedger[r+2]+periodLedger[r+9]+periodLedger[r+11]+periodLedger[r+13];need(std::abs(before+incoming-outgoing-after)<=std::max(.2,(before+incoming)*2e-10),"Period water balance failure");}
  }
  auto end=inventory();for(size_t o=0;o<size_t(owners);o++){
   double before=0,after=0;for(size_t k=0;k<5;k++){before+=start[o*5+k];after+=end[o*5+k];}size_t r=o*nf,a=(year*owners+o)*na;double incoming=row[r]+row[r+1]+row[r+10]+row[r+12]+row[r+14],outgoing=row[r+2]+row[r+9]+row[r+11]+row[r+13],res=before+incoming-outgoing-after;maxAnnualResidual=std::max(maxAnnualResidual,std::abs(res));maxRelativeAnnualResidual=std::max(maxRelativeAnnualResidual,std::abs(res)/std::max(1.,before+incoming));need(std::abs(res)<=std::max(.2,(before+incoming)*2e-10),"Owner water balance failure "+std::to_string(o)+" residual "+std::to_string(res));
   for(size_t k=0;k<nf;k++){annual[a+k]=row[r+k];totals[r+k]+=row[r+k];}annual[a+nf]=before;annual[a+nf+1]=after;annual[a+nf+2]=res;
  }
  if((year+1)%5==0){std::fprintf(stdout,"{\"year\":%d,\"steps\":%d,\"iterations\":%d,\"equationResidualM3\":%.9g}\n",year+1,steps,solver.maxIterations,solver.maxResidual);std::fflush(stdout);}
 }
 const auto final=inventory();vector<double> finalSource(ns*4),wetArea(np);for(size_t j=0;j<ns;j++){finalSource[j*4]=snow[j];finalSource[j*4+1]=soil[j];finalSource[j*4+2]=ground[j];finalSource[j*4+3]=travel[j];}for(size_t i=0;i<np;i++)wetArea[i]=curves[i].wetArea(levels[i]);
 napi_value out;napi_create_object(env,&out);put(env,out,"initial",initial);put(env,out,"final",final);put(env,out,"totals",totals);put(env,out,"annual",annual);put(env,out,"forward",forward);put(env,out,"reverse",reverse);put(env,out,"firstForward",firstForward);put(env,out,"firstReverse",firstReverse);put(env,out,"surface",surface);put(env,out,"levels",levels);put(env,out,"maxStage",maxStage);put(env,out,"wetArea",wetArea);put(env,out,"finalSource",finalSource);put(env,out,"maximumSoil",maximumSoil);put(env,out,"maximumGround",maximumGround);put(env,out,"periodLevels",periodLevels);put(env,out,"periodStorage",periodStorage);put(env,out,"periodMin",periodMin);put(env,out,"periodMax",periodMax);put(env,out,"traceLevels",traceLevels);putnum(env,out,"partialWetSourceSteps",partialWetSteps);putnum(env,out,"maximumFloodInfiltrationStepM3",maximumFloodInfiltrationStepM3);putnum(env,out,"fluxCount",nf);put(env,out,"periodInventory",periodInventory);put(env,out,"periodLedger",periodLedger);put(env,out,"periodForward",periodForward);put(env,out,"periodReverse",periodReverse);putnum(env,out,"executedSteps",executed);putnum(env,out,"maxIterations",solver.maxIterations);putnum(env,out,"meanRootIterations",double(solver.rootIterations)/solver.roots);putnum(env,out,"maxEquationResidualM3",solver.maxResidual);putnum(env,out,"maxAnnualResidualM3",maxAnnualResidual);putnum(env,out,"maxRelativeAnnualResidual",maxRelativeAnnualResidual);if(cryoEnabled){putnum(env,out,"dryLiquidLimitedExchanges",solver.dryLiquidLimitedExchanges);putnum(env,out,"maximumUnavailableLiquidDemandM3",solver.maximumUnavailableLiquidDemandM3);put(env,out,"ice",cryo.ice);put(env,out,"soilTemperature",cryo.soilT);put(env,out,"surfaceIce",cryo.surfaceIce);put(env,out,"cryoSource",cryoSource);put(env,out,"cryoFlux",cryoFlux);put(env,out,"cryoSurface",cryoSurface);putnum(env,out,"maximumIceSpeedMPerS",cryo.maximumSpeed);putnum(env,out,"limitedIceDonorSteps",cryo.limitedDonorSteps);}
 if(cryoEnabled||!bank.empty()){putnum(env,out,"maxNormalizedPairResidual",solver.maxNormalizedPairResidual);putnum(env,out,"maxPairToleranceM3",solver.maxPairToleranceM3);}return out;
 }catch(const std::exception& e){napi_throw_error(env,nullptr,e.what());return nullptr;}}
static napi_value init(napi_env env,napi_value exports){napi_value f;napi_create_function(env,"run",3,run,nullptr,&f);napi_set_named_property(env,exports,"run",f);napi_create_function(env,"buildCurve",10,buildCurve,nullptr,&f);napi_set_named_property(env,exports,"buildCurve",f);return exports;}
NAPI_MODULE(NODE_GYP_MODULE_NAME,init)
