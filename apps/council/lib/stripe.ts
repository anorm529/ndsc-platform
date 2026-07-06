import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Lazily created so `next build` succeeds without STRIPE_SECRET_KEY;
 * the key is only required when a payment route actually runs.
 */
export function getStripe(): Stripe {
  if (!client) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not set.");
    }
    client = new Stripe(apiKey, {
      apiVersion: "2026-05-27.dahlia",
    });
  }
  return client;
}
