import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser } from "@/lib/auth/admin";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/seller/listings", "/admin"];
const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

/**
 * Where a signed-in user belongs when they hit an auth page.
 *
 * Seller-ness comes from the seller_profiles row, not user_metadata.role:
 * Google sign-ins carry no role claim, so metadata alone would strand a fully
 * onboarded Google seller on the buyer home page. A seller who started
 * onboarding but never finished has no row yet, and /dashboard would only walk
 * them into the "complete onboarding first" guard on the listing form.
 */
async function landingPathFor(supabase: SupabaseClient, user: User): Promise<string> {
  const { data: profile } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile) return "/dashboard";

  // Only email signups record the intended role before onboarding runs.
  return user.user_metadata?.role === "seller" ? "/onboarding" : "/";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute && user && !isAdminUser(user)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (
      redirectParam &&
      redirectParam.startsWith("/") &&
      !redirectParam.startsWith("//")
    ) {
      redirectUrl.pathname = redirectParam;
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    redirectUrl.pathname = await landingPathFor(supabase, user);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
