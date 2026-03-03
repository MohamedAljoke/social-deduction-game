import { test, expect, chromium } from "@playwright/test";
import { createMatch, joinMatch } from "./helpers";

test.describe("Create match", () => {
  test("navigates to lobby and shows match code", async ({ page }) => {
    const code = await createMatch(page, "Alice");

    await expect(page).toHaveURL(/\/lobby/);
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    await expect(page.getByText("Game Lobby")).toBeVisible();
    await expect(page.getByText("Alice")).toBeVisible();
  });

  test("host sees Start Game and Configure Templates buttons", async ({
    page,
  }) => {
    await createMatch(page, "Alice");

    await expect(
      page.getByRole("button", { name: /start game/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /configure templates/i }),
    ).toBeVisible();
  });
});

test.describe("Join match", () => {
  test("second player joins and appears in lobby", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const guestPage = await guestCtx.newPage();

    try {
      const code = await createMatch(hostPage, "Alice");
      await joinMatch(guestPage, code, "Bob");

      // guest sees lobby
      await expect(guestPage).toHaveURL(/\/lobby/);
      await expect(guestPage.getByText("Bob")).toBeVisible();

      // host lobby refreshes and shows Bob
      await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 5000 });
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });

  test("guest does not see Start Game button", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const guestPage = await guestCtx.newPage();

    try {
      const code = await createMatch(hostPage, "Alice");
      await joinMatch(guestPage, code, "Bob");

      await expect(
        guestPage.getByRole("button", { name: /start game/i }),
      ).not.toBeVisible();
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });

  test("shows error when joining non-existent match", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.getByRole("button", { name: /join existing game/i }).click();
    await page.getByLabel(/your name/i).fill("Bob");
    await page.getByLabel(/match id/i).fill("XXXXXX");
    await page.getByRole("button", { name: /join game/i }).click();

    await expect(page.getByText(/failed to join/i)).toBeVisible();
  });
});

test.describe("Start game", () => {
  test("host starts game and both players navigate to /game", async ({
    browser,
  }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const guestPage = await guestCtx.newPage();

    try {
      const code = await createMatch(hostPage, "Alice");
      await joinMatch(guestPage, code, "Bob");

      // wait for Bob to appear on host's lobby before starting
      await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 5000 });

      await hostPage.getByRole("button", { name: /start game/i }).click();

      await expect(hostPage).toHaveURL(/\/game/, { timeout: 8000 });
      await expect(guestPage).toHaveURL(/\/game/, { timeout: 8000 });
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });
});

test.describe("Match code copy", () => {
  test("clicking the code box copies to clipboard", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const code = await createMatch(page, "Alice");

    await page.getByTestId("match-id").click();

    const clipboard = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    expect(clipboard).toBe(code);
  });
});
