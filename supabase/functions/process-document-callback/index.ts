import { verifyCallbackSignature } from '../_shared/callback-signature.ts'

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-callback-timestamp, x-callback-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') return new Response(null, { status: 405 })
  const rawBody = await req.text()
  if (rawBody.length > 2_000_000) return new Response(null, { status: 413 })
  if (!await verifyCallbackSignature(rawBody, req.headers.get('x-callback-timestamp'), req.headers.get('x-callback-signature'), Deno.env.get('DOCUMENT_CALLBACK_SECRET'))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }
  try {
    const payload = JSON.parse(rawBody)

    const { source_id, content, summary, display_name, title, status, error } = payload

    if (typeof source_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(source_id) ||
      (status !== undefined && !['completed', 'failed'].includes(status)) ||
      [content, summary, display_name, title, error].some(v => v !== undefined && v !== null && typeof v !== 'string')) {
      return new Response(
        JSON.stringify({ error: 'source_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Prepare update data
    const updateData: any = {
      processing_status: status || 'completed',
      updated_at: new Date().toISOString()
    }

    if (content) {
      updateData.content = content
    }

    if (summary) {
      updateData.summary = summary
    }

    // Use title if provided, otherwise use display_name, for backward compatibility
    if (title) {
      updateData.title = title
    } else if (display_name) {
      updateData.title = display_name
    }

    if (error) {
      updateData.processing_status = 'failed'
      console.error('Document processing failed')
    }



    // Update the source record
    const { data, error: updateError } = await supabaseClient
      .from('sources')
      .update(updateData)
      .eq('id', source_id)
      .eq('processing_status', 'processing')
      .select('id')
      .single()

    if (updateError) {
      console.error('Error updating source:', updateError)
      return new Response(
        JSON.stringify({ error: 'Source is unavailable or no longer processing' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }



    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-document-callback function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
