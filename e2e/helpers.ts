import { expect, type Page } from "@playwright/test";

/** Seed admin credentials (prisma/seed.ts). */
export const ADMIN_EMAIL = "admin@store.test";
export const ADMIN_PASSWORD = "Admin123!";

/** Unique per-run suffix so create-flows stay retry- and re-run-safe. */
export const runId = Date.now().toString(36);

/** Sign in through the real login form and land on /admin. */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login?callbackUrl=%2Fadmin");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin");
  await expect(page.locator("h1").first()).toBeVisible();
}

/** Parse "3,075.65 EGP" / "500 EGP" into a number for cross-page comparisons. */
export function parseMoney(text: string): number {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) throw new Error(`Cannot parse money from: "${text}"`);
  return value;
}
