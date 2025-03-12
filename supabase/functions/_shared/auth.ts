import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function verifyAuth(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      throw new Error('Missing access token')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error } = await supabaseClient.auth.getUser(token)
    if (error) throw error
    if (!user) throw new Error('User not found')

    return user
  } catch (error) {
    console.error('Auth error:', error)
    throw new Error('Unauthorized')
  }
} 