import { test, expect } from "@playwright/test";
import { loginAsAdmin, runId } from "./helpers";

/**
 * Flow 2 — admin product CRUD.
 *
 * Creates a product through the tabbed editor (General → Pricing → Variants
 * matrix → Visibility), verifies it is live on the storefront PDP, then
 * archives it and verifies the PDP 404s. Names/SKUs/slugs carry a per-run
 * suffix so retries and repeated runs never collide.
 */

test("admin creates, activates, verifies live, then archives a product", async ({ page }, testInfo) => {
  // Per-attempt tag: retries must not collide on the unique slug/SKU.
  const tag = `${runId}${testInfo.retry ? `r${testInfo.retry}` : ""}`;
  const productName = `E2E Product ${tag}`;
  const productSlug = `e2e-product-${tag}`;
  const baseSku = `E2E-${tag.toUpperCase()}`;

  await loginAsAdmin(page);

  // -- General tab: create as DRAFT ------------------------------------------
  await page.goto("/admin/products/new");
  await page.getByLabel("Name (English)").fill(productName);
  await page.getByLabel("Name (Arabic)").fill("منتج تجريبي");
  await expect(page.getByLabel("Slug")).toHaveValue(productSlug);
  await page.getByLabel("Base SKU").fill(baseSku);
  await page.getByLabel("Description (English)").fill("End-to-end test product.");
  await page.getByLabel("Description (Arabic)").fill("منتج اختبار شامل.");
  await page.locator('select[name="categoryId"]').selectOption({ index: 1 });
  await page.getByRole("button", { name: "Create" }).click();

  // Editor redirects to /admin/products/[id] and unlocks the other tabs.
  await page.waitForURL((url) => /^\/admin\/products\/(?!new$)[^/]+$/.test(url.pathname));
  const editorUrl = page.url();

  // -- Pricing tab -----------------------------------------------------------
  await page.getByRole("button", { name: "Pricing" }).click();
  await page.getByLabel(/^Base price/).fill("500");
  await page.getByLabel(/^Compare-at price/).fill("650");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Product saved.")).toBeVisible();

  // -- Variants matrix: 1 color × 2 sizes, stock via bulk edit ---------------
  await page.getByRole("button", { name: "Variants" }).click();
  await page.getByRole("button", { name: "Add color" }).click();
  await page.getByPlaceholder("Color name").fill("Black");
  await page.getByPlaceholder("Comma-separated, e.g. 36,37,38").fill("40, 41");
  await page.getByRole("button", { name: "Generate rows" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  // SKU cells are inputs; the first input in a row is its SKU field.
  await expect(page.locator("tbody tr").first().locator("input").first()).toHaveValue(`${baseSku}-BLA-40`);

  // Bulk stock input renders above the matrix table — first number input.
  await page.locator('input[type="number"]').first().fill("5");
  await page.getByRole("button", { name: "Apply to all" }).click();
  await page.getByRole("button", { name: "Save variants" }).click();
  await expect(page.getByText("Variants saved.")).toBeVisible();

  // -- Visibility tab: DRAFT → ACTIVE ----------------------------------------
  await page.getByRole("button", { name: "Visibility" }).click();
  await page.locator('select[name="status"]').selectOption("ACTIVE");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Product saved.")).toBeVisible();

  // -- Storefront: product is live with variants and price -------------------
  // Scoped to the PDP options block — related-product cards render their own
  // size chips further down the page.
  await page.goto(`/product/${productSlug}`);
  await expect(page.locator("h1").filter({ hasText: productName })).toBeVisible();
  const pdpOptions = page.locator("[data-pdp-options]");
  await expect(pdpOptions.getByRole("button", { name: "40", exact: true })).toBeVisible();
  await expect(pdpOptions.getByRole("button", { name: "41", exact: true })).toBeVisible();
  await expect(page.getByText("500 EGP").first()).toBeVisible();

  // -- Archive: product disappears from the storefront -----------------------
  await page.goto(editorUrl);
  await page.getByRole("button", { name: "Visibility" }).click();
  await page.locator('select[name="status"]').selectOption("ARCHIVED");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Product saved.")).toBeVisible();

  const response = await page.goto(`/product/${productSlug}`);
  expect(response?.status()).toBe(404);
});
