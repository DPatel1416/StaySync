import { expect, test } from "@playwright/test";

test("employee signs in and reaches a role-specific workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Username")).toBeVisible();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\/front-desk/);
  await expect(page.getByRole("heading", { name: "Good morning, Alex" })).toBeVisible();
});

test("Front Desk creates a service request", async ({ page }) => {
  await page.goto("/app/front-desk/service-requests");
  await page.getByRole("button", { name: "Create service request" }).click();
  await page.getByLabel("Request title *").fill("Deliver hypoallergenic pillows");
  await page.getByLabel("Description *").fill("Guest requested two pillows before 4 PM.");
  await page.getByRole("button", { name: "Create request", exact: true }).click();
  await expect(page.getByText("Deliver hypoallergenic pillows")).toBeVisible();
});

test("Housekeeping can see a stayover update", async ({ page }) => {
  await page.goto("/app/housekeeping/room-updates");
  await expect(page.getByText("Extension · Stayover")).toBeVisible();
  await expect(page.getByText(/Change departure clean to stayover service/)).toBeVisible();
});

test("manager sees quality scores and latest Operations Log", async ({ page }) => {
  await page.goto("/app/manager/quality-scores");
  await expect(page.getByText("Front Desk")).toBeVisible();
  await expect(page.getByText("94%")).toBeVisible();
  await page.goto("/app/manager/operations-log");
  await expect(page.getByText(/VIP group arriving at 3:00 PM/)).toBeVisible();
});
