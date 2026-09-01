import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Refresh sessions only on auth-sensitive routes. Public pages (/, /browse,
     * /listing/*, /seller/*) skip middleware so first paint is not blocked by
     * a Supabase getUser() round trip on every visit.
     */
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/seller/listings/:path*",
    "/login",
    "/register",
    "/settings",
    "/profile"
  ]
};