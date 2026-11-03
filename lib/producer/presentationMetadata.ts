import {MAX_PRESENTATION_SLIDES} from './presentationFiles.ts'
export function presentationMetadata(value:unknown){
 if(value===undefined||value===null)return undefined
 const deck=value as {originalName?:unknown;pageCount?:unknown;thumbnails?:unknown}
 if(typeof deck.originalName!=='string'||deck.originalName.length>240||!Number.isSafeInteger(deck.pageCount)||Number(deck.pageCount)<1||Number(deck.pageCount)>MAX_PRESENTATION_SLIDES||!Array.isArray(deck.thumbnails)||deck.thumbnails.length!==deck.pageCount||JSON.stringify(value).length>1200000||deck.thumbnails.some(t=>typeof t!=='string'||t.length>50000||!/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(t)))throw Error('Invalid slide metadata')
 return {originalName:deck.originalName,pageCount:Number(deck.pageCount),thumbnails:deck.thumbnails as string[]}
}
