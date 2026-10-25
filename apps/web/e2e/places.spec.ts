import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Company and country pages, against the made-up data in seed.sql.

test("shows a company's roles and whether it can hire on a visa", async ({ page }) => {
  await page.goto("/companies/greenhouse/northwind");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Northwind Labs");
  const roles = page.getByRole("region", { name: "Open roles" });
  await expect(roles.getByRole("listitem")).toHaveCount(2);
  const answers = page.getByRole("complementary", { name: "Visa answers for Northwind Labs" });
  await expect(answers.getByText("NORTHWIND LABS LTD")).toBeVisible();
  await expect(answers.getByRole("heading", { name: "Blue Card check · Germany" })).toBeVisible();
});

test("names a board without a name, and warns when it posts for others", async ({ page }) => {
  await page.goto("/companies/workable/kestrel-software");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kestrel Software");
  await expect(page.getByText("posts roles for other companies")).toBeVisible();
  await page.goto("/jobs/7");
  await expect(page.getByText("posts roles for other companies")).toBeVisible();
});

test("explains a researched country's permit route with its official amounts", async ({ page }) => {
  await page.goto("/countries/de");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Germany");
  await expect(page.getByRole("heading", { level: 2, name: "EU Blue Card" })).toBeVisible();
  await expect(page.getByText("€45,934.20")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Federal Gazette/ })).toHaveAttribute("target", "_blank");
  await page.goto("/countries/nl");
  await expect(page.getByRole("link", { name: /Show \d+ roles? in the Netherlands/ })).toBeVisible();
});

test("says when a country isn't researched yet, and 404s outside the scope", async ({ page }) => {
  await page.goto("/countries/es");
  await expect(page.getByText("We haven't researched the permit route for Spain yet")).toBeVisible();
  const response = await page.goto("/countries/us");
  expect(response?.status()).toBe(404);
});

test("has no accessibility violations, dark and light", async ({ page }) => {
  for (const scheme of ["dark", "light"] as const)
    for (const path of [
      "/companies/greenhouse/northwind",
      "/companies/workable/kestrel-software",
      "/countries/nl",
      "/countries/es",
    ]) {
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
