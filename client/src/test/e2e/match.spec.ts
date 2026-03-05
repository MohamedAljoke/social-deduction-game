import { test, expect } from "./fixtures";
import {
  advancePhase,
  createMatch,
  focus,
  joinMatch,
  startGame,
  startGameViaTemplateBuilder,
} from "./helpers";

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
    const [hostPage, alicePage, bobPage, charliePage] = await createPlayers(4);

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

test.describe("Default template / no abilities", () => {
  test("quick-start (no templates) → all players navigate to /game", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await expect(hostPage).toHaveURL(/\/game/);
    await expect(guestPage).toHaveURL(/\/game/);
  });

  test("template builder seeds exactly 2 templates regardless of player count", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage1, guestPage2] = await createPlayers(3);
    const code = await createMatch(hostPage, "Alice");
    await joinMatch(guestPage1, code, "Bob");
    await joinMatch(guestPage2, code, "Charlie");

    await expect(hostPage.getByText("Charlie").first()).toBeVisible({
      timeout: 5000,
    });
    await hostPage
      .getByRole("button", { name: /configure templates/i })
      .click();
    await hostPage.waitForURL("**/templates");

    await expect(hostPage.getByTestId("template-card")).toHaveCount(2);
  });

  test("template builder → save with 2 templates for 2-player game → all navigate to /game", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGameViaTemplateBuilder(hostPage, [guestPage]);

    await expect(hostPage).toHaveURL(/\/game/);
    await expect(guestPage).toHaveURL(/\/game/);
  });

  test("2 templates for 3-player game → backend pads with default → all navigate to /game", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage1, guestPage2] = await createPlayers(3);
    await startGameViaTemplateBuilder(hostPage, [guestPage1, guestPage2]);

    await expect(hostPage).toHaveURL(/\/game/);
    await expect(guestPage1).toHaveURL(/\/game/);
    await expect(guestPage2).toHaveURL(/\/game/);
  });

  test("templates with all abilities cleared → game still starts", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGameViaTemplateBuilder(hostPage, [guestPage], async (host) => {
      // Deselect Kill from the first template card, Investigate from the second
      await host
        .getByTestId("template-card")
        .nth(0)
        .getByTestId("ability-chip")
        .filter({ hasText: "Kill" })
        .click();
      await host
        .getByTestId("template-card")
        .nth(1)
        .getByTestId("ability-chip")
        .filter({ hasText: "Investigate" })
        .click();
    });

    await expect(hostPage).toHaveURL(/\/game/);
    await expect(guestPage).toHaveURL(/\/game/);
  });

  test("template builder allows adding templates up to player count", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage1, guestPage2] = await createPlayers(3);
    const code = await createMatch(hostPage, "Alice");
    await joinMatch(guestPage1, code, "Bob");
    await joinMatch(guestPage2, code, "Charlie");

    await hostPage.getByRole("button", { name: /configure templates/i }).click();
    await hostPage.waitForURL("**/templates");
    await expect(hostPage.getByTestId("template-card")).toHaveCount(2);

    await hostPage.getByRole("button", { name: /add template/i }).click();
    await expect(hostPage.getByTestId("template-card")).toHaveCount(3);

    await hostPage.getByRole("button", { name: /save & start/i }).click();
    await expect(hostPage).toHaveURL(/\/game/);
    await expect(guestPage1).toHaveURL(/\/game/);
    await expect(guestPage2).toHaveURL(/\/game/);
  });
});

test.describe("Match config", () => {
  test("open voting disabled at creation hides voting transparency panel", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await hostPage.goto("http://localhost:5173");
    await hostPage.getByLabel(/your name/i).fill("Alice");
    await hostPage.getByLabel(/open voting/i).uncheck();
    await hostPage.getByRole("button", { name: /create game/i }).click();
    await hostPage.waitForURL("**/lobby");

    const code = (await hostPage.getByTestId("match-id").textContent())!.trim();
    await joinMatch(guestPage, code, "Bob");

    await hostPage.getByRole("button", { name: /start game/i }).click();
    await expect(hostPage).toHaveURL(/\/game/);
    await expect(guestPage).toHaveURL(/\/game/);

    await advancePhase(hostPage);
    await expect(hostPage.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    await expect(hostPage.getByTestId("vote-status-panel")).not.toBeVisible();
    await expect(guestPage.getByTestId("vote-status-panel")).not.toBeVisible();
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

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(code);
  });
});
