import { type Browser, expect, type Page, test } from "@playwright/test";
import { execFileSync } from "node:child_process";

// The demo script as a test: customer sends a request → dispatcher offers it → owner accepts and
// schedules a technician → technician taps On my way, Start work, Done → customer confirms and
// rates. Each person has their own browser context, as if on their own device.

// A unique address for each run (phone and laptop each get their own), so a run only ever
// touches its own job. Set at the start of the test.
let address = "";

/** Runs a database step from e2e/db.ts and returns what it printed. */
function dbStep(command: "history" | "cleanup") {
  return execFileSync("node_modules/.bin/tsx", ["e2e/db.ts", command, address], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

test.afterAll(() => {
  if (address) dbStep("cleanup");
});

/** A new browser context (like another device) signed in as one of the demo staff. */
async function signInAs(browser: Browser, userId: string) {
  const context = await browser.newContext(test.info().project.use);
  await context.request.post("/api/session", { data: { userId } });
  return context.newPage();
}

/** This job's row (laptop table) or card (phone), whichever is showing. */
function job(page: Page) {
  return page.locator("tr, .MuiPaper-root").filter({ hasText: address, visible: true }).last();
}

test("a job goes from request to rating", async ({ page, browser }) => {
  address = `${Date.now()} ${test.info().project.name} Test Ave, Springfield, IL`;

  // 1. Customer sends a request
  await page.goto("/request");
  await page.getByRole("button", { name: "Skip, enter the details" }).click();
  await page.getByLabel("Service needed").selectOption("Fire safety inspection");
  await page.getByLabel("Address where the work is needed").fill(address);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Your name").fill("E2E Customer");
  await page.getByLabel("Phone").fill("555-0100");
  await page.getByRole("button", { name: /Send request/ }).click();
  await expect(page.getByText("Request sent")).toBeVisible();
  const trackingUrl = await page.getByLabel("Your tracking link").inputValue();
  await page.goto(trackingUrl);
  await expect(page.locator('[aria-current="step"]')).toContainText("Business assigned");

  // 2. Dispatcher offers it to ABC Fire Safety (suggested first, since it offers the service)
  const dana = await signInAs(browser, "demo_dispatcher");
  await dana.goto("/dispatch");
  await job(dana).getByRole("button", { name: "Offer to business" }).click();
  await dana.getByRole("dialog").getByRole("button", { name: "Offer to ABC Fire Safety" }).click();
  await expect(job(dana)).toContainText("ABC Fire Safety");

  // 3. Owner: no customer details or tracking link on the offer; accepts, then schedules Alex
  const omar = await signInAs(browser, "demo_owner_abc");
  await omar.goto("/jobs");
  await expect(job(omar).getByRole("button", { name: "Copy link" })).toHaveCount(0);
  await job(omar).getByRole("button", { name: "Accept" }).click();
  await expect(job(omar)).toContainText("E2E Customer, 555-0100");
  await job(omar).getByRole("button", { name: "Schedule visit" }).click();
  await omar.getByRole("dialog").getByLabel("Alex Kim").check();
  await omar.getByRole("dialog").getByRole("button", { name: "Schedule" }).click();
  await expect(job(omar)).toContainText("Alex Kim");

  // 4. Technician: only his own buttons, then each step in turn
  const alex = await signInAs(browser, "demo_tech_alex");
  await alex.goto("/jobs");
  await expect(job(alex).getByRole("button", { name: "Accept" })).toHaveCount(0);
  for (const step of ["On my way", "Start work", "Done"]) {
    await job(alex).getByRole("button", { name: step, exact: true }).click();
    await expect(job(alex).getByRole("button", { name: step, exact: true })).toHaveCount(0);
  }

  // 5. Customer: every step but the last is done; confirms, then rates
  await page.reload();
  await expect(page.locator('[aria-current="step"]')).toContainText("You confirm");
  await page.getByRole("button", { name: "Yes, the work is done" }).click();
  await expect(page.getByText("How did ABC Fire Safety do?")).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveCount(0);
  // The star inputs are visually hidden behind the star icons, so click the input directly.
  await page.getByLabel("5 stars, Excellent").evaluate((el: HTMLElement) => el.click());
  await page.getByRole("button", { name: "Send rating" }).click();
  await expect(page.getByText("Thanks! Your 5-star rating was saved.")).toBeVisible();

  // The history records who did each step
  expect(JSON.parse(dbStep("history"))).toEqual([
    "NEW by customer",
    "OFFERED by Dana Lee",
    "ACCEPTED by Omar Hassan",
    "SCHEDULED by Omar Hassan",
    "ON_THE_WAY by Alex Kim",
    "IN_PROGRESS by Alex Kim",
    "DONE by Alex Kim",
    "CONFIRMED by customer",
  ]);
});
