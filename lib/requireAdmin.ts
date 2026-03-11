import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/admin/login")
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile || profile.role !== "admin" || profile.is_active === false) {
    redirect("/admin/login")
  }

  return { user, profile }
}