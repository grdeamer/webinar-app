import test from 'node:test'
import assert from 'node:assert/strict'
import { producerAssetKind, validateProducerMedia, uniqueProducerAssetLabel, isHoldingAsset } from '../lib/producer/mediaAssets.ts'

test('accepted file formats map to their actual playback kind', () => {
  for (const [mime, kind] of [['image/png', 'image'], ['application/pdf', 'pdf'], ['video/mp4', 'video'], ['video/webm', 'video'], ['audio/mpeg', 'audio'], ['audio/wav', 'audio'], ['audio/mp4', 'audio']]) {
    assert.equal(validateProducerMedia(mime, 100), kind)
  }
  assert.equal(producerAssetKind('image/svg+xml'), null)
  assert.throws(() => validateProducerMedia('image/svg+xml', 100), /Unsupported format/)
  for (const size of [0, -1, NaN, Infinity, 50 * 1024 * 1024 + 1]) assert.throws(() => validateProducerMedia('video/mp4', size), /50 MB/)
})

test('duplicate media names cannot route to a different asset', () => {
  assert.equal(uniqueProducerAssetLabel('Clip', ['Clip', 'Clip 2']), 'Clip 3')
  assert.equal(uniqueProducerAssetLabel('  Clip  ', []), 'Clip')
})

test('explicit holding classification persists independently of names', () => {
  assert.equal(isHoldingAsset({ label: 'Break', holding: true }), true)
  assert.equal(isHoldingAsset({ label: 'Holding screen', holding: false }), false)
  assert.equal(isHoldingAsset({ label: 'Holding screen' }), true)
})
