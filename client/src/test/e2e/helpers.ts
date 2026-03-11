import { expect, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:5173";
const API_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_UI_TIMEOUT = 15_000;

const GUEST_NAMES = ["Bob", "Charlie", "Diana", "Eve", "Frank", "Grace"];
export const LARGE_PLAYER_NAMES = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Eve",
  "Frank",
  "Grace",
  "Heidi",
  "Ivan",
  "Judy",
] as const;

export type MatchAlignment = "hero" | "villain" | "neutral";
export type MatchStatus = "lobby" | "started" | "finished";
export type AbilityId = "kill" | "protect" | "roleblock" | "investigate";

export interface MatchPlayerSnapshot {
  id: string;
  name: string;
  status: "alive" | "dead" | "eliminated";
  templateId?: string;
}

export interface MatchTemplateSnapshot {
  id: string;
  name: string;
  alignment: MatchAlignment;
  abilities: Array<{ id: AbilityId }>;
}

export interface MatchSnapshot {
  id: string;
  status: MatchStatus;
  phase: "discussion" | "voting" | "action" | "resolution";
  players: MatchPlayerSnapshot[];
  templates: MatchTemplateSnapshot[];
  actions: Array<{ actorId: string; EffectType: string; targetIds: string[] }>;
  votes?: Array<{ voterId: string; targetId: string | null }>;
  winnerAlignment?: MatchAlignment | null;
}

export interface TemplateBuilderConfig {
  name?: string;
  alignment: MatchAlignment;
  abilities: AbilityId[];
  winCondition?: "team_parity" | "eliminate_alignment";
  targetAlignment?: MatchAlignment;
}

/** Navigate to home and create a new match, returning the match code shown in the lobby. */
export async function createMatch(
  page: Page,
  playerName: string,
): Promise<string> {
  await page.goto(BASE_URL);
  await page.getByLabel(/your name/i).fill(playerName);
  await page.getByRole("button", { name: /create game/i }).click();
  await waitForLobbyOrThrow(
    page,
    "Failed to create game. Make sure the server is running.",
  );
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
  await waitForLobbyOrThrow(
    page,
    "Failed to join game. Check the ID and try again.",
  );
}

export async function createAndJoinPlayers(
  hostPage: Page,
  guestPages: Page[],
  playerNames: readonly string[],
): Promise<string> {
  const [hostName, ...guestNames] = playerNames;
  const code = await createMatch(hostPage, hostName);

  for (const [index, page] of guestPages.entries()) {
    await joinMatch(page, code, guestNames[index]);
  }

  return code;
}

export function buildPagesByName(
  hostPage: Page,
  guestPages: Page[],
  playerNames: readonly string[],
): Record<string, Page> {
  const pagesByName: Record<string, Page> = {
    [playerNames[0]]: hostPage,
  };

  for (const [index, page] of guestPages.entries()) {
    pagesByName[playerNames[index + 1]] = page;
  }

  return pagesByName;
}

export async function waitForRoster(
  page: Page,
  playerNames: readonly string[],
): Promise<void> {
  for (const name of playerNames) {
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 8000 });
  }
}

export async function waitForPhase(
  pages: Page[],
  phaseName: RegExp,
): Promise<void> {
  for (const page of pages) {
    await expect(page.getByText(phaseName).first()).toBeVisible({
      timeout: 8000,
    });
  }
}

export async function waitForGameRoute(pages: Page[]): Promise<void> {
  for (const page of pages) {
    await expect(page).toHaveURL(/\/game/, { timeout: 15000 });
  }
}

async function waitForLobbyOrThrow(
  page: Page,
  expectedErrorMessage: string,
): Promise<void> {
  await page.waitForFunction(
    ({ errorMessage }) =>
      window.location.pathname === "/lobby" ||
      document.body.innerText.includes(errorMessage),
    { errorMessage: expectedErrorMessage },
    { timeout: DEFAULT_UI_TIMEOUT },
  );

  if (new URL(page.url()).pathname === "/lobby") {
    return;
  }

  const visibleError = await page.getByText(expectedErrorMessage).textContent();
  throw new Error(
    `Navigation to /lobby failed: ${visibleError ?? expectedErrorMessage}`,
  );
}

