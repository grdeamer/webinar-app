import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

type AdminProfile = {
  role: string | null
  is_active: boolean | null
}

type RequireAdminResult = {
  user: User
  profile: AdminProfile
}

export async function requireAdmin(): Promise<RequireAdminResult> {
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
    .maybeSingle<AdminProfile>()

  if (profileError || !profile || profile.role !== "admin" || profile.is_active === false) {
    redirect("/admin/login")
  }

  return {
    user,
    profile,
  }
}