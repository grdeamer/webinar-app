import {engineEndpoint} from './protocol'
import 'server-only'
import {producerBackend,validateEc2Scope} from './ec2Worker'
export type HostedStudioConfig = {eventId:string;title:string;root:string;relayUrl:string;canStart:boolean;directTakeUrl?:string}
export function hostedStudioConfig(eventId:string,sessionId:string,title:string,actorId:string,canStart:boolean){
 if(producerBackend()!=='ec2')return null
 try{validateEc2Scope({eventId,sessionId,actorId})}catch{return null}
 const relay=new URL(process.env.LIVEKIT_URL||'https://invalid.invalid')
 if(relay.protocol!=='wss:'||relay.username||relay.password||relay.search||relay.hash||relay.pathname!=='/')throw Error('Self-hosted relay origin is not configured')
 return {eventId,title,root:`/admin/events/${encodeURIComponent(eventId)}/producer/rehearsal/engine/${encodeURIComponent(sessionId)}`,relayUrl:relay.origin,canStart,...(process.env.PRODUCER_ENGINE_URL?{directTakeUrl:engineEndpoint(process.env.PRODUCER_ENGINE_URL).href}:{})}
}

export function configuredProducerSession(eventId:string){
 return producerBackend()==='ec2'&&process.env.PRODUCER_ENGINE_EC2_EVENT_ID===eventId?process.env.PRODUCER_ENGINE_EC2_SESSION_ID:null
}
