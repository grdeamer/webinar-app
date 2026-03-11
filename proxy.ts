import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}

function unauthorizedApi() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow the legacy admin login page path if it still exists.
  if (pathname === "/admin/login") {
    return NextResponse.next()
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (pathname.startsWith("/api/admin/")) {
      return unauthorizedApi()
    }

    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle()

  const isAdmin = profile?.role === "admin"
  const isActive = profile?.is_active !== false

  if (profileError || !isAdmin || !isActive) {
    if (pathname.startsWith("/api/admin/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return res
}