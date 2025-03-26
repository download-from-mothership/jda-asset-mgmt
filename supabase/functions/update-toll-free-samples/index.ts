import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  tollFreeId: number
  samples: {
    sample_copy1: string | null
    sample_copy2: string | null
    sample_copy3: string | null
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { tollFreeId, samples } = await req.json() as RequestBody

    // Check if record exists
    const { data: existingRecord } = await supabaseClient
      .from('toll_free_samples')
      .select('id')
      .eq('id', tollFreeId)
      .single()

    let result
    if (!existingRecord) {
      // Insert new record
      const { data, error: insertError } = await supabaseClient
        .from('toll_free_samples')
        .insert({
          id: tollFreeId,
          ...samples
        })
        .select()
        .single()

      if (insertError) throw insertError
      result = data
    } else {
      // Update existing record
      const { data, error: updateError } = await supabaseClient
        .from('toll_free_samples')
        .update(samples)
        .eq('id', tollFreeId)
        .select()
        .single()

      if (updateError) throw updateError
      result = data
    }

    // Call the update_toll_free_messages function
    const { data: functionData, error: functionError } = await supabaseClient
      .rpc('update_toll_free_messages', {
        toll_free_id: tollFreeId
      })
      .select('*')

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
    console.error('Error in update-toll-free-samples:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 