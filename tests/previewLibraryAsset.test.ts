import test from 'node:test'
import assert from 'node:assert/strict'
import { appendPreviewAsset, positionPreviewAsset, previewBlockFromLibraryAsset } from '../lib/producer/previewLibraryAsset.ts'
import type { BroadcastAssetTelemetry } from '../app/admin/events/[id]/producer/BottomAssetDockAssetRenderers'
const asset: BroadcastAssetTelemetry = { id:'asset-1',label:'Slides',type:'graphic',assetKind:'pdf',state:'READY',duration:'PDF',meta:'PDF',route:'',lastPlayed:'',linkedScene:'',mediaUrl:'/slides.pdf',imageUrl:'/thumbnail.png' }
test('adding second and third sources preserves earlier layers and their positions',()=>{
 const first=previewBlockFromLibraryAsset(asset,'first',{fullFrame:true})
 const second=positionPreviewAsset(previewBlockFromLibraryAsset({...asset,id:'asset-2',label:'Second'},'second'),480,270)
 const third=previewBlockFromLibraryAsset(asset,'third')
 const blocks=appendPreviewAsset(appendPreviewAsset([first],second,'second'),third,'third')
 assert.equal(blocks.length,3); assert.equal(blocks[0],first)
 assert.deepEqual(blocks.map(b=>b.zIndex),[1,2,3]); assert.equal(blocks[1].x,320);assert.equal(blocks[1].y,180)
 assert.equal(blocks[1].assetId,'asset-2'); assert.equal(blocks[1].groupId,null)
})
test('library drag preserves original video and PDF identity instead of using thumbnails',()=>{
 const video=previewBlockFromLibraryAsset({...asset,type:'video',assetKind:'video',mediaUrl:'/movie.mp4'},'video')
 assert.equal(video.type,'video');assert.equal(video.src,'/movie.mp4')
 const pdf=previewBlockFromLibraryAsset(asset,'pdf')
 assert.equal(pdf.type,'pdf');assert.equal(pdf.src,'/slides.pdf');assert.equal(pdf.assetId,'asset-1')
})
test('drop positioning clamps every edge without changing layer size',()=>{
 const block=previewBlockFromLibraryAsset(asset,'a')
 assert.deepEqual([positionPreviewAsset(block,-10,-10).x,positionPreviewAsset(block,-10,-10).y],[0,0])
 assert.deepEqual([positionPreviewAsset(block,1000,1000).x,positionPreviewAsset(block,1000,1000).y],[320,180])
})

test('PowerPoint drops retain the selected slide and clamp it to the deck',()=>{
 const deck={originalName:'slides.pptx',pageCount:3,thumbnails:[] as string[]}
 const slide=previewBlockFromLibraryAsset({...asset,deck},'slide',{slide:2})
 assert.equal(slide.type,'pdf');assert.equal(slide.pdfPage,2);assert.equal(slide.src,'/slides.pdf#page=2')
 assert.equal(previewBlockFromLibraryAsset({...asset,deck},'last',{slide:9}).pdfPage,3)
})
