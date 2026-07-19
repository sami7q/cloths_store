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

/** True when SMTP env vars are present (Settings module status display). */
export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

/** Plain SMTP round-trip test for the Settings module (§6.16). */
export async function sendTestEmail(to: string): Promise<boolean> {
  const tx = transport();
  if (!tx) {
    console.log(`[mail] SMTP not configured — cannot send test email to ${to}`);
    return false;
  }
  try {
    const settings = await db.storeSettings.findUnique({ where: { id: 1 } });
    await tx.sendMail({
      from: process.env.SMTP_FROM ?? `no-reply@localhost`,
      to,
      subject: `SMTP test — ${settings?.name ?? "Store"}`,
      text: "SMTP is configured correctly.",
    });
    return true;
  } catch (e) {
    console.error("[mail] test email failed:", e);
    return false;
  }
}

/** Staff-invite email carrying the one-time temporary password (§6.13). */
export async function sendStaffInvite(params: {
  to: string;
  name: string;
  tempPassword: string;
}): Promise<boolean> {
  try {
    const settings = await db.storeSettings.findUnique({ where: { id: 1 } });
    const storeName = settings?.name ?? "Store";
    const t = messages.email;

    const html = await render(
      OrderStatusEmail({
        storeName,
        orderNumber: storeName,
        name: params.name,
        statusLabel: params.tempPassword,
        trackingNumber: null,
        note: null,
        strings: {
          preview: t.staffInviteSubject,
          greeting: t.greeting,
          statusNow: t.staffInviteIntro,
          trackingLabel: "",
          footer: storeName,
        },
      }),
    );

    const tx = transport();
    if (!tx) {
      console.log(`[mail] SMTP not configured — skipping staff invite → ${params.to}`);
      return false;
    }
    await tx.sendMail({
      from: process.env.SMTP_FROM ?? `no-reply@localhost`,
      to: params.to,
      subject: `${t.staffInviteSubject} — ${storeName}`,
      html,
    });
    return true;
  } catch (e) {
    console.error("[mail] staff invite failed:", e);
    return false;
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
