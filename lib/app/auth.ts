import { createClient } from "@/lib/supabase/server"

export async function isAdminRequest(): Promise<boolean> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return false

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) return false

  return profile.role === "admin" && profile.is_active !== false
}

export async function assertAdminRequest(): Promise<void> {
  if (!(await isAdminRequest())) {
    throw new Error("UNAUTHORIZED")
  }
}