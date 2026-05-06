import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// We use the Service Role Key to bypass Row Level Security (RLS) during uploads
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)