import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Verify authentication
async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Missing Authorization header')
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  )
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('User not found')
  
  return user
}

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
      headers: { ...corsHeaders }
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

    // Get the 10DLC record to get the sender_id
    const { data: tenDLCData, error: tenDLCError } = await supabaseClient
      .from('tendlc')
      .select(`
        sender_id,
        sender:sender_id (
          sender,
          brand,
          company,
          vertical:sender_vertical (
            vertical:vertical_id (
              vertical_name
            )
          )
        )
      `)
      .eq('id', id)
      .single()

    if (tenDLCError || !tenDLCData) {
      return new Response(
        JSON.stringify({ error: '10DLC record not found' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      )
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found')
    }

    // Extract business details
    const businessName = tenDLCData.sender?.brand || tenDLCData.sender?.company || ''
    const verticals = tenDLCData.sender?.vertical
      ?.map(v => v.vertical?.vertical_name)
      .filter(Boolean) || []

    // Generate the use case using OpenAI
    const prompt = `Generate a concise use case description for a 10DLC (10-Digit Long Code) SMS campaign. Here are the details:

Business: ${businessName}
Industry/Vertical: ${verticals.join(', ')}
Sender ID: ${tenDLCData.sender?.sender}

The use case should:
1. Clearly explain how the business will use SMS messaging
2. Describe the types of messages that will be sent
3. Mention the target audience
4. Include any relevant compliance information
5. Be written in a professional tone
6. Be no longer than 250 characters

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
            content: 'You are a helpful assistant that generates concise and professional use case descriptions for 10DLC SMS campaigns.'
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