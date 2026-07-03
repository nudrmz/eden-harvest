import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Refresh Supabase sessions on app pages only — skip static assets and API
     * routes to avoid timeouts. Route groups like (buyer)/(seller) are not in URLs.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};