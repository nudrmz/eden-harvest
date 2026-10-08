import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { FIRST_TOUCH_COOKIE, firstTouchMetadata, parseFirstTouch } from "@/lib/campaigns";

/** Accounts created within this window count as new sign-ups for attribution. */
const NEW_ACCOUNT_WINDOW_MS = 15 * 60 * 1000;

const INVALID_LINK = "That email link is invalid or has expired. Please try again.";
const CONFIRMED_PLEASE_SIGN_IN = "Email confirmed. You can sign in now.";

function resolveNextPath(searchParams: URLSearchParams): string {
  const nextParam = searchParams.get("next");
  if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    return nextParam;
  }

  const type = searchParams.get("type");
  if (type === "recovery") return "/reset-password";
  if (type === "signup" || type === "email" || type === "invite") {
    return "/login";
  }
  return "/";
}

/** Supabase appends its own reason when the token itself was rejected. */
function providerError(searchParams: URLSearchParams): string | null {
  if (!searchParams.get("error") && !searchParams.get("error_code")) return null;

  if (searchParams.get("error_code") === "otp_expired") {
    return "That confirmation link has expired. Request a new one below.";
  }

  const description = searchParams.get("error_description");
  return description ? description.replace(/\+/g, " ") : INVALID_LINK;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = resolveNextPath(searchParams);

  // Carry the destination over as ?redirect so signing in by hand still lands
  // on the step the link was taking them to, instead of the generic home page.
  const bounceToLogin = (message: string) => {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("message", message);
    if (next !== "/login") {
      loginUrl.searchParams.set("redirect", next);
    }
    return NextResponse.redirect(loginUrl);
  };

  const rejected = providerError(searchParams);
  if (rejected) return bounceToLogin(rejected);

  if (!code && !tokenHash) {
    return bounceToLogin(INVALID_LINK);
  }

  const destination = new URL(next, origin);
  if (
    next === "/login" &&
    (type === "signup" || type === "email" || type === "invite" || !type)
  ) {
    destination.searchParams.set("message", CONFIRMED_PLEASE_SIGN_IN);
  }

  let response = NextResponse.redirect(destination);

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
          response = NextResponse.redirect(destination);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  // token_hash verifies against the server and works in any browser. The PKCE
  // code path needs the verifier cookie signUp wrote, so it only works in the
  // browser that requested the email.
  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({
        type: (type as EmailOtpType | null) ?? "email",
        token_hash: tokenHash
      })
    : await supabase.auth.exchangeCodeForSession(code as string);

  if (error) {
    console.error("auth callback:", error.message);

    // Reaching here with a code means Supabase already verified the address on
    // its own /verify endpoint — only the session handoff failed. Say so, so a
    // mail-app webview opening the link doesn't look like a broken account.
    if (/code verifier/i.test(error.message)) {
      return bounceToLogin(CONFIRMED_PLEASE_SIGN_IN);
    }

    return bounceToLogin(INVALID_LINK);
  }

  // Email sign-ups carry the campaign in their signUp metadata already; Google
  // sign-ups arrive here, so credit them now. Only brand-new accounts, so an
  // existing user clicking a campaign link later isn't re-attributed.
  const touch = parseFirstTouch(request.cookies.get(FIRST_TOUCH_COOKIE)?.value);
  if (touch) {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const isNew =
      user?.created_at && Date.now() - new Date(user.created_at).getTime() < NEW_ACCOUNT_WINDOW_MS;
    if (user && isNew && !user.user_metadata?.signup_source) {
      const { error: metaError } = await supabase.auth.updateUser({
        data: firstTouchMetadata(touch)
      });
      if (metaError) console.error("auth callback: attribution", metaError.message);
    }
  }

  return response;
}
