import test from 'node:test'
import assert from 'node:assert/strict'
import { assetReferencePages, publicationStatus } from '../lib/page-editor/pageSafety.ts'
test('protect assets in sections and published snapshots even when draft no longer uses them', () => {
 const url='https://example.test/asset.png'
 assert.deepEqual(assetReferencePages([{page_key:'hold',sections:{logo:url}}, {page_key:'home',published_document:{elements:[{src:url}]}}, {page_key:'unused',elements:[]}],url),['hold','home'])
 assert.deepEqual(assetReferencePages([{page_key:'home',elements:[url]}],''),[])
})
test('publication badges distinguish drafts, published revisions and unpublished changes',()=> {
 assert.equal(publicationStatus(undefined,'published'),'Draft')
 const row={page_key:'home',document_revision:4,published_document:{revision:4}}
 assert.equal(publicationStatus(row,'draft'),'Draft')
 assert.equal(publicationStatus(row,'published'),'Published')
 assert.equal(publicationStatus({...row,document_revision:5},'published'),'Unpublished changes')
})
