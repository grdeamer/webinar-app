#include "video-profile.hpp"
#include <cassert>
int main(){
 assert(video_profile::dimensions(1920,1080,"720p","original")==std::make_pair(1280,720));
 assert(video_profile::dimensions(1920,1080,"1080p","4:3")==std::make_pair(1440,1080));
 assert(video_profile::dimensions(640,480,"1080p","original")==std::make_pair(640,480));
 relay::Header h;h.width=8;h.height=4;h.bytes=48;h.time=relay::now();
 std::vector<char> source(48,char(128));for(int y=0;y<4;y++)for(int x=0;x<8;x++)source[y*8+x]=x;
 auto crop=video_profile::render(h,source,4,4,"4:3");assert(crop.size()==24);assert(crop[0]==2);assert(crop[3]==5);
 auto original=video_profile::render(h,source,4,4,"original");assert(original[12]==16); // letterboxing rather than stretching
 h.rotation=90;auto rotated=video_profile::render(h,source,4,4,"4:3");assert(rotated.size()==24);
}
