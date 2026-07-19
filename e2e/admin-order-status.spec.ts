import { test, expect } from "@playwright/test";
import { loginAsAdmin, runId } from "./helpers";

/**
 * Flow 3 — admin order status change.
 *
 * Opens the newest seeded order from the orders list, changes its status
 * with a note, and verifies the success feedback, the updated status pill,
 * and the new status-history (timeline) entry carrying the note.
 */

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

const note = `E2E status note ${runId}`;

test("admin changes an order's status with a note; timeline records it", async ({ page }) => {
  await loginAsAdmin(page);

  // -- Open the first order from the list (rows navigate on click) -----------
  await page.goto("/admin/orders");
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible();
  await firstRow.locator("td").nth(1).click();
  await page.waitForURL(/\/admin\/orders\/ORD-\d+/);
  const orderNumber = new URL(page.url()).pathname.split("/").pop()!;
  await expect(page.getByRole("heading", { name: `Order ${orderNumber}` })).toBeVisible();

  // -- Change status: the select only offers statuses ≠ current --------------
  const statusSelect = page.locator('select[name="toStatus"]');
  const target = await statusSelect.locator("option:not([disabled])").first().getAttribute("value");
  expect(target, "status select should offer at least one transition").toBeTruthy();
  const targetLabel = STATUS_LABELS[target!];
  expect(targetLabel, `unexpected status value ${target}`).toBeTruthy();

  await statusSelect.selectOption(target!);
  await page.locator('input[name="note"]').fill(note);
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText("Status updated.")).toBeVisible();

  // -- Verify: header pill + timeline entry with the note --------------------
  await page.reload();
  const pageHeader = page
    .locator("header")
    .filter({ has: page.getByRole("heading", { name: `Order ${orderNumber}` }) });
  await expect(pageHeader.getByText(targetLabel, { exact: true })).toBeVisible();

  const history = page.locator("section").filter({ hasText: "Status history" });
  await expect(history.getByText(note)).toBeVisible();
  // History is chronological (asc) — the newest entry is last and carries
  // the new status pill.
  await expect(history.locator("ol > li").last().getByText(targetLabel, { exact: true })).toBeVisible();
});
