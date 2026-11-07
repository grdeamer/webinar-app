export const PRODUCER_ROOM_LAYOUTS = [
 {id:'flight-deck',name:'Flight Deck',description:'Balanced monitors with a roomy source dock below.',arrangement:'Open desk'},
 {id:'launchpad',name:'Launchpad',description:'Keep the media library on the left while you build Preview.',arrangement:'Library left'},
 {id:'spotlight',name:'Spotlight',description:'Give Program more room, with Preview beside it.',arrangement:'Program focus'},
] as const
export type ProducerRoomLayout = typeof PRODUCER_ROOM_LAYOUTS[number]['id']
export const DEFAULT_PRODUCER_ROOM_LAYOUT:ProducerRoomLayout='flight-deck'
export function parseProducerRoomLayout(value:unknown):ProducerRoomLayout {
 return PRODUCER_ROOM_LAYOUTS.some(layout=>layout.id===value)?value as ProducerRoomLayout:DEFAULT_PRODUCER_ROOM_LAYOUT
}
export function producerLayoutStorageKey(ownerId?:string){return ownerId&&/^[a-zA-Z0-9_-]{1,128}$/.test(ownerId)?'jupiter.producer.layout.v1:'+ownerId:null}

export function producerMonitorColumns(layout:ProducerRoomLayout,previewPercent:number){
 const preview=Math.max(32,Math.min(68,previewPercent))
 return layout==='spotlight'?`minmax(0, ${100-preview*.7}fr) clamp(72px,5.8vw,88px) minmax(0, ${preview*.7}fr)`:`minmax(0, ${preview}fr) clamp(72px,5.8vw,88px) minmax(0, ${100-preview}fr)`
}
