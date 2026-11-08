/** In-flight reads only, never an authorization cache or a completed-state cache. */
export function singleFlightRead<T>() {
  const pending=new Map<string,Promise<T>>()
  return function read(key:string,load:()=>Promise<T>):Promise<T> {
    const existing=pending.get(key)
    if(existing)return existing
    const request=Promise.resolve().then(load)
    pending.set(key,request)
    void request.finally(()=>{if(pending.get(key)===request)pending.delete(key)}).catch(()=>{})
    return request
  }
}
