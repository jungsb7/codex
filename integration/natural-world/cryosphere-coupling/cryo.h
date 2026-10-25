// Optional phase51 conservative solid-water state. Units are water equivalent.
struct Cryo {
 vector<double> ice,soilT,frost,surfaceIce,nodeT,ea,eb,length,faceWidth;
 vector<double> sourceFlux,surfaceFlux,pending,outgoing,scale;
 double threshold,tau,iceMelt,freezeRate,meltRate,thermalTau,tempRange,minPermeability,minHydraulic,density,A,maxFraction,motion;
 double maximumSpeed=0;size_t limitedDonorSteps=0;
 void init(napi_env env,napi_value input,size_t ns,size_t np){
  auto p=prop(env,input,"cryoParameters");threshold=number(env,p,"compactionThresholdMm");tau=number(env,p,"compactionYears");iceMelt=number(env,p,"iceMeltMmPerDegreeDay");freezeRate=number(env,p,"surfaceFreezeMmPerDegreeDay");meltRate=number(env,p,"surfaceMeltMmPerDegreeDay");thermalTau=number(env,p,"soilThermalYears");tempRange=number(env,p,"frozenTemperatureRangeC");minPermeability=number(env,p,"minimumPermeabilityFraction");minHydraulic=number(env,p,"minimumHydraulicCoefficientFraction");density=number(env,p,"iceDensityKgM3");A=number(env,p,"glenRatePaMinus3SMinus1");maxFraction=number(env,p,"maximumIceDonorFractionPerStep");motion=number(env,p,"motionMultiplier");
  need(threshold>=0&&tau>0&&iceMelt>=0&&freezeRate>=0&&meltRate>=0&&thermalTau>0&&tempRange>0&&minPermeability>0&&minPermeability<=1&&minHydraulic>0&&minHydraulic<=1&&density>0&&density<=1000&&A>=0&&maxFraction>0&&maxFraction<=1&&(motion==0||motion==1),"Invalid cryosphere parameters");
  ice=array(env,input,"ice");soilT=array(env,input,"soilTemperature");surfaceIce=array(env,input,"surfaceIce");nodeT=array(env,input,"nodeTemperature");ea=array(env,input,"iceEdgeA");eb=array(env,input,"iceEdgeB");length=array(env,input,"iceEdgeLength");faceWidth=array(env,input,"iceEdgeWidth");
  need(ice.size()==ns&&soilT.size()==ns&&surfaceIce.size()==np&&nodeT.size()==np*12&&ea.size()==eb.size()&&ea.size()==length.size()&&ea.size()==faceWidth.size(),"Invalid cryosphere dimensions");
  for(const auto* v:{&ice,&surfaceIce})for(double x:*v)need(std::isfinite(x)&&x>=0,"Invalid ice state");for(const auto* v:{&soilT,&nodeT})for(double x:*v)need(std::isfinite(x),"Invalid thermal state");
  for(size_t k=0;k<ea.size();k++)need(ea[k]>=0&&ea[k]<ns&&std::floor(ea[k])==ea[k]&&eb[k]>=0&&eb[k]<ns&&std::floor(eb[k])==eb[k]&&ea[k]!=eb[k]&&std::isfinite(length[k])&&length[k]>0&&std::isfinite(faceWidth[k])&&faceWidth[k]>0,"Invalid ice face");
  frost.resize(ns);sourceFlux.resize(ns*4);surfaceFlux.resize(np*2);pending.resize(ea.size());outgoing.resize(ns);scale.resize(ns);
 }
 void resetFlux(){std::fill(sourceFlux.begin(),sourceFlux.end(),0);std::fill(surfaceFlux.begin(),surfaceFlux.end(),0);}
 double permeability(size_t j)const{return 1-(1-minPermeability)*frost[j];}
 void thermalStep(int phase,double dt,const vector<double>& t,vector<Curve>& curves,vector<double>& water,vector<Edge>& edges,const vector<double>& baseCoefficient){
  const size_t ns=ice.size();double relax=-std::expm1(-dt/thermalTau),days=dt*365;
  for(size_t j=0;j<ns;j++){soilT[j]+=(t[phase*ns+j]-soilT[j])*relax;frost[j]=std::clamp(-soilT[j]/tempRange,0.,1.);}
  for(size_t i=0;i<water.size();i++){double temp=nodeT[i*12+phase],area=curves[i].wetArea(curves[i].level(water[i]));double freeze=std::min(water[i],area*std::max(0.,-temp)*freezeRate*days/1000),melt=std::min(surfaceIce[i],area*std::max(0.,temp)*meltRate*days/1000);water[i]+=melt-freeze;surfaceIce[i]+=freeze-melt;surfaceFlux[i*2]+=freeze;surfaceFlux[i*2+1]+=melt;curves[i].frozen=surfaceIce[i];need(water[i]>=0&&surfaceIce[i]>=0,"Negative phase-change storage");}
  auto fraction=[&](size_t i){double total=water[i]+surfaceIce[i];return total>0?surfaceIce[i]/total:0;};
  for(size_t k=0;k<edges.size();k++){auto& e=edges[k];double f=(fraction(e.a)+(e.b<0?0:fraction(e.b)))/2;e.coefficient=baseCoefficient[k]*(1-(1-minHydraulic)*f);}
 }
 double sourceStep(size_t j,double& snow,double prec,double temp,double pet,bool north,double dt,double area){
  double compact=std::max(0.,snow-threshold)*(-std::expm1(-dt/tau));snow-=compact;ice[j]+=compact;sourceFlux[j*4]+=compact*area/1000;
  double sf=north?std::clamp((1-temp)/2,0.,1.):temp<0?1:0,available=snow+prec*sf;
  if(north)available-=std::min(available,(3+pet*.05)*12*dt);
  double budget=std::max(0.,temp)*(north?3*365:540)*dt,exposed=budget>0?std::max(0.,1-available/budget):0;
  double melt=std::min(ice[j],std::max(0.,temp)*iceMelt*365*dt*exposed);ice[j]-=melt;sourceFlux[j*4+1]+=melt*area/1000;return melt;
 }
 void move(double dt,const vector<double>& area,const vector<double>& bed,const vector<double>& owners,vector<double>& row,size_t nf){
  if(motion==0)return;
  std::fill(outgoing.begin(),outgoing.end(),0);double seconds=dt*365*86400;
  for(size_t k=0;k<ea.size();k++){
   size_t a=ea[k],b=eb[k];double ha=ice[a]/density,hb=ice[b]/density,slope=(bed[a]+ha-bed[b]-hb)/length[k];size_t donor=slope>=0?a:b;double H=slope>=0?ha:hb;
   if(H==0||slope==0){pending[k]=0;continue;}
   double speed=2*A/5*std::pow(density*9.81,3)*std::pow(H,4)*std::pow(std::abs(slope),3);need(std::isfinite(speed),"Nonfinite shallow-ice speed");maximumSpeed=std::max(maximumSpeed,speed);double volume=speed*H*faceWidth[k]*seconds*density/1000;need(std::isfinite(volume),"Nonfinite ice flux");pending[k]=slope>=0?volume:-volume;outgoing[donor]+=volume;
  }
  for(size_t j=0;j<ice.size();j++){double available=ice[j]*area[j]/1000;scale[j]=outgoing[j]>0?std::min(1.,available*maxFraction/outgoing[j]):1;if(scale[j]<1)limitedDonorSteps++;}
  for(size_t k=0;k<ea.size();k++){size_t a=ea[k],b=eb[k],d=pending[k]>=0?a:b,r=d==a?b:a;double v=std::abs(pending[k])*scale[d];if(v==0)continue;ice[d]-=v*1000/area[d];ice[r]+=v*1000/area[r];sourceFlux[d*4+3]+=v;sourceFlux[r*4+2]+=v;if(owners[d]!=owners[r]){row[size_t(owners[d])*nf+11]+=v;row[size_t(owners[r])*nf+10]+=v;}}
  for(double v:ice)need(std::isfinite(v)&&v>=0,"Negative transported ice");
 }
};
