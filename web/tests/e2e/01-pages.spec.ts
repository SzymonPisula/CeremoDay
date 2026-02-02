import { test, expect } from "@playwright/test";

test("Login page loads and shows a password field", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("Register page loads and shows a password field", async ({ page }) => {
  await page.goto("/register");
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("App root responds (web server)", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
});
