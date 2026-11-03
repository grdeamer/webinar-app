import {randomBytes} from 'node:crypto'
import {MAX_PRESENTATION_BYTES,presentationExtension} from '../producer/presentationFiles.ts'
export type PresentationTicket={name:string;bytes:number;origin:string;runId:string;expiresAtMs:number}
/** One-use, short-lived upload capability. The actual deck never crosses a Vercel Function. */
export class PresentationTickets {
 private tickets=new Map<string,PresentationTicket>()
 issue(input:Omit<PresentationTicket,'expiresAtMs'>,now=Date.now()){
  for(const [id,t]of this.tickets)if(t.expiresAtMs<=now)this.tickets.delete(id)
  if(this.tickets.size>=4||!presentationExtension(input.name)||input.name.length>240||!Number.isSafeInteger(input.bytes)||input.bytes<1||input.bytes>MAX_PRESENTATION_BYTES||input.origin!=='https://app.jupiter.events')throw Error('Presentation upload not allowed')
  const ticket=randomBytes(32).toString('hex');this.tickets.set(ticket,{...input,expiresAtMs:now+90000});return {ticket,expiresAtMs:now+90000}
 }
 consume(ticket:string,origin:string,runId:string,now=Date.now()){
  const value=this.tickets.get(ticket)
  if(!value||value.expiresAtMs<=now||value.origin!==origin||value.runId!==runId)throw Error('Presentation upload expired or denied')
  this.tickets.delete(ticket);return value
 }
 clear(){this.tickets.clear()}
}
