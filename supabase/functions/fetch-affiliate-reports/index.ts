import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import axios from 'https://esm.sh/axios@1.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get yesterday's date in YYYY-MM-DD format
    const date = new Date()
    date.setDate(date.getDate() - 1)
    const yesterday = date.toISOString().split('T')[0]

    // Fetch affiliate information for ID 2334
    const { data: affiliate, error: affiliateError } = await supabaseClient
      .from('affiliates')
      .select('affiliate_id, name, api_key')
      .eq('affiliate_id', 2334)
      .single()

    if (affiliateError) throw affiliateError

    const results = []

    try {
      console.log(`Processing affiliate ${affiliate.name || affiliate.affiliate_id}`)

      // Make API request to CYD2 affiliates endpoint
      const response = await axios.post('https://cyd2.com/affiliates/api/reports', {
        date: yesterday,
        affiliate_id: affiliate.affiliate_id,
        api_key: affiliate.api_key
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Parse response
      const reportData = response.data.data || []
      if (!reportData.length) {
        console.log(`No data for affiliate ${affiliate.name || affiliate.affiliate_id}`)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No data found for yesterday',
            results: [],
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      // Map data to Supabase table format
      const rows = reportData.map((item) => ({
        client_id: affiliate.affiliate_id,
        date: yesterday,
        offer: item.offer || 'Unknown',
        clicks: parseInt(item.clicks) || 0,
        conversions: parseInt(item.conversions) || 0,
      }))

      // Upsert data into Supabase
      const { error: insertError } = await supabaseClient
        .from('affiliate_reports')
        .upsert(rows, { onConflict: ['client_id', 'date', 'offer'] })

      if (insertError) {
        console.error(`Error inserting data for affiliate ${affiliate.name || affiliate.affiliate_id}:`, insertError)
        results.push({
          affiliate: affiliate.name || `Affiliate ${affiliate.affiliate_id}`,
          status: 'error',
          error: insertError.message,
        })
      } else {
        console.log(`Data upserted for affiliate ${affiliate.name || affiliate.affiliate_id}`)
        results.push({
          affiliate: affiliate.name || `Affiliate ${affiliate.affiliate_id}`,
          status: 'success',
          rows_processed: rows.length,
        })
      }
    } catch (error) {
      console.error(`Error processing affiliate ${affiliate.name || affiliate.affiliate_id}:`, error)
      results.push({
        affiliate: affiliate.name || `Affiliate ${affiliate.affiliate_id}`,
        status: 'error',
        error: error.message,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 