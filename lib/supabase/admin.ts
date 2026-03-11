import { createClient, type SupabaseClient } from "@supabase/supabase-js"

function must(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

export function createSupabaseAdminClient(): SupabaseClient {
  return createClient(
    must("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    must("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { persistSession: false } }
  )
}

export const supabaseAdmin = createSupabaseAdminClient()
