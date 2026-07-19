import { test, expect, type Page } from "@playwright/test";
import { parseMoney } from "./helpers";

/**
 * Flow 1 — browse → cart → COD checkout (guest).
 *
 * Adds two different products (two units total) so the seeded multi-buy
 * promo ("2nd item -15%") must appear as a savings line, then walks the
 * 5-step checkout with COD and verifies the confirmation page shows the
 * same grand total the review step quoted.
 */

/** On a PDP: pick the first in-stock size and add one unit to the cart. */
async function addCurrentProductToCart(page: Page): Promise<string> {
  const name = (await page.locator("h1").first().innerText()).trim();
  const sizeButtons = page
    .locator("fieldset")
    .filter({ has: page.getByText("Size", { exact: true }) })
    .locator("button:enabled");
  await sizeButtons.first().click();
  const addButton = page.getByRole("button", { name: "Add to cart" }).first();
  await expect(addButton).toBeEnabled();
  await addButton.click();
  return name;
}

test("guest browses, gets the multi-buy promo in cart, and checks out with COD", async ({ page }) => {
  // -- Browse: grab two distinct products from the homepage ------------------
  await page.goto("/");
  const productLinks = page.locator('a[href^="/product/"]');
  await expect(productLinks.first()).toBeVisible();
  const hrefs: string[] = await productLinks.evaluateAll((anchors) => [
    ...new Set(anchors.map((a) => a.getAttribute("href")).filter((h): h is string => Boolean(h))),
  ]);
  expect(hrefs.length).toBeGreaterThanOrEqual(2);

  const names: string[] = [];
  for (const href of hrefs.slice(0, 2)) {
    await page.goto(href);
    names.push(await addCurrentProductToCart(page));
  }

  // -- Cart: both lines present, promo engine applied live -------------------
  await page.goto("/cart");
  for (const name of names) {
    await expect(page.getByRole("link", { name }).first()).toBeVisible();
  }
  // Savings breakdown line from the seeded BUY_X_GET_DISCOUNT rule.
  await expect(page.getByText(/Multi-buy/).first()).toBeVisible();

  await page.getByRole("button", { name: "Checkout" }).click();
  await page.waitForURL("**/checkout");

  // -- Contact ---------------------------------------------------------------
  await page.getByLabel("Full name").fill("E2E Tester");
  // exact: the footer newsletter input is also labeled with an email string.
  await page.getByLabel("Email", { exact: true }).fill("e2e-checkout@test.local");
  await page.getByLabel("Phone").fill("01000000001");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // -- Address ---------------------------------------------------------------
  await page.getByLabel("City").fill("Cairo");
  await page.getByLabel("Street").fill("12 Test Street");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // -- Shipping: matched zone is displayed -----------------------------------
  await expect(page.getByText("Shipping zone")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // -- Payment: COD (card is unconfigured in the test environment) -----------
  const codRadio = page.getByRole("radio", { name: "Cash on delivery" });
  await expect(codRadio).toBeChecked();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // -- Review: promo still applied; capture the quoted grand total -----------
  await expect(page.getByText(/Multi-buy/).first()).toBeVisible();
  const totalCell = page.locator("aside dl > div").last().locator("dd");
  await expect(totalCell).not.toHaveText("…");
  const reviewTotal = parseMoney(await totalCell.innerText());
  expect(reviewTotal).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Place order" }).click();

  // -- Confirmation ----------------------------------------------------------
  await page.waitForURL(/\/checkout\/success\?order=ORD-\d+/);
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  await expect(page.getByText(/^ORD-\d+$/)).toBeVisible();

  const orderNumber = new URL(page.url()).searchParams.get("order");
  expect(orderNumber).toMatch(/^ORD-\d+$/);

  // Totals consistency: the confirmation shows the same server-computed
  // grand total the review step quoted.
  const successTotal = parseMoney(
    await page.locator(`text=/^ORD-\\d+$/`).locator("xpath=following-sibling::p[1]").innerText(),
  );
  expect(successTotal).toBeCloseTo(reviewTotal, 2);
});
