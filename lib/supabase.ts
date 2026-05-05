import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// This uses the Service Role Key, meaning it should ONLY be used in Server Actions/API routes.
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey)