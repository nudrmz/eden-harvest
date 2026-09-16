import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchUserProfile } from "@/lib/auth/profile";
import { getStreamServerClient, upsertStreamUser } from "@/lib/stream/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let streamClient;
  try {
    streamClient = getStreamServerClient();
  } catch (error) {
    console.error("Stream not configured:", error);
    return NextResponse.json({ error: "Chat is not configured." }, { status: 500 });
  }

  const profile = await fetchUserProfile(supabase, authUser.id);
  const displayName =
    profile?.full_name ?? authUser.email?.split("@")[0] ?? "Eden Harvest user";

  try {
    // Lazy, idempotent sync — keeps Stream's user record current without a
    // separate migration step or a hook into the signup flow.
    await upsertStreamUser({ id: authUser.id, name: displayName });
  } catch (error) {
    console.error("Stream upsertUser failed:", error);
    return NextResponse.json({ error: "Could not prepare chat account." }, { status: 500 });
  }

  const token = streamClient.createToken(authUser.id);

  return NextResponse.json({ token, apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY });
}
