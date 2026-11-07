import type {PreviewBlock} from '../../app/admin/events/[id]/producer/useProducerBlocks'
import type {Composition, JsonObject} from '../production/contracts'

/** The file is published privately; only visual properties enter the durable composition. */
export function libraryEngineComposition(block:PreviewBlock,sourceId:'camera-a'|'camera-b',cueId='library-input'):Composition {
  const props:JsonObject={x:0,y:0,width:640,height:360,fit:'contain',borderRadius:0,shadowIntensity:0}
  const visualKeys = ['x','y','width','height','zIndex','opacity','scale','rotation','blur','glow','glowColor','borderRadius','shadowIntensity','shadowColor','hidden','groupId','blendMode','timelineStartMs','timelineDurationMs','animationType','animationProgress'] as const
  for(const key of visualKeys){const value=block[key];if(value!==undefined)props[key]=value}
  return {sceneId:null,layers:[{id:cueId,kind:'camera',sourceId,props}]}
}
