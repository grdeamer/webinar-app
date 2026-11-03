import {createConnection} from 'node:net'
import type {IncomingMessage,ServerResponse} from 'node:http'
import {MAX_PRESENTATION_BYTES,validatePresentationHeader} from '../producer/presentationFiles.ts'
import {PresentationTickets} from './presentationTickets.ts'
function convert(name:string,input:Buffer):Promise<Buffer>{
 return new Promise((resolve,reject)=>{
  const connection=createConnection('/run/jupiter-presentations/converter.sock'),chunks:Buffer[]=[]
  let size=0
  connection.setTimeout(90000)
  connection.once('connect',()=>{connection.write(JSON.stringify({name,bytes:input.length})+'\n');connection.write(input)})
  connection.on('data',chunk=>{
   const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=bytes.length
   if(size>MAX_PRESENTATION_BYTES+2048){connection.destroy();reject(Error('Conversion output too large'));return}
   chunks.push(bytes)
  })
  connection.once('timeout',()=>connection.destroy(Error('Converter timed out')))
  connection.once('error',()=>reject(Error('Converter unavailable')))
  connection.once('end',()=>{
   try{const data=Buffer.concat(chunks,size),line=data.indexOf(10);if(line<0||line>2048)throw Error();const header=JSON.parse(data.subarray(0,line).toString()),pdf=data.subarray(line+1);if(header.error||pdf.length!==header.bytes||pdf.subarray(0,5).toString()!=='%PDF-')throw Error();resolve(pdf)}catch{reject(Error('PowerPoint conversion failed'))}
  })
 })
}
export class HostedPresentations {
 readonly tickets=new PresentationTickets()
 private busy=false
 constructor(privateRunId:string,privateDeadline:number,convertFile=convert){this.runId=privateRunId;this.deadline=privateDeadline;this.convertFile=convertFile}
 private readonly convertFile:typeof convert
 private readonly runId:string
 private readonly deadline:number
 async handle(req:IncomingMessage,res:ServerResponse){
  if(req.url!=='/presentation')return false
  const origin=req.headers.origin
  if(origin!=='https://app.jupiter.events'){res.writeHead(403);res.end();return true}
  res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store')
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Max-Age':'300'});res.end();return true}
  if(req.method!=='POST'||this.busy||Date.now()+65000>=this.deadline){res.writeHead(409,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Conversion unavailable; start a fresh session or wait for the current conversion'}));return true}
  try{
   const ticket=this.tickets.consume((req.headers.authorization||'').replace(/^Bearer /,''),origin,this.runId)
   this.busy=true
   const chunks:Buffer[]=[];let size=0
   for await(const chunk of req){size+=chunk.length;if(size>ticket.bytes||size>MAX_PRESENTATION_BYTES)throw Error('Presentation exceeds its upload allowance');chunks.push(Buffer.from(chunk))}
   if(size!==ticket.bytes)throw Error('Incomplete presentation upload')
   const bytes=Buffer.concat(chunks);validatePresentationHeader(ticket.name,bytes)
   const pdf=await this.convertFile(ticket.name,bytes)
   res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':pdf.length});res.end(pdf)
  }catch(error){if(!res.headersSent)res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error instanceof Error?error.message:'Presentation conversion failed'}))}
  finally{this.busy=false}
  return true
 }
 stop(){this.tickets.clear()}
}
