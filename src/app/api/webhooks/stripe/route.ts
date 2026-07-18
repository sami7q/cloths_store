import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe, stripeEnabled } from "@/lib/payments/stripe";
import { sendOrderConfirmation } from "@/lib/mail";
import { toNumber } from "@/lib/format";

export async function POST(req: Request) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const payload = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const orderId = event.data.object.metadata?.orderId;
    if (orderId) {
      const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (order && order.paymentStatus !== "PAID") {
        await db.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: "PAID",
            status: "CONFIRMED",
            statusHistory: { create: { fromStatus: order.status, toStatus: "CONFIRMED", note: "Stripe payment received" } },
          },
        });
        const settings = await db.storeSettings.findUnique({ where: { id: 1 } });
        const address = order.shippingAddress as { name?: string; email?: string };
        const email = order.guestEmail ?? address.email;
        if (email) {
          await sendOrderConfirmation({
            to: email,
            orderNumber: order.orderNumber,
            name: address.name ?? "",
            lines: order.items.map((i) => ({
              name: i.nameSnapshot,
              quantity: i.quantity,
              total: toNumber(i.total),
            })),
            subtotal: toNumber(order.subtotal),
            discountTotal: toNumber(order.discountTotal),
            shippingTotal: toNumber(order.shippingTotal),
            codFee: 0,
            grandTotal: toNumber(order.grandTotal),
            currency: settings?.currency ?? "EGP",
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
