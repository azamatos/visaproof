import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The search page against the made-up roles in seed.sql: 7 open, one of them "Won't sponsor".

const results = (page: Page) => page.getByRole("region", { name: /roles?$/ }).getByRole("listitem");
const titles = async (page: Page) => (await results(page).getByRole("heading").allInnerTexts()).sort();

test("lists the open roles, strongest answer first, without the refusals", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: "6 roles" })).toBeVisible();
  await expect(results(page).first()).toContainText("Senior Backend Engineer (Go)");
  await expect(results(page).first()).toContainText("Sponsors visa");
  expect(await titles(page)).not.toContain("Frontend Engineer (Vue)");
  await expect(page.getByText("Won't sponsor is hidden: 1 role.")).toBeVisible();
});

test("finds technologies by name, symbols included", async ({ page }) => {
  for (const [q, title] of [
    ["c++", "C++ Engineer"],
    [".net", "Staff .NET Developer"],
    ["golang", "Senior Backend Engineer (Go)"],
  ] as const) {
    await page.goto(`/?q=${encodeURIComponent(q)}`);
    expect(await titles(page)).toEqual([title]);
  }
});

test("searches as you type and keeps the search in the address", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search roles" }).fill("terraform");
  await expect(page).toHaveURL(/q=terraform/);
  await expect(page.getByRole("heading", { level: 2, name: "1 role" })).toBeVisible();
});

test("counts “Can sponsor” only in the countries where it holds", async ({ page }) => {
  // Platform Engineer is in Germany and the UK; only the UK register lists its employer.
  await page.goto("/?visa=can&country=GB");
  expect(await titles(page)).toContain("Platform Engineer");
  await page.goto("/?visa=can&country=DE");
  expect(await titles(page)).not.toContain("Platform Engineer");
});

test("filters by the board's posting date", async ({ page }) => {
  // Staff .NET Developer was first seen 3 days ago but posted 400 days ago.
  await page.goto("/?within=30");
  expect(await titles(page)).not.toContain("Staff .NET Developer");
  await page.goto("/");
  expect(await titles(page)).toContain("Staff .NET Developer");
});

test("has no accessibility violations, dark and light", async ({ page }) => {
  for (const scheme of ["dark", "light"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual(
      [],
    );
  }
});

test("opens the filters in a sheet on a phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone only");
  await page.goto("/");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Filters" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /^Show \d+ roles?$/ }).click();
  await expect(sheet).toBeHidden();
});
