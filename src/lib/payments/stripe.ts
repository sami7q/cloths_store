import "server-only";
import Stripe from "stripe";

/**
 * Stripe provider — enabled only when STRIPE_SECRET_KEY is set. Amounts are
 * server-computed; the checkout session carries the order id in metadata and
 * the webhook (api/webhooks/stripe) confirms payment via signature check.
 */

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe not configured");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

function baseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export async function createStripeCheckout(params: {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  email: string;
}): Promise<string | null> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: Math.round(params.amount * 100),
          product_data: { name: `Order ${params.orderNumber}` },
        },
      },
    ],
    metadata: { orderId: params.orderId, orderNumber: params.orderNumber },
    success_url: `${baseUrl()}/checkout/success?order=${params.orderNumber}`,
    cancel_url: `${baseUrl()}/checkout?cancelled=1`,
  });
  return session.url;
}
