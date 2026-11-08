export type PollEnvironment = {
  visible:()=>boolean
  listen:(wake:()=>void)=>()=>void
  later:(run:()=>void,delay:number)=>unknown
  cancel:(timer:unknown)=>void
  random:()=>number
}
function browserEnvironment():PollEnvironment {
  return {visible:()=>document.visibilityState!=='hidden',listen(wake){document.addEventListener('visibilitychange',wake);window.addEventListener('focus',wake);return()=>{document.removeEventListener('visibilitychange',wake);window.removeEventListener('focus',wake)}},later:(run,delay)=>window.setTimeout(run,delay),cancel:timer=>window.clearTimeout(timer as number),random:Math.random}
}
/** UI reads only. Never use this scheduler for media, worker leases or authority. */
export function startVisibilityPoll(options:{run:(signal:AbortSignal)=>Promise<unknown>;intervalMs:number;initialDelayMs?:number;maxBackoffMs?:number;onError?:(error:unknown)=>void},env:PollEnvironment=browserEnvironment()) {
  const controller=new AbortController()
  let stopped=false,running=false,queued=false,failures=0,timer:unknown
  function clear(){if(timer!==undefined){env.cancel(timer);timer=undefined}}
  function schedule(delay:number){clear();if(!stopped&&env.visible())timer=env.later(()=>{timer=undefined;void tick()},delay)}
  async function tick(){
    if(stopped||!env.visible())return
    if(running){queued=true;return}
    running=true
    try{await options.run(controller.signal);failures=0}
    catch(error){if(!stopped){failures++;options.onError?.(error)}}
    finally{
      running=false
      if(!stopped){const delay=failures?Math.min(options.maxBackoffMs??30000,options.intervalMs*2**Math.min(failures,5))*(.8+.2*env.random()):options.intervalMs;schedule(queued?0:delay);queued=false}
    }
  }
  function wake(){if(stopped)return;clear();if(!env.visible()){queued=false;return}if(running)queued=true;else schedule(0)}
  const unlisten=env.listen(wake);schedule(options.initialDelayMs??0)
  return {wake,stop(){stopped=true;queued=false;clear();controller.abort();unlisten()}}
}
