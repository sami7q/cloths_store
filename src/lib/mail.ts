import "server-only";
import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { db } from "./db";
import { messages } from "./i18n";
import { OrderConfirmationEmail } from "@/emails/order-confirmation";
import { OrderStatusEmail } from "@/emails/order-status";

/**
 * Mail — Nodemailer over SMTP from env. When SMTP is not configured the email
 * is skipped (logged) so checkout never fails on mail. Always best-effort.
 */

function transport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

export async function sendOrderConfirmation(params: {
  to: string;
  orderNumber: string;
  name: string;
  lines: { name: string; quantity: number; total: number }[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  codFee: number;
  grandTotal: number;
  currency: string;
}): Promise<void> {
  try {
    const settings = await db.storeSettings.findUnique({ where: { id: 1 } });
    const storeName = settings?.name ?? "Store";
    const t = messages.email;

    const html = await render(
      OrderConfirmationEmail({
        storeName,
        orderNumber: params.orderNumber,
        name: params.name,
        lines: params.lines,
        subtotal: params.subtotal,
        discountTotal: params.discountTotal,
        shippingTotal: params.shippingTotal,
        codFee: params.codFee,
        grandTotal: params.grandTotal,
        currency: params.currency,
        strings: {
          preview: `${t.orderConfirmed} — ${params.orderNumber}`,
          greeting: t.greeting,
          thanks: t.thanks,
          subtotal: t.subtotal,
          discount: t.discount,
          shipping: t.shipping,
          codFee: t.codFee,
          total: t.total,
          footer: `${storeName} — ${t.footer}`,
        },
      }),
    );

    const tx = transport();
    if (!tx) {
      console.log(`[mail] SMTP not configured — skipping order email for ${params.orderNumber} → ${params.to}`);
      return;
    }
    await tx.sendMail({
      from: process.env.SMTP_FROM ?? `no-reply@localhost`,
      to: params.to,
      subject: `${t.orderConfirmed} — ${params.orderNumber}`,
      html,
    });
  } catch (e) {
    // Never fail the order because of mail.
    console.error("[mail] order confirmation failed:", e);
  }
}

export async function sendOrderStatusUpdate(params: {
  to: string;
  orderNumber: string;
  name: string;
  statusLabel: string;
  trackingNumber: string | null;
  note: string | null;
}): Promise<boolean> {
  try {
    const settings = await db.storeSettings.findUnique({ where: { id: 1 } });
    const storeName = settings?.name ?? "Store";
    const t = messages.email;

    const html = await render(
      OrderStatusEmail({
        storeName,
        orderNumber: params.orderNumber,
        name: params.name,
        statusLabel: params.statusLabel,
        trackingNumber: params.trackingNumber,
        note: params.note,
        strings: {
          preview: `${t.statusUpdate} — ${params.orderNumber}`,
          greeting: t.greeting,
          statusNow: t.statusNow,
          trackingLabel: t.trackingLabel,
          footer: `${storeName} — ${t.statusFooter}`,
        },
      }),
    );

    const tx = transport();
    if (!tx) {
      console.log(`[mail] SMTP not configured — skipping status email for ${params.orderNumber} → ${params.to}`);
      return false;
    }
    await tx.sendMail({
      from: process.env.SMTP_FROM ?? `no-reply@localhost`,
      to: params.to,
      subject: `${t.statusUpdate} — ${params.orderNumber} — ${params.statusLabel}`,
      html,
    });
    return true;
  } catch (e) {
    console.error("[mail] status update failed:", e);
    return false;
  }
}
