export type ProgramMonitorBinding = {element:HTMLVideoElement|null;stream:MediaProvider|null}

/** Workspace changes may replace the DOM element, but must not replace its live subscription. */
export function bindProgramMonitor(binding:ProgramMonitorBinding,element:HTMLVideoElement|null):void {
  if(binding.element?.srcObject)binding.stream=binding.element.srcObject
  if(binding.element&&binding.element!==element)binding.element.srcObject=null
  binding.element=element
  if(element&&binding.stream){element.srcObject=binding.stream;void element.play().catch(()=>{})}
}
export function clearProgramMonitor(binding:ProgramMonitorBinding):void {
  binding.stream=null
  if(binding.element)binding.element.srcObject=null
}

/** A subscription may finish after React has replaced its original video element. */
export function setProgramMonitorStream(binding:ProgramMonitorBinding,stream:MediaProvider|null):void {
 binding.stream=stream
 if(binding.element){binding.element.srcObject=stream;if(stream)void binding.element.play().catch(()=>{})}
}
