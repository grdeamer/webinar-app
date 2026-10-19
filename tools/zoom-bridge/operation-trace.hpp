#pragma once
// Opt-in metadata only: no SDK arguments, credentials, frame or audio bytes.
#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fcntl.h>
#include <sys/stat.h>
#include <sys/mman.h>
#include <sys/syscall.h>
#include <unistd.h>
#include <utility>

namespace worker_trace {
inline std::atomic<bool> enabled{false};
inline long mainThread=0;
inline char* mappedSnapshot=nullptr;
inline constexpr size_t snapshotBytes=1024;
inline long long milliseconds(){return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();}
struct Scope;
inline thread_local Scope* current=nullptr;
inline void snapshot();
struct Scope {
 const char* operation;long long entered;Scope* previous;bool active;
 explicit Scope(const char* name):operation(name),entered(0),previous(nullptr),active(enabled&&syscall(SYS_gettid)==mainThread){
  if(active){entered=milliseconds();previous=current;current=this;snapshot();}
 }
 ~Scope(){if(active){current=previous;snapshot();}}
 Scope(const Scope&)=delete;Scope& operator=(const Scope&)=delete;
};
inline void snapshot(){
 if(!mappedSnapshot)return;
 char record[snapshotBytes];std::memset(record,' ',sizeof(record));
 int length=snprintf(record,sizeof(record),"[operation]\npid=%ld\nstage=%s\nstate=%s\nentered_unix_ms=%lld\nupdated_unix_ms=%lld\n",long(getpid()),current?current->operation:"idle",current?"entered":"idle",current?current->entered:0,milliseconds());
 if(length<0||size_t(length)>=sizeof(record))return;
 record[length]=' ';record[sizeof(record)-1]='\n';
 // A fixed mmap avoids filesystem opens/renames on every audio packet. Read
 // this breadcrumb after the worker stalls; active updates are not transactional.
 std::memcpy(mappedSnapshot,record,sizeof(record));
}
inline void event(const char* kind,int code=0,int reason=0){
 if(!enabled)return;
 int fd=open("diagnostic-events.log",O_WRONLY|O_APPEND|O_CREAT|O_CLOEXEC|O_NOFOLLOW,0600);
 if(fd<0)return;
 fchmod(fd,0600);struct stat metadata{};
 if(fstat(fd,&metadata)==0&&metadata.st_size>65536&&ftruncate(fd,0)!=0){close(fd);return;}
 char line[192];int length=snprintf(line,sizeof(line),"%lld pid=%ld event=%s code=%d reason=%d\n",milliseconds(),long(getpid()),kind,code,reason);
 if(length>0&&length<int(sizeof(line))){const auto written=write(fd,line,length);(void)written;}
 close(fd);
}
inline void configure(){
 const char* flag=std::getenv("JUPITER_WORKER_DIAGNOSTICS");
 mainThread=syscall(SYS_gettid);enabled=flag&&std::strcmp(flag,"1")==0;
 if(enabled){
  if(mappedSnapshot){munmap(mappedSnapshot,snapshotBytes);mappedSnapshot=nullptr;}
  int fd=open("operation.ini",O_RDWR|O_CREAT|O_CLOEXEC|O_NOFOLLOW,0600);
  if(fd>=0){
   fchmod(fd,0600);
   if(ftruncate(fd,snapshotBytes)==0){void* map=mmap(nullptr,snapshotBytes,PROT_READ|PROT_WRITE,MAP_SHARED,fd,0);if(map!=MAP_FAILED)mappedSnapshot=static_cast<char*>(map);}
   close(fd);
  }
  snapshot();event("worker.start");
 }
}
template<class F> decltype(auto) call(const char* name,F&& function){Scope scope(name);return std::forward<F>(function)();}
}
#define JIO_SDK_CALL(name, expression) worker_trace::call(name,[&](){return (expression);})
