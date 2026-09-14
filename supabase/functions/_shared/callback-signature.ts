export async function verifyCallbackSignature(body: string, timestamp: string | null, signature: string | null, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!secret || secret.length < 32 || !timestamp || !/^\d{10}$/.test(timestamp) || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const bytes = Uint8Array.from(signature.match(/../g)!, n => parseInt(n, 16))
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(`${timestamp}.${body}`))
}
