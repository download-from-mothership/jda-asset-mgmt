import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyAuth } from '../_shared/auth.ts'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface RequestBody {
  tenDLCId: number
  samples: {
    sample_copy1: string | null
    sample_copy2: string | null
    sample_copy3: string | null
  }
}

interface SenderData {
  brand: string | null
  business_name: string | null
  sender: string | null
  phone: string | null
  terms: string | null
}

interface CannedMessage {
  template: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    await verifyAuth(req)

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { tenDLCId, samples } = await req.json() as RequestBody

    // Check if record exists
    const { data: existingRecord } = await supabaseClient
      .from('tendlc_samples')
      .select('id')
      .eq('id', tenDLCId)
      .single()

    let result
    if (!existingRecord) {
      // Insert new record
      const { data, error: insertError } = await supabaseClient
        .from('tendlc_samples')
        .insert({
          id: tenDLCId,
          ...samples,
          welcome_msg: null,
          help_msg: null,
          unsubscribe_msg: null,
          optin_msg: null
        })
        .select()
        .single()

      if (insertError) throw insertError
      result = data
    } else {
      // Update existing record - only update the sample fields
      const { data, error: updateError } = await supabaseClient
        .from('tendlc_samples')
        .update({
          sample_copy1: samples.sample_copy1,
          sample_copy2: samples.sample_copy2,
          sample_copy3: samples.sample_copy3
        })
        .eq('id', tenDLCId)
        .select()
        .single()

      if (updateError) throw updateError
      result = data
    }

    // Call the update_tendlc_messages function
    const { data: functionData, error: functionError } = await supabaseClient
      .rpc('update_tendlc_messages', {
        tendlc_id: tenDLCId
      })

    if (functionError) {
      console.error('Function error:', functionError)
      throw functionError
    }

    return new Response(
      JSON.stringify({
        message: 'Samples updated successfully',
        data: result,
        functionResult: functionData,
        notices: functionError?.message || 'No notices'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in update-tendlc-samples:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 