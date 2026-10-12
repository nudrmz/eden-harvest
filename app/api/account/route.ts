import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe/server";
import { getStreamServerClient } from "@/lib/stream/server";
import { PHOTO_BUCKET } from "@/lib/storage/photos";

/** What the user must type to confirm; checked here as well as in the UI. */
const DELETE_CONFIRM_WORD = "DELETE";

/** Every photo is uploaded to <userId>/<kind>/..., so these folders hold them all. */
async function deleteUserPhotos(admin: SupabaseClient, userId: string): Promise<number> {
  const bucket = admin.storage.from(PHOTO_BUCKET);
  const paths: string[] = [];
  for (const folder of [userId, `${userId}/farm`, `${userId}/listing`]) {
    const { data } = await bucket.list(folder, { limit: 1000 });
    for (const entry of data ?? []) {
      // Folders come back with a null id; only collect files.
      if (entry.id) paths.push(`${folder}/${entry.name}`);
    }
  }
  if (paths.length) {
    const { error } = await bucket.remove(paths);
    if (error) throw new Error(error.message);
  }
  return paths.length;
}

/**
 * Permanently delete the signed-in user's account and everything tied to it:
 * Stripe customer (cancels any subscription), Stream chat user + messages +
 * conversations, uploaded photos, and every database row, then the sign-in
 * itself.
 *
 * Rows are deleted explicitly rather than trusting ON DELETE CASCADE, because
 * the live database is missing some foreign keys (see listings_seller_fk).
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm?.trim().toUpperCase() !== DELETE_CONFIRM_WORD) {
    return NextResponse.json({ error: `Type ${DELETE_CONFIRM_WORD} to confirm.` }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error("delete account: SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "Account deletion is unavailable right now." }, { status: 500 });
  }

  const userId = user.id;
  const log = (msg: string) => console.info(`delete account ${userId}: ${msg}`);

  const [{ data: profile }, { data: sellerProfiles }] = await Promise.all([
    admin
      .from("users")
      .select("stripe_customer_id, stripe_subscription_id, membership_tier")
      .eq("id", userId)
      .maybeSingle(),
    admin.from("seller_profiles").select("id").eq("user_id", userId)
  ]);
  const sellerIds = (sellerProfiles ?? []).map((s) => s.id as string);

  // 1. Stripe first: if billing can't be stopped, stop here so nobody is
  //    charged for an account that no longer exists. Deleting the customer
  //    cancels its subscriptions immediately.
  const customerId = profile?.stripe_customer_id as string | null | undefined;
  if (customerId) {
    try {
      await getStripeServerClient().customers.del(customerId);
      log("stripe customer deleted");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Already gone in Stripe is fine; anything else blocks deletion.
      if (!/no such customer/i.test(message)) {
        console.error("delete account: stripe", message);
        return NextResponse.json(
          {
            error:
              "We couldn't cancel your subscription, so your account hasn't been deleted. Please try again or contact support@edenharvest.app."
          },
          { status: 502 }
        );
      }
    }
  }

  // 2. Chat: the user, their messages and their conversations. Stream runs
  //    this as a background task; a failure here is logged, not fatal.
  try {
    await getStreamServerClient().deleteUsers([userId], {
      user: "hard",
      messages: "hard",
      conversations: "hard"
    });
    log("stream deletion requested");
  } catch (err) {
    console.error("delete account: stream", err instanceof Error ? err.message : err);
  }

  // 3. Photos.
  try {
    log(`${await deleteUserPhotos(admin, userId)} photos deleted`);
  } catch (err) {
    console.error("delete account: photos", err instanceof Error ? err.message : err);
  }

  // 4. Database rows, children before parents.
  const steps: [string, () => PromiseLike<{ error: { message: string } | null }>][] = [
    ["reviews written", () => admin.from("reviews").delete().eq("reviewer_id", userId)],
    ["reviews received", () => admin.from("reviews").delete().eq("reviewee_id", userId)],
    ["reports made", () => admin.from("reports").delete().eq("reporter_id", userId)],
    ["reports about", () => admin.from("reports").delete().eq("reported_user_id", userId)],
    ["enquiries sent", () => admin.from("enquiries").delete().eq("buyer_id", userId)]
  ];
  if (sellerIds.length) {
    steps.push(
      ["enquiries received", () => admin.from("enquiries").delete().in("seller_id", sellerIds)],
      ["listings", () => admin.from("listings").delete().in("seller_id", sellerIds)],
      ["seller profile", () => admin.from("seller_profiles").delete().in("id", sellerIds)]
    );
  }
  steps.push(["user record", () => admin.from("users").delete().eq("id", userId)]);

  for (const [label, run] of steps) {
    const { error } = await run();
    // A table that doesn't exist on this database holds nothing to delete.
    if (error && /could not find the table|does not exist/i.test(error.message)) {
      log(`skipped ${label}: ${error.message}`);
      continue;
    }
    if (error) {
      console.error(`delete account: ${label}`, error.message);
      return NextResponse.json(
        { error: "Something went wrong deleting your data. Please try again." },
        { status: 500 }
      );
    }
  }

  // 5. The sign-in itself (also removes campaign attribution in its metadata).
  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    console.error("delete account: auth user", authError.message);
    return NextResponse.json(
      { error: "Your data was deleted but the sign-in could not be removed. Please try again." },
      { status: 500 }
    );
  }

  log("complete");
  // Clear the now-invalid session cookies.
  await supabase.auth.signOut().catch(() => undefined);
  return NextResponse.json({ ok: true });
}
