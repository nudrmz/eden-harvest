import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveNextPath(searchParams);
  const type = searchParams.get("type");

  if (!code) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "message",
      "That email link is invalid or has expired. Please try again."
    );
    return NextResponse.redirect(loginUrl);
  }

  const destination = new URL(next, origin);
  if (
    next === "/login" &&
    (type === "signup" || type === "email" || type === "invite" || !type)
  ) {
    destination.searchParams.set(
      "message",
      "Email confirmed. You can sign in now."
    );
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "message",
      "That email link is invalid or has expired. Please try again."
    );
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
