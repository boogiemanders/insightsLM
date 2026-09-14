import assert from 'node:assert/strict'
import test from 'node:test'
import { createHmac } from 'node:crypto'
import { verifyCallbackSignature } from './callback-signature'
test('callback requires an authentic, recent signature over the exact body', async () => {
 const body = '{"source_id":"test"}', secret = 's'.repeat(32), timestamp = '1789390000'
 const sig = createHmac('sha256', secret).update(timestamp + '.' + body).digest('hex')
 const now = Number(timestamp) * 1000
 assert.equal(await verifyCallbackSignature(body, timestamp, sig, secret, now), true)
 assert.equal(await verifyCallbackSignature(body + ' ', timestamp, sig, secret, now), false)
 assert.equal(await verifyCallbackSignature(body, timestamp, sig, undefined, now), false)
 assert.equal(await verifyCallbackSignature(body, timestamp, sig, secret, now + 301000), false)
 assert.equal(await verifyCallbackSignature(body, null, sig, secret, now), false)
})
