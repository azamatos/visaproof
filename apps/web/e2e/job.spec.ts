import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The job page against the made-up roles in seed.sql (ids 1 to 8).

const evidence = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Where the answers come from" });

test("shows each answer with the sentence it comes from, and the way to apply", async ({ page }) => {
  await page.goto("/jobs/1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Senior Backend Engineer (Go)");
  await expect(evidence(page).getByText("“We sponsor your work visa”")).toBeVisible();
  await expect(evidence(page).getByText("“help you relocate to Berlin”")).toBeVisible();
  // The salary clears the Blue Card minimum: the law says so too.
  await expect(evidence(page).getByText("€80,000 a year")).toBeVisible();
  const apply = page.getByRole("link", { name: /Apply on the company's site/ });
  await expect(apply).toHaveAttribute("href", "https://jobs.example.com/fjord/1");
  await expect(apply).toHaveAttribute("target", "_blank");
});

test("says in which country “Can sponsor” holds", async ({ page }) => {
  await page.goto("/jobs/3");
  await expect(page.getByText("in the United Kingdom", { exact: true })).toBeVisible();
  await expect(
    evidence(page).getByRole("heading", { name: "UK sponsor register · United Kingdom" }),
  ).toBeVisible();
  await expect(evidence(page).getByRole("heading", { name: "Blue Card check · Germany" })).toBeVisible();
  await expect(evidence(page).getByText("Salary not posted")).toBeVisible();
});

test("warns when a Dutch employer isn't a recognised sponsor", async ({ page }) => {
  await page.goto("/jobs/4");
  await expect(page.getByText("The default search hides this role")).toBeVisible();
  await expect(evidence(page).getByText("Not on the register")).toBeVisible();
  await expect(evidence(page).getByText("“Fluent Dutch is required.”")).toBeVisible();
});

test("says what isn't read yet instead of guessing", async ({ page }) => {
  await page.goto("/jobs/5");
  await expect(evidence(page).getByText("Not read yet")).toHaveCount(3);
});

test("keeps a closed role's answers, without the way to apply", async ({ page }) => {
  await page.goto("/jobs/6");
  await expect(page.getByRole("status").filter({ hasText: "This role closed on" })).toBeVisible();
  await expect(page.getByText("Applications closed").filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Apply on the company's site/ })).toHaveCount(0);
});

test("answers 404 for a role that doesn't exist", async ({ page }) => {
  const response = await page.goto("/jobs/99999");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("We can't find this role");
});

test("writes a report as an email to the corrections address", async ({ page }) => {
  await page.goto("/jobs/1");
  await page.getByRole("button", { name: "Report a wrong answer" }).click();
  const dialog = page.getByRole("dialog", { name: "Report a wrong answer" });
  await dialog.getByRole("radio", { name: "Relocation" }).click();
  await dialog.getByLabel("What does the posting say?").fill("It only covers flights.");
  const href = await dialog.getByRole("link", { name: "Write the email" }).getAttribute("href");
  expect(href).toMatch(/^mailto:hi@azamatos\.com\?subject=Wrong%20answer%3A%20Relocation/);
  expect(decodeURIComponent(href ?? "")).toContain("It only covers flights.");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("goes back to the search it came from", async ({ page }) => {
  await page.goto("/?q=golang");
  await page.getByRole("link", { name: "Senior Backend Engineer (Go)" }).click();
  await expect(page).toHaveURL(/\/jobs\/1$/);
  await page.getByRole("link", { name: "Back to results" }).click();
  await expect(page).toHaveURL(/\/\?q=golang$/);
});

test("has no accessibility violations, dark and light", async ({ page }) => {
  for (const scheme of ["dark", "light"] as const)
    for (const id of [1, 3, 4, 6]) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`/jobs/${String(id)}`);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        violations.map(
          (v) =>
            `${scheme} /jobs/${String(id)} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        ),
      ).toEqual([]);
    }
});