export async function getMatchSnapshot(
  page: Page,
  matchId: string,
): Promise<MatchSnapshot> {
  const response = await page.request.get(`${API_BASE_URL}/match/${matchId}`);
  if (!response.ok()) {
    throw new Error(`Failed to fetch match ${matchId}`);
  }

  return (await response.json()) as MatchSnapshot;
}

export function getPlayerByName(
  match: MatchSnapshot,
  playerName: string,
): MatchPlayerSnapshot | undefined {
  return match.players.find((player) => player.name === playerName);
}

export function getAlignmentByName(
  match: MatchSnapshot,
  playerName: string,
): MatchAlignment | null {
  const player = getPlayerByName(match, playerName);
  if (!player?.templateId) return null;

  return (
    match.templates.find((template) => template.id === player.templateId)
      ?.alignment ?? null
  );
}

export function getAbilityByName(
  match: MatchSnapshot,
  playerName: string,
): AbilityId | null {
  const player = getPlayerByName(match, playerName);
  if (!player?.templateId) return null;

  return (
    match.templates.find((template) => template.id === player.templateId)
      ?.abilities[0]?.id ?? null
  );
}

export function getAliveNames(match: MatchSnapshot): string[] {
  return match.players
    .filter((player) => player.status === "alive")
    .map((player) => player.name);
}

export function getAliveNamesByAlignment(
  match: MatchSnapshot,
  alignment: MatchAlignment,
): string[] {
  return getAliveNames(match).filter(
    (name) => getAlignmentByName(match, name) === alignment,
  );
}

export async function configureTemplates(
  hostPage: Page,
  templates: TemplateBuilderConfig[],
): Promise<void> {
  await hostPage.getByRole("button", { name: /configure templates/i }).click();
  await hostPage.waitForURL("**/templates");

  const currentCards = hostPage.getByTestId("template-card");
  const currentCount = await currentCards.count();

  for (let index = currentCount; index < templates.length; index++) {
    await hostPage.getByRole("button", { name: /add template/i }).click();
  }

  const templateCards = hostPage.getByTestId("template-card");
  await expect(templateCards).toHaveCount(templates.length);

  for (const [index, template] of templates.entries()) {
    const card = templateCards.nth(index);

    if (template.name) {
      await card.getByPlaceholder("Template name").fill(template.name);
    }

    await card.getByTestId("template-alignment-select").selectOption(
      template.alignment,
    );

    await card.getByTestId("template-win-condition-select").selectOption(
      template.winCondition ?? "team_parity",
    );

    if (template.winCondition === "eliminate_alignment") {
      await card
        .getByTestId("template-target-alignment-select")
        .selectOption(template.targetAlignment ?? "villain");
    }

    const activeChips = card.locator(
      '[data-testid="ability-chip"][aria-pressed="true"]',
    );
    while ((await activeChips.count()) > 0) {
      await activeChips.first().click();
    }

    for (const ability of template.abilities) {
      await card.getByTestId("ability-chip").filter({
        hasText: new RegExp(ability, "i"),
      }).click();
    }
  }
}

export async function saveTemplatesAndStart(
  hostPage: Page,
  allPages: Page[],
): Promise<void> {
  await hostPage.getByRole("button", { name: /save & start/i }).click();
  await waitForGameRoute(allPages);
}

export async function castVoteForTarget(
  page: Page,
  targetName: string,
): Promise<void> {
  await page.getByText(targetName).first().click();
  await page.getByRole("button", { name: /cast vote/i }).click();
}

export async function useAbilityOnTarget(
  page: Page,
  abilityName: AbilityId,
  targetName: string,
): Promise<void> {
  await page.getByRole("button", { name: new RegExp(abilityName, "i") }).click();
  await page.getByText(targetName).first().click();
  await page.getByRole("button", { name: /confirm/i }).click();
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

/** Host clicks "Next Phase" and waits for the phase banner to update. */
export async function advancePhase(hostPage: Page): Promise<void> {
  await hostPage.getByRole("button", { name: /next phase/i }).click();
  // Wait briefly for the WS broadcast to propagate
  await hostPage.waitForTimeout(500);
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
