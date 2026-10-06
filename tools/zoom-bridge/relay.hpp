#pragma once
// Same-host, ephemeral media bus. Never stores meeting media on persistent disk.
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <chrono>
#include <cstdint>
#include <cstring>
#include <fstream>
#include <vector>
#include <string>
#include <filesystem>
#include <algorithm>
namespace relay {
inline uint64_t now(){return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now().time_since_epoch()).count();}
struct Header {uint32_t magic=0x4a494f31,width=0,height=0,rotation=0,bytes=0,rate=0,channels=0,reserved=0;uint64_t time=0;};
inline bool validVideo(const Header& h){return h.magic==0x4a494f31&&h.width>=2&&h.height>=2&&h.width<=1920&&h.height<=1080&&!(h.width%2)&&!(h.height%2)&&h.bytes==h.width*h.height*3/2&&(h.rotation==0||h.rotation==90||h.rotation==180||h.rotation==270);}
inline bool fresh(const Header& h){auto n=now();return n>=h.time&&n-h.time<2000;}
inline bool writeVideo(const std::string& root,Header h,const char* y,const char* u,const char* v){
 if(!validVideo(h)||!y||!u||!v)return false;
 auto tmp=root+"/video.tmp";std::ofstream out(tmp,std::ios::binary|std::ios::trunc);chmod(tmp.c_str(),0600);
 out.write(reinterpret_cast<char*>(&h),sizeof(h));out.write(y,h.width*h.height);out.write(u,h.width*h.height/4);out.write(v,h.width*h.height/4);out.close();
 return out.good()&&rename(tmp.c_str(),(root+"/video.i420").c_str())==0;
}
inline bool readVideo(const std::string& root,Header& h,std::vector<char>& data){
 std::ifstream in(root+"/video.i420",std::ios::binary);if(!in.read(reinterpret_cast<char*>(&h),sizeof(h))||!validVideo(h)||!fresh(h))return false;
 data.resize(h.bytes);return bool(in.read(data.data(),h.bytes));
}
inline void scalePlane(const unsigned char* src,int sw,int sh,int rotation,unsigned char* dst,int dw,int dh,int x0,int y0,int rw,int rh){
 int ow=(rotation==90||rotation==270)?sh:sw,oh=(rotation==90||rotation==270)?sw:sh;
 for(int y=0;y<rh;y++)for(int x=0;x<rw;x++){int ox=x*ow/rw,oy=y*oh/rh,sx=ox,sy=oy;
 if(rotation==90){sx=oy;sy=sh-1-ox;}else if(rotation==180){sx=sw-1-ox;sy=sh-1-oy;}else if(rotation==270){sx=sw-1-oy;sy=ox;}
 if(sx>=0&&sx<sw&&sy>=0&&sy<sh&&x+x0<dw&&y+y0<dh)dst[(y+y0)*dw+x+x0]=src[sy*sw+sx];}
}
inline std::vector<char> fit(const Header& h,const std::vector<char>& src,int w,int height){
 std::vector<char> out(w*height*3/2, char(128));std::fill(out.begin(),out.begin()+w*height,char(16));
 int ow=(h.rotation==90||h.rotation==270)?h.height:h.width,oh=(h.rotation==90||h.rotation==270)?h.width:h.height;
 double scale=std::min(double(w)/ow,double(height)/oh);int rw=std::max(2,int(ow*scale)&~1),rh=std::max(2,int(oh*scale)&~1);int x=((w-rw)/2)&~1,y=((height-rh)/2)&~1;
 auto* s=reinterpret_cast<const unsigned char*>(src.data());auto* d=reinterpret_cast<unsigned char*>(out.data());
 scalePlane(s,h.width,h.height,h.rotation,d,w,height,x,y,rw,rh);
 scalePlane(s+h.width*h.height,h.width/2,h.height/2,h.rotation,d+w*height,w/2,height/2,x/2,y/2,rw/2,rh/2);
 scalePlane(s+h.width*h.height*5/4,h.width/2,h.height/2,h.rotation,d+w*height*5/4,w/2,height/2,x/2,y/2,rw/2,rh/2);return out;
}
struct Frame {Header header;std::vector<char> data;};
inline std::vector<char> compose(const std::vector<Frame>& tiles,int width,int height){
 std::vector<char> out(width*height*3/2,char(128));std::fill(out.begin(),out.begin()+width*height,char(16));
 if(tiles.empty())return out;
 int cols=tiles.size()==1?1:tiles.size()<=4?2:3,rows=(tiles.size()+cols-1)/cols;
 int tw=(width/cols)&~1,th=(height/rows)&~1;
 for(size_t i=0;i<tiles.size();i++){
  const auto& tile=tiles[i];if(!validVideo(tile.header)||!fresh(tile.header)||tile.data.size()!=tile.header.bytes)continue;
  auto fitted=fit(tile.header,tile.data,tw,th);int x=(i%cols)*tw,y=(i/cols)*th;
  for(int p=0;p<3;p++){int div=p?2:1,sw=tw/div,sh=th/div,dw=width/div;
   size_t so=p==0?0:p==1?tw*th:tw*th*5/4, dest=p==0?0:p==1?width*height:width*height*5/4;
   for(int row=0;row<sh;row++)memcpy(out.data()+dest+(y/div+row)*dw+x/div,fitted.data()+so+row*sw,sw);
  }
 }
 return out;
}
inline int audioSocket(const std::string& path){int fd=socket(AF_UNIX,SOCK_DGRAM|SOCK_NONBLOCK|SOCK_CLOEXEC,0);if(fd<0)return -1;sockaddr_un a{};a.sun_family=AF_UNIX;if(path.size()>=sizeof(a.sun_path)){close(fd);return -1;}strcpy(a.sun_path,path.c_str());unlink(path.c_str());if(bind(fd,reinterpret_cast<sockaddr*>(&a),sizeof(a))){close(fd);return -1;}chmod(path.c_str(),0600);return fd;}
inline void broadcastAudio(int fd,const std::string& root,Header h,const char* data){
 if(fd<0||!data||h.bytes>24000)return;std::vector<char> packet(sizeof(h)+h.bytes);memcpy(packet.data(),&h,sizeof(h));memcpy(packet.data()+sizeof(h),data,h.bytes);
 std::error_code ec;for(auto& entry:std::filesystem::directory_iterator(root,ec)){if(entry.path().extension()!=".sock")continue;sockaddr_un a{};a.sun_family=AF_UNIX;auto p=entry.path().string();if(p.size()>=sizeof(a.sun_path))continue;strcpy(a.sun_path,p.c_str());sendto(fd,packet.data(),packet.size(),MSG_DONTWAIT|MSG_NOSIGNAL,reinterpret_cast<sockaddr*>(&a),sizeof(a));}
}
}
