import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders the hero and primary calls-to-action", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /master your studies/i })).toBeVisible();
    await expect(page.getByText(/StudyFlow AI v2\.0 is now live/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /start your journey/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in to dashboard/i })).toBeVisible();
  });

  test("navigates from the hero to the sign-in page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /sign in to dashboard/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
