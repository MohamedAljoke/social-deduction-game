import { test, expect } from "@playwright/test";
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

  test("existing players see new player appear in real-time without refresh", async ({
    browser,
  }) => {
    const hostCtx = await browser.newContext();
    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();
    const charlieCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();
    const charliePage = await charlieCtx.newPage();

    try {
      // Host creates match
      const code = await createMatch(hostPage, "Host");

      // Alice joins
      await joinMatch(alicePage, code, "Alice");

      // Host sees Host and Alice in player list (use first() to avoid strict mode violation)
      await expect(hostPage.getByText("Host").first()).toBeVisible();
      await expect(hostPage.getByText("Alice").first()).toBeVisible();

      // Alice sees Host and Alice in player list
      await expect(alicePage.getByText("Host").first()).toBeVisible();
      await expect(alicePage.getByText("Alice").first()).toBeVisible();

      // Bob joins
      await joinMatch(bobPage, code, "Bob");

      // Host sees Bob appear without refresh
      await expect(hostPage.getByText("Bob").first()).toBeVisible({ timeout: 5000 });
      // Verify all 3 players visible on host
      await expect(hostPage.getByText("Host").first()).toBeVisible();
      await expect(hostPage.getByText("Alice").first()).toBeVisible();
      await expect(hostPage.getByText("Bob").first()).toBeVisible();

      // Alice also sees Bob appear
      await expect(alicePage.getByText("Bob").first()).toBeVisible({ timeout: 5000 });
      // Verify all 3 players visible on Alice
      await expect(alicePage.getByText("Host").first()).toBeVisible();
      await expect(alicePage.getByText("Alice").first()).toBeVisible();
      await expect(alicePage.getByText("Bob").first()).toBeVisible();

      // Charlie joins
      await joinMatch(charliePage, code, "Charlie");

      // All existing players see Charlie appear in real-time
      await expect(hostPage.getByText("Charlie").first()).toBeVisible({ timeout: 5000 });
      await expect(alicePage.getByText("Charlie").first()).toBeVisible({ timeout: 5000 });
      await expect(bobPage.getByText("Charlie").first()).toBeVisible({ timeout: 5000 });

      // Verify all 4 players visible on host
      await expect(hostPage.getByText("Host").first()).toBeVisible();
      await expect(hostPage.getByText("Alice").first()).toBeVisible();
      await expect(hostPage.getByText("Bob").first()).toBeVisible();
      await expect(hostPage.getByText("Charlie").first()).toBeVisible();
    } finally {
      await hostCtx.close();
      await aliceCtx.close();
      await bobCtx.close();
      await charlieCtx.close();
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

  test("player leaving is propagated to other players in lobby", async ({
    browser,
  }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const guestPage = await guestCtx.newPage();

    try {
      const code = await createMatch(hostPage, "Alice");
      await joinMatch(guestPage, code, "Bob");

      // Both see Alice and Bob
      await expect(hostPage.getByText("Alice")).toBeVisible();
      await expect(hostPage.getByText("Bob")).toBeVisible();
      await expect(guestPage.getByText("Bob")).toBeVisible();

      // Set up dialog handler before clicking leave
      guestPage.on("dialog", async (dialog) => {
        await dialog.accept();
      });

      // Bob leaves the game
      await guestPage.getByRole("button", { name: /leave game/i }).click();
      await guestPage.waitForURL("**/", { timeout: 5000 });

      // Alice sees Bob removed from the lobby
      await expect(hostPage.getByText("Bob")).not.toBeVisible({ timeout: 5000 });
      await expect(hostPage.getByText("Alice")).toBeVisible();
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });

  test("player removal persists after page refresh", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const guestCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const guestPage = await guestCtx.newPage();

    try {
      const code = await createMatch(hostPage, "Alice");
      await joinMatch(guestPage, code, "Bob");

      // Both see Alice and Bob
      await expect(hostPage.getByText("Alice")).toBeVisible();
      await expect(hostPage.getByText("Bob")).toBeVisible();

      // Bob leaves
      guestPage.on("dialog", async (dialog) => {
        await dialog.accept();
      });
      await guestPage.getByRole("button", { name: /leave game/i }).click();
      await guestPage.waitForURL("**/", { timeout: 5000 });

      // Alice sees Bob removed
      await expect(hostPage.getByText("Bob")).not.toBeVisible({ timeout: 5000 });

      // Alice refreshes the page - Bob should still be gone
      await hostPage.reload();
      await expect(hostPage.getByText("Alice")).toBeVisible();
      await expect(hostPage.getByText("Bob")).not.toBeVisible();
    } finally {
      await hostCtx.close();
      await guestCtx.close();
    }
  });

  test("new player sees all existing players in match via WebSocket sync", async ({
    browser,
  }) => {
    const hostCtx = await browser.newContext();
    const aliceCtx = await browser.newContext();
    const bobCtx = await browser.newContext();

    const hostPage = await hostCtx.newPage();
    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();

    try {
      // Host creates match
      const code = await createMatch(hostPage, "Host");

      // Alice joins
      await joinMatch(alicePage, code, "Alice");

      // Bob joins
      await joinMatch(bobPage, code, "Bob");

      // Verify Bob sees both Host and Alice
      await expect(bobPage.getByText("Host").first()).toBeVisible();
      await expect(bobPage.getByText("Alice").first()).toBeVisible();
      await expect(bobPage.getByText("Bob").first()).toBeVisible();

      // Verify Alice sees Host and Bob (her own name via REST, others via WebSocket)
      await expect(alicePage.getByText("Host").first()).toBeVisible();
      await expect(alicePage.getByText("Bob").first()).toBeVisible();
      await expect(alicePage.getByText("Alice").first()).toBeVisible();

      // Verify Host sees all
      await expect(hostPage.getByText("Host").first()).toBeVisible();
      await expect(hostPage.getByText("Alice").first()).toBeVisible();
      await expect(hostPage.getByText("Bob").first()).toBeVisible();
    } finally {
      await hostCtx.close();
      await aliceCtx.close();
      await bobCtx.close();
    }
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
