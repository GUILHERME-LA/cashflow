import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_ROUTES = ["/login", "/auth", "/"]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && !isPublicRoute) {
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role_id, roles!inner(name)")
      .eq("user_id", user.id)

    const roles = (roleCheck as unknown as Array<{ roles: { name: string } }>) ?? []
    const roleNames = roles.map((r) => r.roles?.name).filter(Boolean)
    const hasAccess = roleNames.includes("admin") || roleNames.includes("cashflow_user")

    if (!hasAccess) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("error", "no_access")
      return NextResponse.redirect(url)
    }
  }

  if (user && isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
