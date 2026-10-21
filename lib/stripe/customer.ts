import "server-only";
import { getStripeServerClient } from "@/lib/stripe/server";

/**
 * users.stripe_customer_id can be edited by the user themselves, so before
 * using it (billing portal, checkout) check with Stripe that the customer
 * really is theirs: tagged with their user id at checkout, or carrying the
 * same email as their sign-in. Returns null if it isn't, or doesn't exist.
 */
export async function ownStripeCustomerId(
  candidate: string | null | undefined,
  user: { id: string; email?: string | null }
): Promise<string | null> {
  if (!candidate) return null;
  try {
    const customer = await getStripeServerClient().customers.retrieve(candidate);
    if (customer.deleted) return null;
    const taggedId = customer.metadata?.eden_harvest_user_id;
    if (taggedId) return taggedId === user.id ? customer.id : null;
    const email = user.email?.trim().toLowerCase();
    return email && customer.email?.trim().toLowerCase() === email ? customer.id : null;
  } catch {
    return null;
  }
}
