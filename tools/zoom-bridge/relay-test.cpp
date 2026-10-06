#include "relay.hpp"
#include <cassert>
#include <iostream>
int main(){
 char root[]="/dev/shm/jupiter-io-test-XXXXXX";assert(mkdtemp(root));
 relay::Header h;h.width=4;h.height=2;h.bytes=12;h.time=relay::now();
 const char y[8]={20,40,60,80,100,120,char(140),char(160)},u[2]={char(128),char(128)},v[2]={char(128),char(128)};
 assert(relay::writeVideo(root,h,y,u,v));relay::Header loaded;std::vector<char> data;assert(relay::readVideo(root,loaded,data));assert(data.size()==12);
 auto output=relay::fit(loaded,data,4,2);assert(output==data);
 h.rotation=180;auto rotated=relay::fit(h,data,4,2);assert(rotated[0]==y[7]&&rotated[7]==y[0]);
 h.rotation=90;auto portrait=relay::fit(h,data,2,4);assert(portrait[0]==y[4]&&portrait[1]==y[0]);
 h.rotation=0;auto letterbox=relay::fit(h,data,8,8);assert(static_cast<unsigned char>(letterbox[0])==16);
 relay::Frame left{h,std::vector<char>(12,char(32))},right{h,std::vector<char>(12,char(200))};
 auto grid=relay::compose({left,right},8,2);assert(static_cast<unsigned char>(grid[0])==32);assert(static_cast<unsigned char>(grid[4])==200);
 right.header.time=relay::now()-3000;grid=relay::compose({left,right},8,2);assert(static_cast<unsigned char>(grid[4])==16);
 grid=relay::compose({left},4,2);assert(static_cast<unsigned char>(grid[0])==32);
 std::vector<relay::Frame> nine;
 for(int i=0;i<9;i++){relay::Frame t=left;t.data.assign(12,char(30+i*20));nine.push_back(t);}
 grid=relay::compose(nine,12,12);
 for(int i=0;i<9;i++){int x=(i%3)*4+1,y=(i/3)*4+1;assert(static_cast<unsigned char>(grid[y*12+x])==30+i*20);}
 h.time=relay::now()-3000;assert(relay::writeVideo(root,h,y,u,v));assert(!relay::readVideo(root,loaded,data));
 h.width=1922;assert(!relay::validVideo(h));h.width=4;h.rotation=13;assert(!relay::validVideo(h));
 auto path=std::string(root)+"/test.sock";int consumer=relay::audioSocket(path),producer=socket(AF_UNIX,SOCK_DGRAM|SOCK_NONBLOCK,0);assert(consumer>=0&&producer>=0);
 relay::Header a;a.bytes=8;a.rate=32000;a.channels=1;a.time=relay::now();relay::broadcastAudio(producer,root,a,y);char packet[128];assert(recv(consumer,packet,sizeof(packet),0)==sizeof(a)+8);assert(memcmp(packet+sizeof(a),y,8)==0);
 close(consumer);close(producer);std::filesystem::remove_all(root);std::cout<<"Relay validation, stale source rejection, rotation, letterbox, audio fanout, two-camera composition and stale tile blanking: PASS\n";
}
