#include <algorithm>
#include <cmath>
#include <cstdint>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>
// Binary CLI: u32 count followed by38 f64 per column: T12, mean snow-depth12,
// Q12, active depth, reference area (0 = standing water). Output3*33 f64/column.
int main(int argc,char**argv){try{if(argc!=4)throw std::runtime_error("input output steps required");const int steps=std::stoi(argv[3]);if(steps<1||steps>10000)throw std::runtime_error("bad steps");std::ifstream in(argv[1],std::ios::binary);std::ofstream out(argv[2],std::ios::binary);uint32_t count=0;in.read((char*)&count,4);if(!in||count>1000000)throw std::runtime_error("bad input");const double dt=365.*86400/12/steps;double worst=0;
for(uint32_t i=0;i<count;i++){double a[38];in.read((char*)a,sizeof(a));if(!in)throw std::runtime_error("truncated input");for(double v:a)if(!std::isfinite(v))throw std::runtime_error("nonfinite input");const double depth=a[36],area=a[37],mass=1000*depth,latent=mass*334000,cw=mass*4186,ci=mass*2100;if(depth<0||area<0)throw std::runtime_error("bad geometry");if(depth==0){double zeros[99]={};out.write((char*)zeros,sizeof(zeros));continue;}for(int sc=0;sc<3;sc++){double e=cw*std::max(0.,a[0]),initial=0,heat[4]={0,0,0,0},maxResidual=0,result[33]={};for(int year=0;year<10;year++){if(year==9)initial=e;for(int k=0;k<12;k++){const double ta=a[k],snow=sc==1?0:std::min(.5,.25*a[12+k]),adv=area>0?1000*4186*a[24+k]/area:0,tin=std::max(sc==2?2.:.5,ta);for(int j=0;j<steps;j++){const double maxIce=mass/917,K=917.*334000,B=2+adv*tin;
auto conduct=[&](double ice){return 1/(1./20+ice/2.2+snow/.3*std::min(1.,ice/.05));};
double g=conduct(maxIce),n=e+dt*(g*ta+B),next=(n-dt*g*latent/ci)/(1+dt*g/ci),temp;
if(next>=-latent){double A=-(e+dt*B)/K,D=dt*ta/K,best=-1;for(int branch=0;branch<2;branch++){double lo=branch?.05:0,hi=branch?maxIce:std::min(.05,maxIce),offset=branch?1./20+snow/.3:1./20,slope=branch?1./2.2:1./2.2+snow/(.3*.05);if(hi<lo)continue;double q=offset-slope*A,c=D-offset*A,disc=q*q-4*slope*c;if(disc>=0){double root=(-q+std::sqrt(disc))/(2*slope);if(root>=lo-1e-10&&root<=hi+1e-10&&root>=0)best=std::max(best,std::clamp(root,0.,maxIce));}}
if(best>=0){g=conduct(best);next=-K*best;}else{g=20;next=(e+dt*(g*ta+B))/(1+dt*(g+adv)/cw);if(next< -1e-4)throw std::runtime_error("unresolved phase");next=std::max(0.,next);}}
temp=next>=0?next/cw:next< -latent?(next+latent)/ci:0;
if(year==9){double air=dt*g*(ta-temp),ad=dt*adv*(tin-std::max(0.,temp)),bed=dt*2,res=next-e-air-ad-bed;heat[0]+=air;heat[1]+=ad;heat[2]+=bed;maxResidual=std::max(maxResidual,std::abs(res));}e=next;}
if(year==9){result[k]=std::clamp(-e/latent,0.,1.)*mass/917;result[12+k]=e>=0?e/cw:e< -latent?(e+latent)/ci:0;}}}
result[24]=initial;result[25]=e;for(int h=0;h<4;h++)result[26+h]=heat[h];result[30]=e-initial-heat[0]-heat[1]-heat[2]-heat[3];result[31]=maxResidual;result[32]=e-initial;for(double v:result)if(!std::isfinite(v))throw std::runtime_error("nonfinite result");worst=std::max(worst,std::abs(result[30]));out.write((char*)result,sizeof(result));}}
if(in.peek()!=std::char_traits<char>::eof())throw std::runtime_error("extra input");if(!out)throw std::runtime_error("output failure");std::cout<<"columns="<<count<<" cases=3 steps="<<steps<<" maximumAnnualResidualJm2="<<worst<<"\n";
}catch(const std::exception&e){std::cerr<<e.what()<<"\n";return 1;}}
