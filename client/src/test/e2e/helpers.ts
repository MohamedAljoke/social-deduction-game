import { expect, type Page } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

const GUEST_NAMES = ["Bob", "Charlie", "Diana", "Eve", "Frank", "Grace"];

/** Navigate to home and create a new match, returning the match code shown in the lobby. */
export async function createMatch(
  page: Page,
  playerName: string,
): Promise<string> {
  await page.goto(BASE_URL);
  await page.getByLabel(/your name/i).fill(playerName);
  await page.getByRole("button", { name: /create game/i }).click();
  await page.waitForURL("**/lobby");
  const code = await page.getByTestId("match-id").textContent();
  if (!code) throw new Error("Match ID not found on lobby page");
  return code.trim();
}

/** Open a second browser context, navigate to home and join an existing match. */
export async function joinMatch(
  page: Page,
  matchId: string,
  playerName: string,
): Promise<void> {
  await page.goto(BASE_URL);
  await page.getByRole("button", { name: /join existing game/i }).click();
  await page.getByLabel(/your name/i).fill(playerName);
  await page.getByLabel(/match id/i).fill(matchId);
  await page.getByRole("button", { name: /join game/i }).click();
  await page.waitForURL("**/lobby");
}

/**
 * Creates a match as Alice (hostPage), joins with guestPages using auto-assigned names,
 * starts the game, and waits until all players are on /game.
 * Returns the match code.
 */
export async function startGame(
  hostPage: Page,
  guestPages: Page[],
): Promise<string> {
  const code = await createMatch(hostPage, "Alice");
  for (const [i, page] of guestPages.entries()) {
    await joinMatch(page, code, GUEST_NAMES[i]);
  }
  await expect(hostPage.getByText(GUEST_NAMES[0]).first()).toBeVisible({
    timeout: 5000,
  });
  await hostPage.getByRole("button", { name: /start game/i }).click();
  for (const page of [hostPage, ...guestPages]) {
    await expect(page).toHaveURL(/\/game/, { timeout: 8000 });
  }
  return code;
}

/**
 * Like startGame but navigates through the Template Builder ("Configure Templates" → "Save & Start").
 * Optionally runs `configureTemplates` to mutate the builder UI before saving.
 */
export async function startGameViaTemplateBuilder(
  hostPage: Page,
  guestPages: Page[],
  configureTemplates?: (hostPage: Page) => Promise<void>,
): Promise<string> {
  const code = await createMatch(hostPage, "Alice");
  for (const [i, page] of guestPages.entries()) {
    await joinMatch(page, code, GUEST_NAMES[i]);
  }
  await expect(hostPage.getByText(GUEST_NAMES[0]).first()).toBeVisible({
    timeout: 5000,
  });
  await hostPage.getByRole("button", { name: /configure templates/i }).click();
  await hostPage.waitForURL("**/templates");
  if (configureTemplates) {
    await configureTemplates(hostPage);
  }
  await hostPage.getByRole("button", { name: /save & start/i }).click();
  for (const page of [hostPage, ...guestPages]) {
    await expect(page).toHaveURL(/\/game/, { timeout: 8000 });
  }
  return code;
}

export async function focus(page: Page, label?: string) {
  await page.bringToFront();

  if (label) {
    await page.evaluate((l) => {
      document.title = l;
      document.body.style.border = "6px solid red";
    }, label);
  }
}
