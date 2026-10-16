#pragma once
#include "relay.hpp"
#include <utility>
namespace video_profile {
inline std::pair<int,int> dimensions(int sw,int sh,const std::string& quality,const std::string& aspect){
 int maxH=quality=="720p"?720:1080,maxW=quality=="720p"?1280:1920;
 double ratio=aspect=="4:3"?4.0/3:aspect=="16:9"?16.0/9:double(sw)/sh;
 // Never invent detail by upscaling the source.
 int h=std::min({maxH,sh,int(sw/ratio)});h=std::max(2,h&~1);
 int w=std::max(2,int(h*ratio)&~1);
 if(w>maxW){w=maxW;h=std::max(2,int(w/ratio)&~1);}
 return {w,h};
}
inline std::vector<char> render(const relay::Header& input,const std::vector<char>& pixels,int w,int h,const std::string& aspect){
 if(aspect=="original"){if(!input.rotation&&input.width==unsigned(w)&&input.height==unsigned(h))return pixels;return relay::fit(input,pixels,w,h); }
 int sw=(input.rotation==90||input.rotation==270)?input.height:input.width;
 int sh=(input.rotation==90||input.rotation==270)?input.width:input.height;
 auto rotated=relay::fit(input,pixels,sw,sh);
 double ratio=aspect=="4:3"?4.0/3:16.0/9;
 int cw=sw,ch=sh;
 if(double(sw)/sh>ratio)cw=std::max(2,int(sh*ratio)&~1);else ch=std::max(2,int(sw/ratio)&~1);
 int x=((sw-cw)/2)&~1,y=((sh-ch)/2)&~1;
 std::vector<char> crop(cw*ch*3/2);
 for(int p=0;p<3;p++){
  int div=p?2:1;size_t so=p==0?0:p==1?sw*sh:sw*sh*5/4, dst=p==0?0:p==1?cw*ch:cw*ch*5/4;
  for(int row=0;row<ch/div;row++)memcpy(crop.data()+dst+row*cw/div,rotated.data()+so+(y/div+row)*sw/div+x/div,cw/div);
 }
 relay::Header header;header.width=cw;header.height=ch;header.bytes=crop.size();header.time=input.time;
 return relay::fit(header,crop,w,h);
}
}
