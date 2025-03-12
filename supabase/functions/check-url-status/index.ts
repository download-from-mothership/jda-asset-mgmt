import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function tryFetch(url: string, controller: AbortController) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      ok: response.ok
    }
  } catch (error) {
    console.error(`Error fetching ${url}:`, error)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Create base URL without protocol
    const baseUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
    console.log('Base URL:', baseUrl)

    // Create URLs to try
    const urlsToTry = [
      `https://www.${baseUrl}`,
      `https://${baseUrl}`
    ]

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      let finalResult = null
      
      // Try each URL variant
      for (const urlToTry of urlsToTry) {
        console.log('Trying URL:', urlToTry)
        const result = await tryFetch(urlToTry, controller)
        
        if (result && (result.ok || (result.status >= 300 && result.status < 400))) {
          finalResult = {
            status: 'live',
            workingUrl: urlToTry,
            statusCode: result.status,
            headers: result.headers
          }
          break
        }
        
        if (result) {
          finalResult = {
            status: 'not live',
            lastTriedUrl: urlToTry,
            statusCode: result.status,
            headers: result.headers
          }
        }
      }

      clearTimeout(timeoutId)
      
      if (!finalResult) {
        throw new Error('All URL variants failed')
      }

      return new Response(
        JSON.stringify(finalResult),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } catch (error) {
      clearTimeout(timeoutId)
      
      console.error('Fetch error:', error)
      
      return new Response(
        JSON.stringify({ 
          status: 'not live',
          error: error.message,
          type: error.name
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }
  } catch (error) {
    console.error('General error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 