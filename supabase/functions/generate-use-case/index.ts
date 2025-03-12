import { serve } from 'std/http/server'
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { verifyAuth } from '../_shared/auth.ts'

function extractCtaLanguage(markdown: string): string {
  const pattern = /###\s+.*\n([\s\S]*?)\n\n/
  const match = markdown.match(pattern)
  return match ? match[1].trim() : 'Default CTA language'
}

serve(async (req) => {
  // Handle the preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
      }
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Content-Type': 'application/json'
      }
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
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          },
          status: 401
        }
      )
    }

    const { id } = await req.json()

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID is required' }), 
        { 
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          },
          status: 400 
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // First get the toll_free record to get the sender_id
    const { data: tollFreeData, error: tollFreeError } = await supabaseClient
      .from('toll_free')
      .select('sender_id')
      .eq('id', id)
      .single()

    if (tollFreeError || !tollFreeData) {
      return new Response(
        JSON.stringify({ error: 'Toll-free record not found' }), 
        { 
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          },
          status: 404 
        }
      )
    }

    // Query the sender table using sender_id from toll_free
    const { data, error } = await supabaseClient
      .from('sender')
      .select(`
        cta,
        sender,
        sender_vertical!inner (
          vertical:vertical_id (
            vertical_name
          )
        )
      `)
      .eq('id', tollFreeData.sender_id)
      .single()

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'Sender not found' }), 
        { 
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
          },
          status: 404 
        }
      )
    }

    // Extract the vertical names from the nested structure
    const verticals = data.sender_vertical.map(sv => sv.vertical.vertical_name)

    // Get Firecrawl API key from environment
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable is not set')
    }

    let ctaLanguage = 'Default CTA language'
    if (data.cta) {
      try {
        console.log('Scraping CTA URL:', data.cta)
        const firecrawlUrl = `https://api.firecrawl.dev/scrape?url=${encodeURIComponent(data.cta)}`
        
        const firecrawlRes = await fetch(firecrawlUrl, {
          headers: { 'Authorization': `Bearer ${firecrawlApiKey}` }
        })

        if (!firecrawlRes.ok) {
          throw new Error('Failed to scrape CTA')
        }

        const scrapedData = await firecrawlRes.json()
        
        // Extract CTA language from markdown content
        if (scrapedData.content) {
          ctaLanguage = extractCtaLanguage(scrapedData.content)
        }
        
        console.log('Extracted CTA language:', ctaLanguage)
      } catch (error) {
        console.error('Error processing CTA:', error)
        // Continue with default CTA language if processing fails
      }
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    // Generate use case for each vertical
    const useCase = await Promise.all(verticals.map(async (vertical) => {
      try {
        const prompt = `Using the following CTA text as context to understand the site's tone and messaging, create a compliant, unique, and professional 2-3-sentence use-case description for "${data.sender}"'s SMS service in the "${vertical}" industry: '${ctaLanguage}'. The description should clearly explain how users can sign up, highlight the benefits of receiving timely updates and notifications, and ensure the language is purely informational with a strong emphasis on user consent. Do not directly quote the CTA text, and avoid any promotional language or trigger words that might alert carriers.`

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
                content: 'You are a compliance-focused assistant that creates professional use-case descriptions for SMS services. You prioritize clear opt-in processes, user consent, and informational language while avoiding promotional content or carrier-flagged terms.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 200,
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

        const description = openaiData.choices[0].message.content.trim()
        
        // Return the description for the first vertical
        if (vertical === verticals[0]) {
          return new Response(
            JSON.stringify({ useCase: description }),
            { 
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'http://localhost:5173'
              },
              status: 200 
            }
          )
        }
      } catch (error) {
        return new Response(
          JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Failed to generate use case description',
            details: {
              vertical,
              sender: data.sender
            }
          }),
          { 
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': 'http://localhost:5173'
            },
            status: 500 
          }
        )
      }
    }))

    // Get the first response since we only need one use case
    return useCase[0]

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:5173'
        },
        status: 500 
      }
    )
  }
}) 