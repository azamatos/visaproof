import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Status, Method and the 404 page, against the made-up data in seed.sql.

test("says whether the data is fresh, part by part", async ({ page }) => {
  await page.goto("/status");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Is the data fresh?");
  await expect(
    page.getByText("Yes. Job boards were read 2 hours ago; they are read every 6 hours."),
  ).toBeVisible();
  const roles = page.getByRole("region", { name: "Open roles" });
  await expect(roles.getByRole("definition").first()).toHaveText("7");
  await expect(page.getByRole("region", { name: "Finding job boards" })).toContainText("Not run yet");
});

test("explains the method with live counts and the measured accuracy", async ({ page }) => {
  await page.goto("/method");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How Visaproof works");
  await expect(
    page.getByText("The posting says it sponsors a visa for this role. 1 role now."),
  ).toBeVisible();
  await expect(page.getByRole("table")).toContainText("100%");
  await expect(page.getByRole("link", { name: "hi@azamatos.com" })).toHaveAttribute(
    "href",
    "mailto:hi@azamatos.com",
  );
});

test("answers 404 for a page that doesn't exist", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page doesn't exist");
  await page.getByRole("link", { name: "Search the open roles" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Developer jobs in Europe, visa answer first",
  );
});

test("has no accessibility violations, dark and light", async ({ page }) => {
  for (const scheme of ["dark", "light"] as const)
    for (const path of ["/status", "/method", "/no-such-page"]) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        violations.map(
          (v) => `${scheme} ${path} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        ),
      ).toEqual([]);
    }
});

test("loads every page without errors in the console (the content security policy included)", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${page.url()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  for (const path of [
    "/",
    "/jobs/1",
    "/companies/greenhouse/northwind",
    "/countries/de",
    "/method",
    "/status",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  // client-side navigation too
  await page.goto("/?q=golang");
  await page.getByRole("link", { name: "Senior Backend Engineer (Go)" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Senior Backend Engineer (Go)");
  expect(errors).toEqual([]);
});

test("links the Telegram channel from the header, opening Telegram", async ({ page }) => {
  await page.goto("/method");
  // One link either way: the bell on a phone, the bell and the word on a desktop
  const telegram = page.getByRole("banner").getByRole("link", { name: "Telegram channel, opens Telegram" });
  await expect(telegram).toHaveCount(1);
  await expect(telegram).toBeVisible();
  await expect(telegram).toHaveAttribute("href", "https://t.me/visaproof");
  await expect(telegram).toHaveAttribute("target", "_blank");
  const box = await telegram.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});
