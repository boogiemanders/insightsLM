# Document callback rollout

The callback now requires a 32-character-or-longer `DOCUMENT_CALLBACK_SECRET`, a Unix-seconds `x-callback-timestamp`, and a lowercase hex `x-callback-signature` containing HMAC-SHA256(secret, timestamp + "." + exact HTTP body). Sign the serialized body once and send those exact bytes. Timestamps must be within five minutes. Unsigned requests are rejected before any privileged database access.

Configure the same secret in the document worker and Supabase function secrets, then deploy the worker and callback together and verify a disposable document. The initiating function verifies the caller and loads its owned source through RLS; callbacks only complete a source currently marked processing. Callback responses and logs no longer contain document bodies.

This patch has not changed a deployed worker, function secret, source row, or database schema. External worker configuration is required before production rollout. The worker is trusted to sign only jobs it received; per-job nonces are a further improvement for deployments that process concurrent retries of one source.
