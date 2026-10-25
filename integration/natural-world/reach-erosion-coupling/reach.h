// Directed finite-volume channels. Optional: absent fields retain the phase51 path.
struct ReachNetwork {
 vector<int> source,next,terminal,owner,order;
 vector<double> length,width,bedUp,bedDown,water,sediment,bedMass,initialBed,pondDeposit;
 vector<double> local,received,released,erosion,deposition,sedIn,sedOut,startWater,startSed,startBed,history;
 double rho=1600,manning=.035,erodibility=1e-5,critical=2,settling=.001,erosionMultiplier=1,maxWaterResidual=0,maxSedimentResidual=0,maxHydraulicResidual=0;
 size_t nr=0;
 void init(napi_env env,napi_value input,size_t ns,size_t np,size_t owners){
  length=array(env,input,"reachLength");nr=length.size();need(nr>0,"Empty reach network");
  width=array(env,input,"reachWidth");bedUp=array(env,input,"reachBedUp");bedDown=array(env,input,"reachBedDown");water=array(env,input,"reachWater");sediment=array(env,input,"reachSediment");bedMass=array(env,input,"reachBedMass");initialBed=array(env,input,"reachInitialBedMass");pondDeposit=array(env,input,"reachPondDeposit");need(pondDeposit.size()==np,"Pond deposit dimensions");
  for(const auto* a:{&width,&bedUp,&bedDown,&water,&sediment,&bedMass,&initialBed})need(a->size()==nr,"Reach dimensions");
  auto ints=[&](const char* name,size_t count,int lo,int hi){auto a=array(env,input,name);need(a.size()==count,"Reach mapping dimensions");vector<int> r;for(double x:a){need(x>=lo&&x<hi&&std::floor(x)==x,"Invalid reach mapping");r.push_back(int(x));}return r;};
  source=ints("sourceReach",ns,-1,nr);next=ints("reachNext",nr,-1,nr);terminal=ints("reachTerminal",nr,-2,np);owner=ints("reachOwner",nr,0,owners);order=ints("reachOrder",nr,0,nr);
  vector<int> position(nr,-1);for(size_t i=0;i<nr;i++){need(position[order[i]]<0,"Duplicate topological index");position[order[i]]=i;}for(size_t i=0;i<nr;i++){need(length[i]>0&&width[i]>0&&water[i]>=0&&sediment[i]>=0&&bedMass[i]>=0&&initialBed[i]>=0,"Invalid reach geometry/state");if(next[i]>=0)need(position[i]<position[next[i]],"Cyclic reach topology");}
  const auto a=prop(env,input,"reachParameters");rho=number(env,a,"bulkDensityKgM3");manning=number(env,a,"manningN");erodibility=number(env,a,"erodibilityMPerPaYear");critical=number(env,a,"criticalShearPa");settling=number(env,a,"settlingMPerS");erosionMultiplier=number(env,a,"erosionMultiplier");need(rho>0&&manning>0&&erodibility>=0&&critical>=0&&settling>=0&&erosionMultiplier>=0,"Invalid sediment parameters");resetFlux();
 }
 double shift(size_t i)const{return (bedMass[i]-initialBed[i])/(rho*width[i]*length[i]);}
 double depth(size_t i)const{return water[i]/(width[i]*length[i]);}
 void resetFlux(){for(auto* a:{&local,&received,&released,&erosion,&deposition,&sedIn,&sedOut})a->assign(nr,0);startWater=water;startSed=sediment;startBed=bedMass;}
 void add(size_t i,double v){need(v>=0&&std::isfinite(v),"Invalid local reach supply");water[i]+=v;local[i]+=v;}
 void step(double seconds,const vector<double>& pondLevel,vector<double>& available,vector<double>& row,size_t nf,const vector<double>& nodeOwner){
  for(int idx:order){size_t i=idx;double before=water[i],area=width[i]*length[i],dz=shift(i),tail=next[i]>=0?bedUp[next[i]]+shift(next[i])+depth(next[i]):terminal[i]>=0?pondLevel[terminal[i]]:terminal[i]==-1?0:INFINITY;tail=std::max(tail,bedDown[i]+dz);const double baseHead=bedUp[i]+dz-tail;
   // Solve mobile excess over the tailwater equilibrium volume. This avoids
   // subtracting near-equal absolute stages inside a very stiff square root.
   const double trapped=baseHead<0?-baseHead*area:0,headOffset=std::max(0.,baseHead),mobile=std::max(0.,before-trapped);
   auto rate=[&](double x){double d=(trapped+x)/area,slope=(headOffset+x/area)/length[i],radius=d>0?width[i]*d/(width[i]+2*d):0;return width[i]*d*std::pow(radius,2./3)*std::sqrt(slope)/manning;};
   double remaining=before;if(mobile>0&&(next[i]>=0||terminal[i]!=-2)&&rate(mobile)>0){double lo=0,hi=mobile,x=mobile/(1+seconds*rate(mobile)/mobile),tol=std::max(1e-9,mobile*2e-13),res=0;bool solved=false;for(int k=0;k<100;k++){double q=rate(x);res=x+seconds*q-mobile;if(std::abs(res)<=tol){solved=true;break;}if(res>0)hi=x;else lo=x;double d=(trapped+x)/area,head=headOffset+x/area,derivative=1;if(q>0&&d>0&&head>0)derivative+=seconds*q*(1/d+2./3*width[i]/(d*(width[i]+2*d))+.5/head)/area;double candidate=x-res/derivative;x=candidate>lo&&candidate<hi?candidate:(lo+hi)/2;}need(solved,"Channel mobile-volume root failed i="+std::to_string(i)+" volume="+std::to_string(mobile)+" residual="+std::to_string(res)+" tol="+std::to_string(tol));maxHydraulicResidual=std::max(maxHydraulicResidual,std::abs(res)/tol);remaining=before-(mobile-x);}
   double out=before-remaining;water[i]=remaining;released[i]+=out;
   double d=remaining/area,slope=std::max(0.,(baseHead+d)/length[i]),shear=1000*9.81*d*slope;
   // Erosion is exactly zero without discharge. Finite active sediment layer.
   double eroded=out>0?std::min(bedMass[i],erosionMultiplier*erodibility*std::max(0.,shear-critical)*seconds/(365*86400)*area*rho):0;
   bedMass[i]-=eroded;sediment[i]+=eroded;erosion[i]+=eroded;
   double settled=before>0?sediment[i]*(-std::expm1(-settling*area*seconds/before)):sediment[i];settled=std::min(sediment[i],settled);sediment[i]-=settled;bedMass[i]+=settled;deposition[i]+=settled;
   double carried=before>0?sediment[i]*(out/before):0;sediment[i]-=carried;sedOut[i]+=carried;
   if(next[i]>=0){size_t j=next[i];water[j]+=out;received[j]+=out;sediment[j]+=carried;sedIn[j]+=carried;if(owner[i]!=owner[j]){row[owner[i]*nf+11]+=out;row[owner[j]*nf+10]+=out;}}
   else if(terminal[i]>=0){size_t j=terminal[i];available[j]+=out;pondDeposit[j]+=carried;if(owner[i]!=int(nodeOwner[j])){row[owner[i]*nf+11]+=out;row[size_t(nodeOwner[j])*nf+10]+=out;}}
   else if(terminal[i]==-1)row[owner[i]*nf+13]+=out;
   need(water[i]>=0&&sediment[i]>=0&&bedMass[i]>=0&&std::isfinite(water[i]+sediment[i]+bedMass[i]),"Invalid routed inventory");
  }
 }
 // Per reach, per period: exact local and upstream supply, storage and solid ledger.
 void snapshot(){for(size_t i=0;i<nr;i++){double wr=startWater[i]+local[i]+received[i]-released[i]-water[i],sr=startSed[i]+startBed[i]+sedIn[i]-sedOut[i]-sediment[i]-bedMass[i];maxWaterResidual=std::max(maxWaterResidual,std::abs(wr)/std::max(1.,startWater[i]+local[i]+received[i]));maxSedimentResidual=std::max(maxSedimentResidual,std::abs(sr)/std::max(1.,startSed[i]+startBed[i]+sedIn[i]));need(std::abs(wr)<=std::max(.001,(startWater[i]+local[i]+received[i])*2e-11),"Reach water budget failed");need(std::abs(sr)<=std::max(.001,(startSed[i]+startBed[i]+sedIn[i])*2e-11),"Reach sediment budget failed");for(double x:{startWater[i],local[i],received[i],released[i],water[i],startSed[i],sedIn[i],erosion[i],deposition[i],sedOut[i],sediment[i],startBed[i],bedMass[i],shift(i)})history.push_back(x);}}
 void output(napi_env env,napi_value out){put(env,out,"reachHistory",history);put(env,out,"reachWater",water);put(env,out,"reachSediment",sediment);put(env,out,"reachBedMass",bedMass);put(env,out,"reachPondDeposit",pondDeposit);putnum(env,out,"maximumReachHydraulicNormalizedResidual",maxHydraulicResidual);putnum(env,out,"maximumReachWaterRelativeResidual",maxWaterResidual);putnum(env,out,"maximumReachSedimentRelativeResidual",maxSedimentResidual);}
};
