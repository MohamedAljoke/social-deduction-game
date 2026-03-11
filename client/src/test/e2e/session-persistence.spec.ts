import { test, expect } from "./fixtures";
import { createMatch, joinMatch, startGame } from "./helpers";

test.describe("Session persistence (localStorage)", () => {
  test("host stays in lobby after page refresh", async ({ page }) => {
    const code = await createMatch(page, "Alice");

    await page.reload();

    await expect(page).toHaveURL(/\/lobby/);
    await expect(page.getByText("Game Lobby")).toBeVisible();
    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByTestId("match-id")).toHaveText(code);
  });

  test("guest stays in lobby after page refresh", async ({ createPlayers }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    const code = await createMatch(hostPage, "Alice");
    await joinMatch(guestPage, code, "Bob");

    await guestPage.reload();

    await expect(guestPage).toHaveURL(/\/lobby/);
    await expect(guestPage.getByText("Bob")).toBeVisible();
    await expect(guestPage.getByTestId("match-id")).toHaveText(code);
  });

  test("player in /game stays on /game after page refresh", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await guestPage.reload();

    await expect(guestPage).toHaveURL(/\/game/);
  });

  test("clearing localStorage and refreshing redirects to home", async ({
    page,
  }) => {
    await createMatch(page, "Alice");
    await expect(page).toHaveURL(/\/lobby/);

    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page).toHaveURL("/");
  });
});

test.describe("Route protection (no session)", () => {
  const protectedRoutes = ["/lobby", "/game", "/templates", "/end"];

  for (const route of protectedRoutes) {
    test(`visiting ${route} without a session redirects to home`, async ({
      page,
    }) => {
      await page.goto(`http://127.0.0.1:5173${route}`);
      await expect(page).toHaveURL("/");
    });
  }
});

test.describe("Home redirect (active session)", () => {
  test("player with lobby session is redirected from / to /lobby", async ({
    page,
  }) => {
    await createMatch(page, "Alice");
    await expect(page).toHaveURL(/\/lobby/);

    await page.goto("http://127.0.0.1:5173/");

    await expect(page).toHaveURL(/\/lobby/);
  });

  test("player with in-progress session is redirected from / to /game", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await guestPage.goto("http://127.0.0.1:5173/");

    await expect(guestPage).toHaveURL(/\/game/);
  });
});

test.describe("Leave game", () => {
  test("player can leave from lobby and is redirected to home", async ({
    page,
  }) => {
    await createMatch(page, "Alice");
    await expect(page).toHaveURL(/\/lobby/);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /leave game/i }).click();

    await expect(page).toHaveURL("/");
    await page.goto("http://127.0.0.1:5173/lobby");
    await expect(page).toHaveURL("/");
  });

  test("player can leave from game screen and is redirected to home", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    guestPage.once("dialog", (dialog) => dialog.accept());
    await guestPage.getByRole("button", { name: /leave game/i }).click();

    await expect(guestPage).toHaveURL("/");
    await guestPage.goto("http://127.0.0.1:5173/game");
    await expect(guestPage).toHaveURL("/");
  });
});

test.describe("Status-based route guard", () => {
  test("player in lobby cannot navigate to /game — redirected to /lobby", async ({
    page,
  }) => {
    await createMatch(page, "Alice");
    await expect(page).toHaveURL(/\/lobby/);

    await page.goto("http://127.0.0.1:5173/game");

    await expect(page).toHaveURL(/\/lobby/);
  });

  test("player in active game cannot navigate to /lobby — redirected to /game", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await guestPage.goto("http://127.0.0.1:5173/lobby");

    await expect(guestPage).toHaveURL(/\/game/);
  });
});
