import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { corsHeaders } from "../_shared/cors.ts"
import { verifyAuth } from "../_shared/auth.ts"

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Verify JWT token
    try {
      await verifyAuth(req)
    } catch (authError) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    const { id } = await req.json()

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID is required' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the toll-free record with sender details
    const { data: tollFreeData, error: tollFreeError } = await supabaseClient
      .from('toll_free')
      .select(`
        *,
        sender:sender_id (
          sender,
          brand,
          company,
          cta,
          vertical:sender_vertical (
            vertical:vertical_id (
              vertical_name
            )
          )
        )
      `)
      .eq('id', id)
      .single()

    if (tollFreeError || !tollFreeData) {
      return new Response(
        JSON.stringify({ error: 'Toll-free record not found' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    // Get Firecrawl API key
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable is not set')
    }

    // Extract business details
    const businessName = tollFreeData.sender?.brand || tollFreeData.sender?.company || ''
    const verticals = tollFreeData.sender?.vertical
      ?.map(v => v.vertical?.vertical_name)
      .filter(Boolean) || []

    // Scrape the URL using firecrawl.dev
    let scrapedMarkdown = ''
    if (tollFreeData.sender?.cta) {
      try {
        console.log('Attempting to scrape URL:', tollFreeData.sender.cta)
        const firecrawlUrl = `https://api.firecrawl.dev/v1/scrape`
        console.log('Making request to:', firecrawlUrl)
        
        const firecrawlRes = await fetch(firecrawlUrl, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: tollFreeData.sender.cta
          })
        })

        console.log('Response status:', firecrawlRes.status)
        console.log('Response headers:', Object.fromEntries(firecrawlRes.headers.entries()))
        
        if (!firecrawlRes.ok) {
          const errorText = await firecrawlRes.text()
          console.error('Error response body:', errorText)
          throw new Error(`Failed to scrape URL: ${firecrawlRes.status} ${errorText}`)
        }

        const scrapedData = await firecrawlRes.json()
        console.log('Scraped data:', scrapedData)
        scrapedMarkdown = scrapedData.markdown || scrapedData.content || scrapedData.text || ''
      } catch (error) {
        console.error('Error scraping URL:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to scrape URL' }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        )
      }
    }

    // Generate the use case using OpenAI
    const prompt = `Generate a concise use case description for a Toll-Free SMS campaign. Here are the details:

Business: ${businessName}
Industry/Vertical: ${verticals.join(', ')}
Sender ID: ${tollFreeData.sender?.sender}

Website Content:
${scrapedMarkdown}

The use case should:
1. Clearly explain how the business will use SMS messaging
2. Describe the types of messages that will be sent
3. Mention the target audience
4. Include any relevant compliance information
5. Be written in a professional tone
6. Be no longer than 250 characters
7. Use context from the website content when relevant

Format the response as a single paragraph without any headers or bullet points.`

    // Call OpenAI API directly
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates concise and professional use case descriptions for Toll-Free SMS campaigns. You analyze website content to understand the business context and create relevant use cases.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    })

    if (!openaiRes.ok) {
      throw new Error('Failed to generate use case')
    }

    const openaiData = await openaiRes.json()
    
    if (!openaiData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI')
    }

    const useCase = openaiData.choices[0].message.content.trim()

    return new Response(
      JSON.stringify({ useCase }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 