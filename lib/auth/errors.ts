export function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("user already registered") || normalized.includes("already been registered")) {
    return "Email already registered";
  }
  if (normalized.includes("invalid login credentials") || normalized.includes("invalid email or password")) {
    return "Invalid email or password";
  }
  if (normalized.includes("password should be at least")) {
    return "Password is too short — use at least 6 characters";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before signing in";
  }
  if (
    normalized.includes("rate limit") ||
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("email rate limit")
  ) {
    return "Email sending is temporarily limited (Supabase allows only a few auth emails per hour). Wait about an hour, then try again — or check your inbox for an earlier reset/confirmation email.";
  }
  if (
    normalized.includes("same password") ||
    normalized.includes("should be different")
  ) {
    return "New password must be different from your current password";
  }
  if (
    normalized.includes("could not find the table") &&
    normalized.includes("users")
  ) {
    return "Database not set up yet. In Supabase → SQL Editor, run the migrations in supabase/migrations/ (init first, then auth trigger).";
  }

  return message;
}
