#include <zoom_sdk.h>
#include <auth_service_interface.h>
#include <setting_service_interface.h>
#include <meeting_service_interface.h>
#include <glib.h>
#include <glib-unix.h>
#include <rawdata/zoom_rawdata_api.h>
#include <rawdata/rawdata_video_source_helper_interface.h>
#include <rawdata/rawdata_audio_helper_interface.h>
#include <rawdata/rawdata_share_source_helper_interface.h>
#include <meeting_service_components/meeting_sharing_interface.h>
#include <meeting_service_components/meeting_video_interface.h>
#include <meeting_service_components/meeting_audio_interface.h>
#include <meeting_service_components/meeting_participants_ctrl_interface.h>
#include <cairo/cairo.h>
#include <rawdata/rawdata_renderer_interface.h>
#include <meeting_service_components/meeting_recording_interface.h>
#include <zoom_sdk_raw_data_def.h>
#include "relay.hpp"
#include <atomic>
#include <mutex>
#include <map>
#include <memory>
#include <chrono>
#include <ctime>
#include <cstdio>
#include <fstream>
#include <vector>
#include <cmath>
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <string>
using namespace ZOOMSDK;
GMainLoop* loop;
IMeetingService* meeting=nullptr;ISettingService* settings=nullptr;
std::string token, number, password, name;
int result=0;
bool sourceMode=false;std::string relayRoot;int audioFD=-1;std::string audioPath;
bool shareMode=false;
bool originalSound=false;
std::atomic<uint64_t> relayVideoTime{0},relayAudioTime{0};
std::string workerStatus="starting", appliedRevision="", controlError="";bool mediaReady=false;
void fail(int code) { result=code?code:1; g_main_loop_quit(loop); }
struct Pattern: IZoomSDKVideoSource {
 IZoomSDKVideoSender* sender=nullptr;bool active=false;int width=640,height=360;unsigned frames=0;
 void cap(VideoSourceCapability c){if(c.width&&c.height&&c.width<=1920&&c.height<=1080){width=c.width&~1u;height=c.height&~1u;std::cout<<"Negotiated satellite video="<<width<<"x"<<height<<std::endl;}}
 void onInitialize(IZoomSDKVideoSender* p,IList<VideoSourceCapability>* caps,VideoSourceCapability& c) override {sender=p;
  if(caps)for(int i=0;i<caps->GetCount();i++){auto candidate=caps->GetItem(i);if(candidate.width<=1280&&candidate.height<=720&&candidate.width*candidate.height>c.width*c.height)c=candidate;}cap(c);std::cout<<"Video initialized"<<std::endl;}
 void onPropertyChange(IList<VideoSourceCapability>*,VideoSourceCapability c) override {cap(c);}
 void onStartSend() override {active=true;std::cout<<"Video sender started"<<std::endl;}
 void onStopSend() override {active=false;}
 void onUninitialized() override {active=false;sender=nullptr;}
 void tick(){
  if(!active||!sender)return;
  if(!relayRoot.empty()) {
   relay::Header h;std::vector<char> input;
   if(relay::readVideo(relayRoot,h,input)){auto f=relay::fit(h,input,width,height);sender->sendVideoFrame(f.data(),width,height,f.size(),0);relayVideoTime=h.time;return;}
   // A disconnected/missing source never falls back to the countdown.
   std::vector<char> blank(width*height*3/2,char(128));std::fill(blank.begin(),blank.begin()+width*height,char(16));
   sender->sendVideoFrame(blank.data(),width,height,blank.size(),0);return;
  }
  std::vector<char> f(width*height*3/2);auto* b=reinterpret_cast<unsigned char*>(f.data());
  auto ms=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
  auto frame=ms*15/1000; auto quantized=frame*1000/15;
  auto remain=60000-quantized%60000;
  time_t seconds=quantized/1000;tm utc{};gmtime_r(&seconds,&utc);
  char timestamp[80], countdown[40], frameText[80];
  std::snprintf(timestamp,sizeof(timestamp),"UTC %02d:%02d:%02d.%03lld",utc.tm_hour,utc.tm_min,utc.tm_sec,(long long)(quantized%1000));
  std::snprintf(countdown,sizeof(countdown),"%02lld.%03lld",(long long)(remain/1000),(long long)(remain%1000));
  std::snprintf(frameText,sizeof(frameText),"FRAME %lld  |  15 FPS",(long long)frame);
  auto* surface=cairo_image_surface_create(CAIRO_FORMAT_ARGB32,width,height);auto* cr=cairo_create(surface);
  cairo_set_source_rgb(cr,0.04,0.04,0.04);cairo_paint(cr);
  cairo_select_font_face(cr,"DejaVu Sans Mono",CAIRO_FONT_SLANT_NORMAL,CAIRO_FONT_WEIGHT_BOLD);
  auto text=[&](const char* value,double y,double size){cairo_set_font_size(cr,size);cairo_text_extents_t ext;cairo_text_extents(cr,value,&ext);cairo_move_to(cr,(width-ext.width)/2-ext.x_bearing,y);cairo_show_text(cr,value);};
  cairo_set_source_rgb(cr,1,1,1);text("JUPITER SYNC TEST",height*.14,width*.043);
  text("SECONDS TO NEXT UTC MINUTE",height*.27,width*.028);
  text(countdown,height*.53,width*.15);
  text(timestamp,height*.69,width*.043);text(frameText,height*.81,width*.025);
  cairo_rectangle(cr,width*.08,height*.89,width*.84*(1.0-remain/60000.0),height*.035);cairo_fill(cr);
  cairo_surface_flush(surface);auto* pixels=cairo_image_surface_get_data(surface);int stride=cairo_image_surface_get_stride(surface);
  for(int y=0;y<height;y++)for(int x=0;x<width;x++)b[y*width+x]=16+(pixels[y*stride+x*4]*219/255);
  std::fill(b+width*height,b+f.size(),128);
  cairo_destroy(cr);cairo_surface_destroy(surface);
  auto e=sender->sendVideoFrame(f.data(),width,height,f.size(),0);
  if(frames++%150==0)std::cout<<"Video frames="<<frames<<" send result="<<e<<" size="<<width<<"x"<<height<<std::endl;
 }
} pattern;
struct Tone: IZoomSDKVirtualAudioMicEvent {
 IZoomSDKAudioRawDataSender* sender=nullptr;bool active=false;uint64_t samples=0;unsigned blocks=0;
 void onMicInitialize(IZoomSDKAudioRawDataSender* p) override {sender=p;std::cout<<"Audio initialized"<<std::endl;}
 void onMicStartSend() override {active=true;std::cout<<"Audio sender started"<<std::endl;}
 void onMicStopSend() override {active=false;}
 void onMicUninitialized() override {active=false;sender=nullptr;}
 void relayTick(){if(!active||!sender||audioFD<0)return;char packet[24576];
  for(int i=0;i<12;i++){auto n=recv(audioFD,packet,sizeof(packet),MSG_DONTWAIT);if(n<0)break;if(n<ssize_t(sizeof(relay::Header)))continue;relay::Header h;memcpy(&h,packet,sizeof(h));
   if(h.magic!=0x4a494f31||!relay::fresh(h)||h.bytes!=n-sizeof(h)||h.channels<1||h.channels>2||(h.rate!=8000&&h.rate!=16000&&h.rate!=32000&&h.rate!=44100&&h.rate!=48000)||h.bytes%(2*h.channels))continue;
   auto e=sender->send(packet+sizeof(h),h.bytes,h.rate,h.channels==2?ZoomSDKAudioChannel_Stereo:ZoomSDKAudioChannel_Mono);if(e==SDKERR_SUCCESS)relayAudioTime=h.time;
  }
 }
 void tick(){if(!active||!sender||!relayRoot.empty())return;int16_t b[640];for(auto& v:b){bool beep=(samples%64000)<8000;v=beep?static_cast<int16_t>(1000*std::sin(6.283185307179586*440*samples/32000.0)):0;++samples;}auto e=sender->send(reinterpret_cast<char*>(b),sizeof(b),32000,ZoomSDKAudioChannel_Mono);if(blocks++%500==0)std::cout<<"Audio blocks="<<blocks<<" send result="<<e<<std::endl;}
} tone;
struct Receiver: IZoomSDKAudioRawDataDelegate {
 std::mutex frameMutex;
 struct Tile: IZoomSDKRendererDelegate {
  Receiver* owner;unsigned id;IZoomSDKRenderer* renderer=nullptr;bool active=true;relay::Frame frame;
  Tile(Receiver* r,unsigned user):owner(r),id(user){}
  void onRendererBeDestroyed() override {std::lock_guard<std::mutex> lock(owner->frameMutex);renderer=nullptr;frame={};}
  void onRawDataStatusChanged(RawDataStatus status) override {if(status==RawData_Off){std::lock_guard<std::mutex> lock(owner->frameMutex);frame={};}}
  void onRawDataFrameReceived(YUVRawDataI420* data) override {
   std::lock_guard<std::mutex> lock(owner->frameMutex);if(!active||!data)return;
   relay::Header h;h.width=data->GetStreamWidth();h.height=data->GetStreamHeight();h.rotation=data->GetRotation();h.bytes=h.width*h.height*3/2;h.time=relay::now();
   if(!relay::validVideo(h)||!data->GetYBuffer()||!data->GetUBuffer()||!data->GetVBuffer())return;
   if(frame.header.width!=h.width||frame.header.height!=h.height)std::cout<<"Source camera "<<id<<" received="<<h.width<<"x"<<h.height<<std::endl;
   frame.header=h;frame.data.resize(h.bytes);memcpy(frame.data.data(),data->GetYBuffer(),h.width*h.height);memcpy(frame.data.data()+h.width*h.height,data->GetUBuffer(),h.width*h.height/4);memcpy(frame.data.data()+h.width*h.height*5/4,data->GetVBuffer(),h.width*h.height/4);++owner->frames;
  }
 };
 std::map<unsigned,std::unique_ptr<Tile>> tiles;std::vector<std::unique_ptr<Tile>> retired;std::vector<unsigned> order;
 bool recording=false,audioSubscribed=false,asked=false;
 std::atomic<uint64_t> videoTime{0},audioTime{0},frames{0},blocks{0};
 std::string presenter="";unsigned spotlightCount=0;int socketFD=-1;
 void clearVideo(){std::lock_guard<std::mutex> lock(frameMutex);unlink((relayRoot+"/video.i420").c_str());videoTime=0;}
 void removeTile(unsigned id){
  auto found=tiles.find(id);if(found==tiles.end())return;auto* tile=found->second.get();
  {std::lock_guard<std::mutex> lock(frameMutex);tile->active=false;tile->frame={};}
  if(tile->renderer){tile->renderer->unSubscribe();destroyRenderer(tile->renderer);tile->renderer=nullptr;}
  retired.push_back(std::move(found->second));tiles.erase(found);
 }
 void clearTiles(){while(!tiles.empty())removeTile(tiles.begin()->first);order.clear();clearVideo();}
 void compose(){
  std::lock_guard<std::mutex> lock(frameMutex);std::vector<relay::Frame> images;bool receiving=false;
  for(auto id:order){auto found=tiles.find(id);if(found==tiles.end()){images.push_back({});continue;}const auto& f=found->second->frame;images.push_back(f);if(relay::validVideo(f.header)&&relay::fresh(f.header))receiving=true;}
  if(!receiving){unlink((relayRoot+"/video.i420").c_str());videoTime=0;return;}
  auto data=relay::compose(images,1280,720);relay::Header h;h.width=1280;h.height=720;h.bytes=data.size();h.time=relay::now();
  if(relay::writeVideo(relayRoot,h,data.data(),data.data()+1280*720,data.data()+1280*720*5/4))videoTime=h.time;
 }
 void onMixedAudioRawDataReceived(AudioRawData* data) override {
  if(!data)return;relay::Header h;h.bytes=data->GetBufferLen();h.rate=data->GetSampleRate();h.channels=data->GetChannelNum();h.time=relay::now();
  if(h.channels<1||h.channels>2||h.bytes==0||h.bytes>24000)return;
  relay::broadcastAudio(socketFD,relayRoot,h,data->GetBuffer());audioTime=h.time;++blocks;
 }
 void onOneWayAudioRawDataReceived(AudioRawData*,uint32_t) override {}
 void onShareAudioRawDataReceived(AudioRawData*,uint32_t) override {}
 void onOneWayInterpreterAudioRawDataReceived(AudioRawData*,const zchar_t*) override {}
 void tick(){
  auto* pc=meeting->GetMeetingParticipantsController();auto* me=pc?pc->GetMySelfUser():nullptr;
  if(!me||workerStatus=="waiting"||workerStatus=="waiting for host"||workerStatus=="reconnecting")return;
  auto* ac=meeting->GetMeetingAudioController();auto* vc=meeting->GetMeetingVideoController();
  if(ac&&!me->IsAudioMuted())ac->MuteAudio(me->GetUserID());if(vc&&me->IsVideoOn())vc->MuteVideo();
  auto* rc=meeting->GetMeetingRecordingController();auto* ah=GetAudioRawdataHelper();
  if(!rc||rc->CanStartRawRecording()!=SDKERR_SUCCESS){
   if(recording){clearTiles();if(ah&&audioSubscribed)ah->unSubscribe();audioSubscribed=false;if(rc)rc->StopRawRecording();recording=false;clearVideo();audioTime=0;}
   workerStatus="permission required";controlError="Grant Jupiter Io Source local recording permission.";
   if(rc&&!asked){rc->RequestLocalRecordingPrivilege();asked=true;}return;
  }
  if(!recording){auto e=rc->StartRawRecording();if(e){workerStatus="permission required";controlError="Raw media start failed:"+std::to_string(e);return;}recording=true;}
  if(ah&&!audioSubscribed){auto e=ah->subscribe(this);audioSubscribed=e==SDKERR_SUCCESS;if(e)controlError="Audio subscription failed:"+std::to_string(e);}
  auto* users=vc?vc->GetSpotlightedUserList():nullptr;std::vector<unsigned> targets;presenter="";
  if(users)for(int i=0;i<users->GetCount()&&targets.size()<9;i++){auto id=users->GetItem(i);auto* user=pc->GetUserByUserID(id);if(user&&!user->IsMySelf()&&!user->IsInWaitingRoom()){targets.push_back(id);if(!presenter.empty())presenter+=" + ";presenter+=user->GetUserName()?user->GetUserName():"Presenter";}}
  spotlightCount=targets.size();
  if(targets.empty()){presenter="";clearTiles();workerStatus="waiting for spotlight";controlError="Spotlight a presenter in the source meeting.";return;}
  for(auto it=tiles.begin();it!=tiles.end();){auto id=it->first;++it;if(std::find(targets.begin(),targets.end(),id)==targets.end())removeTile(id);}
  bool changed=order!=targets;order=targets;if(changed)clearVideo();
  bool anyCamera=false;controlError="";
  for(auto id:targets){
   auto* user=pc->GetUserByUserID(id);
   if(!user||!user->IsVideoOn()){removeTile(id);continue;}anyCamera=true;
   auto found=tiles.find(id);
   if(found==tiles.end()||!found->second->renderer){
    removeTile(id);auto tile=std::make_unique<Tile>(this,id);auto* delegate=tile.get();tiles[id]=std::move(tile);
    auto e=createRenderer(&delegate->renderer,delegate);if(!e){delegate->renderer->setRawDataResolution(ZoomSDKResolution_720P);e=delegate->renderer->subscribe(id,RAW_DATA_TYPE_VIDEO);}
    if(e){removeTile(id);controlError="Video subscription failed:"+std::to_string(e);}
   }else if(changed){found->second->renderer->setRawDataResolution(ZoomSDKResolution_720P);}
  }
  workerStatus=anyCamera?"receiving":"presenter camera off";if(!anyCamera)controlError="Spotlighted presenter cameras are off.";

 }
 void cleanup(){clearTiles();auto* ah=GetAudioRawdataHelper();if(ah&&audioSubscribed)ah->unSubscribe();auto* rc=meeting->GetMeetingRecordingController();if(rc&&recording)rc->StopRawRecording();if(socketFD>=0)close(socketFD);}

} receiver;
gboolean receiverTick(gpointer){if(!sourceMode)tone.relayTick();return G_SOURCE_CONTINUE;}
struct ProgramShare: IZoomSDKShareSource {
 IZoomSDKShareSender* sender=nullptr;
 int width=1280,height=720;unsigned frames=0;SDKError lastResult=SDKERR_SUCCESS;
 void onStartSend(IZoomSDKShareSender* p) override {sender=p;std::cout<<"Program share sender started"<<std::endl;}
 void onStopSend() override {sender=nullptr;}
 void tick(){
  if(!sender)return;
  relay::Header h;std::vector<char> input;
  bool fresh=relay::readVideo(relayRoot,h,input);
  if(fresh){width=h.width;height=h.height;}
  else {input.assign(width*height*3/2,char(128));std::fill(input.begin(),input.begin()+width*height,char(16));}
  lastResult=sender->sendShareFrame(input.data(),width,height,input.size(),FrameDataFormat_I420_LIMITED);
  if(lastResult==SDKERR_SUCCESS&&fresh){relayVideoTime=h.time;if(!frames++)std::cout<<"Program share frame accepted="<<width<<"x"<<height<<std::endl;}
 }
} programShare;
gboolean videoTick(gpointer){if(sourceMode&&mediaReady)receiver.compose();else if(shareMode)programShare.tick();else pattern.tick();return G_SOURCE_CONTINUE;}
gboolean audioTick(gpointer){tone.tick();return G_SOURCE_CONTINUE;}
gboolean enableMedia(gpointer){
 if(settings&&settings->GetVideoSettings()){auto* video=settings->GetVideoSettings();auto e=video->EnableHDVideo(true);std::cout<<"In-meeting HD request="<<e<<" enabled="<<video->IsHDVideoEnabled()<<std::endl;}

 if(sourceMode){auto* a=meeting->GetMeetingAudioController();if(a)a->JoinVoip();mediaReady=true;return G_SOURCE_REMOVE;}
 auto* vh=GetRawdataVideoSourceHelper();auto* ah=GetAudioRawdataHelper();
 std::cout<<"Set video source="<<(vh?vh->setExternalVideoSource(&pattern,FrameDataFormat_I420_LIMITED):-1)<<std::endl;
 std::cout<<"Set audio source="<<(ah?ah->setExternalAudioSource(&tone):-1)<<std::endl;
 auto* a=meeting->GetMeetingAudioController();
 if(a) std::cout<<"Join audio="<<a->JoinVoip()<<std::endl;
 if(settings&&settings->GetAudioSettings()) {
  auto e=settings->GetAudioSettings()->EnableMicOriginalInput(true);
  originalSound=e==SDKERR_SUCCESS;
  std::cout<<"Satellite original microphone input result="<<e<<std::endl;
 }
 mediaReady=true;appliedRevision="";
 return G_SOURCE_REMOVE;
}
struct MeetingEvents: IMeetingServiceEvent {
 void onMeetingStatusChanged(MeetingStatus s,int r) override {
  std::cout<<"Meeting status="<<s<<" reason="<<r<<std::endl;
  if(s==MEETING_STATUS_INMEETING||s==MEETING_STATUS_JOIN_BREAKOUT_ROOM) {workerStatus="joined";std::cout<<"JOINED successfully"<<std::endl;g_timeout_add_seconds(2,enableMedia,nullptr);}
  if(s==MEETING_STATUS_WAITINGFORHOST) workerStatus="waiting for host";
  if(s==MEETING_STATUS_IN_WAITING_ROOM) {workerStatus="waiting";std::cout<<"Waiting for host admission"<<std::endl;}
  if(s==MEETING_STATUS_RECONNECTING) {workerStatus="reconnecting";mediaReady=false;}
  if(s==MEETING_STATUS_FAILED) fail(r);
  if(s==MEETING_STATUS_ENDED) g_main_loop_quit(loop);
 }
 void onMeetingStatisticsWarningNotification(StatisticsWarningType) override {}
 void onMeetingParameterNotification(const MeetingParameter*) override {}
 void onSuspendParticipantsActivities() override {}
 void onAICompanionActiveChangeNotice(bool) override {}
 void onMeetingTopicChanged(const zchar_t*) override {}
 void onMeetingFullToWatchLiveStream(const zchar_t*) override {}
 void onUserNetworkStatusChanged(MeetingComponentType,ConnectionQuality,unsigned int,bool) override {}
};
struct AuthEvents: IAuthServiceEvent {
 void onAuthenticationReturn(AuthResult r) override {
  std::cout<<"Authentication result="<<r<<std::endl;
  if(r!=AUTHRET_SUCCESS) {fail(r);return;}
  if(settings&&settings->GetVideoSettings()){auto* video=settings->GetVideoSettings();auto he=video->EnableHDVideo(true);video->EnableAlwaysUseOriginalSizeVideo(true);std::cout<<"HD video requested result="<<he<<" enabled="<<video->IsHDVideoEnabled()<<std::endl;}
  JoinParam p{}; p.userType=SDK_UT_WITHOUT_LOGIN;
  auto& j=p.param.withoutloginuserJoin;
  j.meetingNumber=std::stoull(number); j.userName=name.c_str();j.psw=password.c_str();
  j.isVideoOff=true;j.isAudioOff=true;
  auto e=meeting->Join(p);std::cout<<"Join request result="<<e<<std::endl;
  if(e!=SDKERR_SUCCESS) fail(e);
 }
 void onLoginReturnWithReason(LOGINSTATUS,IAccountInfo*,LoginFailReason) override {}
 void onLogout() override {}
 void onZoomIdentityExpired() override {fail(1);}
 void onZoomAuthIdentityExpired() override {fail(1);}
};
gboolean controls(gpointer) {
 if(sourceMode&&mediaReady)receiver.tick();
 auto* pc=meeting->GetMeetingParticipantsController();auto* me=pc?pc->GetMySelfUser():nullptr;
 auto* file=g_key_file_new();
 if(!sourceMode&&mediaReady&&me&&g_key_file_load_from_file(file,"control.ini",G_KEY_FILE_NONE,nullptr)) {
  gchar* revision=g_key_file_get_string(file,"control","revision",nullptr);
  if(revision&&appliedRevision!=revision) {
   bool camera=g_key_file_get_boolean(file,"control","camera",nullptr),mic=g_key_file_get_boolean(file,"control","microphone",nullptr);
   gchar* newName=g_key_file_get_string(file,"control","name",nullptr);
   auto* vc=meeting->GetMeetingVideoController();auto* ac=meeting->GetMeetingAudioController();
   SDKError ve=SDKERR_SUCCESS;
   if(shareMode) {
    auto* helper=GetRawdataShareSourceHelper();auto* sharing=meeting->GetMeetingShareController();
    ve=camera?(programShare.sender?SDKERR_SUCCESS:(helper?helper->setExternalShareSource(&programShare):SDKERR_UNINITIALIZE)):(programShare.sender?(sharing?sharing->StopShare():SDKERR_UNINITIALIZE):SDKERR_SUCCESS);
    std::cout<<"Program share command="<<ve<<std::endl;
   } else ve=vc?(camera?vc->UnmuteVideo():vc->MuteVideo()):SDKERR_UNINITIALIZE;
   auto ae=ac?(mic?ac->UnMuteAudio(me->GetUserID()):ac->MuteAudio(me->GetUserID())):SDKERR_UNINITIALIZE;
   auto ne=newName&&name!=newName?pc->ChangeUserName(me->GetUserID(),newName,false):SDKERR_SUCCESS;
   if(newName&&ne==SDKERR_SUCCESS)name=newName;
   controlError=(ve||ae||ne)?"Zoom command results video:"+std::to_string(ve)+" audio:"+std::to_string(ae)+" rename:"+std::to_string(ne):"";
   appliedRevision=revision;g_free(newName);
  }
  g_free(revision);
 }
 g_key_file_free(file);
 auto* output=g_key_file_new();g_key_file_set_string(output,"worker","status",workerStatus.c_str());
 g_key_file_set_boolean(output,"worker","hdEnabled",settings&&settings->GetVideoSettings()&&settings->GetVideoSettings()->IsHDVideoEnabled());
 g_key_file_set_boolean(output,"worker","originalSound",originalSound);
 g_key_file_set_boolean(output,"worker","camera",mediaReady&&(shareMode?programShare.sender!=nullptr:(me&&me->IsVideoOn())));
 g_key_file_set_boolean(output,"worker","microphone",mediaReady&&me&&!me->IsAudioMuted());
 g_key_file_set_string(output,"worker","name",name.c_str());g_key_file_set_string(output,"worker","revision",appliedRevision.c_str());g_key_file_set_string(output,"worker","error",controlError.c_str());
 if(sourceMode){
  std::string dimensions;
  {std::lock_guard<std::mutex> lock(receiver.frameMutex);for(auto id:receiver.order){if(!dimensions.empty())dimensions+=", ";auto found=receiver.tiles.find(id);if(found!=receiver.tiles.end()&&relay::validVideo(found->second->frame.header)){auto h=found->second->frame.header;dimensions+=std::to_string(h.width)+"x"+std::to_string(h.height);}else dimensions+="0x0";}}
  g_key_file_set_string(output,"worker","inputResolutions",dimensions.c_str());
  g_key_file_set_string(output,"worker","presenter",receiver.presenter.c_str());g_key_file_set_integer(output,"worker","spotlightCount",receiver.spotlightCount);
  g_key_file_set_boolean(output,"worker","video",receiver.videoTime&&relay::now()-receiver.videoTime<2000);
  g_key_file_set_boolean(output,"worker","audio",receiver.audioTime&&relay::now()-receiver.audioTime<2000);
  g_key_file_set_uint64(output,"worker","videoFrames",receiver.frames);g_key_file_set_uint64(output,"worker","audioBlocks",receiver.blocks);
  g_key_file_set_string(output,"worker","revision",std::getenv("ZOOM_REVISION")?std::getenv("ZOOM_REVISION"):"");
 }else if(!relayRoot.empty()){
  g_key_file_set_string(output,"worker","videoResolution",(std::to_string(shareMode?programShare.width:pattern.width)+"x"+std::to_string(shareMode?programShare.height:pattern.height)).c_str());
  g_key_file_set_string(output,"worker","publishMode",shareMode?"share":"camera");
  g_key_file_set_boolean(output,"worker","sourceVideo",relayVideoTime&&relay::now()-relayVideoTime<2000);
  g_key_file_set_boolean(output,"worker","sourceAudio",relayAudioTime&&relay::now()-relayAudioTime<2000);
 }
 gsize length=0;gchar* data=g_key_file_to_data(output,&length,nullptr);g_file_set_contents("status.ini",data,length,nullptr);g_free(data);g_key_file_free(output);
 return G_SOURCE_CONTINUE;
}
gboolean stop(gpointer) {g_main_loop_quit(loop);return G_SOURCE_REMOVE;}
int main() {
 const char* t=std::getenv("ZOOM_SDK_JWT");const char* n=std::getenv("ZOOM_MEETING_ID");const char* p=std::getenv("ZOOM_MEETING_PASSCODE");
 if(!t||!n||!p) {std::cerr<<"Missing runtime configuration"<<std::endl;return 1;}
 sourceMode=std::getenv("ZOOM_SOURCE_MODE")!=nullptr;relayRoot=std::getenv("ZOOM_RELAY_ROOT")?std::getenv("ZOOM_RELAY_ROOT"):"";
 shareMode=!sourceMode&&!relayRoot.empty()&&std::getenv("ZOOM_PUBLISH_MODE")&&std::string(std::getenv("ZOOM_PUBLISH_MODE"))=="share";
 if(sourceMode){if(relayRoot.empty())return 1;receiver.socketFD=socket(AF_UNIX,SOCK_DGRAM|SOCK_NONBLOCK|SOCK_CLOEXEC,0);}
 else if(!relayRoot.empty()){audioPath=relayRoot+"/"+(std::getenv("ZOOM_ROOM_ID")?std::string(std::getenv("ZOOM_ROOM_ID")):"satellite")+".sock";audioFD=relay::audioSocket(audioPath);if(audioFD<0)return 1;}
 token=t;number=n;password=p;name=std::getenv("ZOOM_DISPLAY_NAME")?std::getenv("ZOOM_DISPLAY_NAME"):"Jupiter Feed 01";
 loop=g_main_loop_new(nullptr,FALSE);
 InitParam init{};init.strWebDomain="https://zoom.us";init.strSupportUrl="https://zoom.us";init.emLanguageID=LANGUAGE_English;init.enableLogByDefault=false;init.enableGenerateDump=false;
 auto e=InitSDK(init);std::cout<<"Initialize result="<<e<<std::endl;if(e) return 1;
 IAuthService* auth=nullptr;MeetingEvents me;AuthEvents ae;
 if(CreateMeetingService(&meeting)||CreateAuthService(&auth)||CreateSettingService(&settings)) return 1;
 meeting->SetEvent(&me);auth->SetEvent(&ae);AuthContext ctx;ctx.jwt_token=token.c_str();
 e=auth->SDKAuth(ctx);if(e){std::cout<<"Authentication request error="<<e<<std::endl;return 1;}
 g_unix_signal_add(SIGTERM,stop,nullptr);g_unix_signal_add(SIGINT,stop,nullptr);
 g_timeout_add(66,videoTick,nullptr);g_timeout_add(20,audioTick,nullptr);
 g_timeout_add(5,receiverTick,nullptr);
 g_timeout_add(500,controls,nullptr);
 g_timeout_add_seconds(14400,stop,nullptr);
 g_main_loop_run(loop);
 if(sourceMode)receiver.cleanup();if(audioFD>=0){close(audioFD);unlink(audioPath.c_str());}
 meeting->Leave(LEAVE_MEETING);DestroyMeetingService(meeting);DestroyAuthService(auth);if(settings)DestroySettingService(settings);CleanUPSDK();g_main_loop_unref(loop);return result;
}
