import { test, expect } from "./fixtures";
import { createMatch, joinMatch, startGame } from "./helpers";

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
  test("second player joins and appears in lobby", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    const code = await createMatch(hostPage, "Alice");
    await joinMatch(guestPage, code, "Bob");

    await expect(guestPage).toHaveURL(/\/lobby/);
    await expect(guestPage.getByText("Bob")).toBeVisible();
    await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 5000 });
  });

  test("existing players see new player appear in real-time without refresh", async ({
    createPlayers,
  }) => {
    const [hostPage, alicePage, bobPage, charliePage] =
      await createPlayers(4);

    const code = await createMatch(hostPage, "Host");
    await joinMatch(alicePage, code, "Alice");

    await expect(hostPage.getByText("Host").first()).toBeVisible();
    await expect(hostPage.getByText("Alice").first()).toBeVisible();
    await expect(alicePage.getByText("Host").first()).toBeVisible();
    await expect(alicePage.getByText("Alice").first()).toBeVisible();

    await joinMatch(bobPage, code, "Bob");

    await expect(hostPage.getByText("Bob").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(alicePage.getByText("Bob").first()).toBeVisible({
      timeout: 5000,
    });

    await joinMatch(charliePage, code, "Charlie");

    await expect(hostPage.getByText("Charlie").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(alicePage.getByText("Charlie").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(bobPage.getByText("Charlie").first()).toBeVisible({
      timeout: 5000,
    });

    await expect(hostPage.getByText("Host").first()).toBeVisible();
    await expect(hostPage.getByText("Alice").first()).toBeVisible();
    await expect(hostPage.getByText("Bob").first()).toBeVisible();
    await expect(hostPage.getByText("Charlie").first()).toBeVisible();
  });

  test("guest does not see Start Game button", async ({ createPlayers }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    const code = await createMatch(hostPage, "Alice");
    await joinMatch(guestPage, code, "Bob");

    await expect(
      guestPage.getByRole("button", { name: /start game/i }),
    ).not.toBeVisible();
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
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    const code = await createMatch(hostPage, "Alice");
    await joinMatch(guestPage, code, "Bob");

    await expect(hostPage.getByText("Alice")).toBeVisible();
    await expect(hostPage.getByText("Bob")).toBeVisible();
    await expect(guestPage.getByText("Bob")).toBeVisible();

    guestPage.on("dialog", (dialog) => dialog.accept());
    await guestPage.getByRole("button", { name: /leave game/i }).click();
    await guestPage.waitForURL("**/", { timeout: 5000 });

    await expect(hostPage.getByText("Bob")).not.toBeVisible({ timeout: 5000 });
    await expect(hostPage.getByText("Alice")).toBeVisible();
  });

  test("player removal persists after page refresh", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    const code = await createMatch(hostPage, "Alice");
    await joinMatch(guestPage, code, "Bob");

    await expect(hostPage.getByText("Alice")).toBeVisible();
    await expect(hostPage.getByText("Bob")).toBeVisible();

    guestPage.on("dialog", (dialog) => dialog.accept());
    await guestPage.getByRole("button", { name: /leave game/i }).click();
    await guestPage.waitForURL("**/", { timeout: 5000 });

    await expect(hostPage.getByText("Bob")).not.toBeVisible({ timeout: 5000 });

    await hostPage.reload();
    await expect(hostPage.getByText("Alice")).toBeVisible();
    await expect(hostPage.getByText("Bob")).not.toBeVisible();
  });

  test("new player sees all existing players in match via WebSocket sync", async ({
    createPlayers,
  }) => {
    const [hostPage, alicePage, bobPage] = await createPlayers(3);

    const code = await createMatch(hostPage, "Host");
    await joinMatch(alicePage, code, "Alice");
    await joinMatch(bobPage, code, "Bob");

    await expect(bobPage.getByText("Host").first()).toBeVisible();
    await expect(bobPage.getByText("Alice").first()).toBeVisible();
    await expect(bobPage.getByText("Bob").first()).toBeVisible();

    await expect(alicePage.getByText("Host").first()).toBeVisible();
    await expect(alicePage.getByText("Bob").first()).toBeVisible();
    await expect(alicePage.getByText("Alice").first()).toBeVisible();

    await expect(hostPage.getByText("Host").first()).toBeVisible();
    await expect(hostPage.getByText("Alice").first()).toBeVisible();
    await expect(hostPage.getByText("Bob").first()).toBeVisible();
  });
});

test.describe("Start game", () => {
  test("host starts game and all players navigate to /game", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await expect(hostPage).toHaveURL(/\/game/);
    await expect(guestPage).toHaveURL(/\/game/);
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
