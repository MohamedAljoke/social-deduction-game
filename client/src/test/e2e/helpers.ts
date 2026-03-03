import { type Page } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

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
