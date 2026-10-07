import "server-only";
import Stripe from "stripe";

/**
 * Server-only Stripe client. NEVER import this file from anything that can
 * end up in a client bundle (a "use client" component, or a module such a
 * component imports) — it reads STRIPE_SECRET_KEY. Only import it from files
 * under app/api/** /route.ts, which Next.js never bundles for the browser.
 */

let cached: Stripe | null = null;

export function getStripeServerClient(): Stripe {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured — set STRIPE_SECRET_KEY.");
  }

  cached = new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil"
  });
  return cached;
}
