import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from '@supabase/supabase-js'
import { verifyAuth } from '../_shared/auth.ts'

console.log('Function "check-firecrawl" up and running!')

Deno.serve(async (req) => {
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

    // Get the request body
    const { id, sender } = await req.json()

    if (!id || !sender) {
      throw new Error('Missing required fields: id and sender are required')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Your Firecrawl check logic here
    const responseData = {
      message: 'Firecrawl check completed',
      id: id,
      sender: sender
    }

    return new Response(JSON.stringify(responseData), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:5173'
      },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:5173'
      },
      status: 400,
    })
  }
}) 