type Marker = {revision:number;frame:number}|null
export class ObserverFrameStats {
  frames:number;validFrames:number;invalidFrames:number;duplicateFrames:number;slateFrames:number;markerSkipped:number;selectionMismatches:number
  accept(authority:Marker,program:Marker,provenance:Marker,now:number):void
  snapshot():{frames:number;validFrames:number;invalidFrames:number;duplicateFrames:number;slateFrames:number;markerSkipped:number;selectionMismatches:number;selection:{generation:number;candidate:string|null;revision:number|null;firstDecodedAtMs:number}|null}
}
