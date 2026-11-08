import type {IncomingMessage,ServerResponse} from 'node:http'
import {DirectTakeDenied,type DirectTakeTickets} from './directTakeTickets.ts'
/** Existing /control listener; simple POST avoids CORS preflight at click time.
 * Ticket bodies are never included in a URL, access log or error response. */
export async function handleDirectTake(request:IncomingMessage,response:ServerResponse,tickets:DirectTakeTickets|null){
 if(request.url!=='/control'||request.method!=='POST'||!request.headers['content-type']?.startsWith('text/plain'))return false
 const origin=request.headers.origin
 response.setHeader('Cache-Control','no-store');response.setHeader('Vary','Origin')
 response.setHeader('Content-Type','application/json');response.setHeader('X-Content-Type-Options','nosniff')
 if(!tickets||typeof origin!=='string'||!tickets.allowedOrigin(origin)){response.writeHead(403);response.end(JSON.stringify({error:'TAKE_DENIED'}));return true}
 response.setHeader('Access-Control-Allow-Origin',origin)
 try{
  let body=''
  for await(const chunk of request){body+=String(chunk);if(Buffer.byteLength(body)>2048)throw new DirectTakeDenied('INVALID_TAKE_REQUEST')}
  const result=tickets.execute(origin,JSON.parse(body))
  response.writeHead(200);response.end(JSON.stringify(result))
 }catch(error){response.writeHead(error instanceof DirectTakeDenied?409:403);response.end(JSON.stringify({error:error instanceof DirectTakeDenied?error.code:'TAKE_DENIED'}))}
 return true
}
