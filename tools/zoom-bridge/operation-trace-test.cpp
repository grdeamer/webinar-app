#include "operation-trace.hpp"
#include <cassert>
#include <fstream>
#include <string>
#include <thread>
#include <sys/wait.h>

std::string snapshot(){std::ifstream in("operation.ini");return {std::istreambuf_iterator<char>(in),std::istreambuf_iterator<char>()};}
int main(){
 setenv("JUPITER_WORKER_DIAGNOSTICS","0",1);worker_trace::configure();
 assert(JIO_SDK_CALL("disabled.test",3)==3);assert(access("operation.ini",F_OK)!=0);
 setenv("JUPITER_WORKER_DIAGNOSTICS","1",1);worker_trace::configure();
 assert(snapshot().find("state=idle")!=std::string::npos);
 int value=JIO_SDK_CALL("outer.test",[]{
  assert(snapshot().find("stage=outer.test")!=std::string::npos);
  {worker_trace::Scope inner("inner.test");assert(snapshot().find("stage=inner.test")!=std::string::npos);}
  assert(snapshot().find("stage=outer.test")!=std::string::npos);
  std::thread callback([]{worker_trace::Scope other("callback.test");worker_trace::event("callback",3,7);});callback.join();
  assert(snapshot().find("stage=outer.test")!=std::string::npos);
  return 7;
 }());
 assert(value==7&&snapshot().find("state=idle")!=std::string::npos);
 struct stat metadata{};assert(stat("operation.ini",&metadata)==0&&(metadata.st_mode&0777)==0600);
 // Abrupt exit leaves the exact entered operation available for inspection.
 if(fork()==0){worker_trace::configure();worker_trace::Scope blocked("simulated.block");_exit(0);}
 int result;wait(&result);assert(snapshot().find("stage=simulated.block")!=std::string::npos);
 std::puts("Operation trace metadata tests passed");
}
