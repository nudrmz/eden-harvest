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
  if (normalized.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again";
  }
  if (
    normalized.includes("could not find the table") &&
    normalized.includes("users")
  ) {
    return "Database not set up yet. In Supabase → SQL Editor, run the migrations in supabase/migrations/ (init first, then auth trigger).";
  }

  return message;
}
