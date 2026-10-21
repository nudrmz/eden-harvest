import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBuyerAccess } from "@/lib/access/server";

/** The signed-in user's Verified Access, as the server sees it (paid, trial or admin). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const access = await getBuyerAccess(user);
  return NextResponse.json(access, { headers: { "Cache-Control": "no-store" } });
}
