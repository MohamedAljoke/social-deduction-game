import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { advancePhase, createMatch, joinMatch } from "./helpers";

const PLAYER_NAMES = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Eve",
  "Frank",
  "Grace",
  "Heidi",
];

// Keep disabled for now. When enabled, extend this scenario to execute
// action-phase abilities in addition to vote-driven eliminations.
const ENABLE_ABILITIES_IN_REAL_SCENARIO = false;

const ABILITY_BUTTON_LABEL_PATTERN = /kill|protect|roleblock|investigate/i;

type MatchAlignment = "hero" | "villain" | "neutral";
type MatchStatus = "lobby" | "started" | "finished";

interface MatchPlayerSnapshot {
  id: string;
  name: string;
  status: "alive" | "dead" | "eliminated";
  templateId?: string;
}

interface MatchTemplateSnapshot {
  id: string;
  alignment: MatchAlignment;
  abilities: Array<{ id: string }>;
}

interface MatchSnapshot {
  status: MatchStatus;
  players: MatchPlayerSnapshot[];
  templates: MatchTemplateSnapshot[];
  actions: Array<{ actorId: string; EffectType: string; targetIds: string[] }>;
  winnerAlignment: MatchAlignment | null;
}

async function getMatchSnapshot(
  page: Page,
  matchId: string,
): Promise<MatchSnapshot> {
  const response = await page.request.get(
    `http://localhost:3000/match/${matchId}`,
  );
  if (!response.ok()) {
    throw new Error(`Failed to fetch match ${matchId}`);
  }
  return (await response.json()) as MatchSnapshot;
}

function getAlignmentByName(
  match: MatchSnapshot,
  playerName: string,
): MatchAlignment | null {
  const player = match.players.find((p) => p.name === playerName);
  if (!player?.templateId) return null;
  const template = match.templates.find((t) => t.id === player.templateId);
  return template?.alignment ?? null;
}

function getAliveNames(match: MatchSnapshot): string[] {
  return match.players
    .filter((player) => player.status === "alive")
    .map((player) => player.name);
}

function getAliveNamesByAlignment(
  match: MatchSnapshot,
  alignment: MatchAlignment,
): string[] {
  return getAliveNames(match).filter(
    (name) => getAlignmentByName(match, name) === alignment,
  );
}

async function castVoteForTarget(
  page: Page,
  targetName: string,
): Promise<void> {
  await page.getByText(targetName).first().click();
  await page.getByRole("button", { name: /cast vote/i }).click();
}

async function configureTemplatesForEightPlayers(
  hostPage: Page,
): Promise<void> {
  await hostPage.getByRole("button", { name: /configure templates/i }).click();
  await hostPage.waitForURL("**/templates");

  // Default is 2 templates; add 6 more to match 8 players.
  for (let i = 0; i < 6; i++) {
    await hostPage.getByRole("button", { name: /add template/i }).click();
  }

  const templateCards = hostPage.getByTestId("template-card");
  await expect(templateCards).toHaveCount(8);

  for (let i = 0; i < 8; i++) {
    const card = templateCards.nth(i);
    await card
      .getByTestId("template-alignment-select")
      .selectOption(i < 2 ? "villain" : "hero");

    const activeChips = card.locator(
      '[data-testid="ability-chip"][aria-pressed="true"]',
    );
    while ((await activeChips.count()) > 0) {
      await activeChips.first().click();
    }
  }

  await hostPage.getByRole("button", { name: /save & start/i }).click();
}

test.describe("Real game scenario (8 players, no abilities)", () => {
  test("runs a full flow with join, skip-majority voting, eliminations, and end game", async ({
    createPlayers,
  }) => {
    test.setTimeout(180_000);

    const [hostPage, ...guestPages] = await createPlayers(8);
    const [hostName, ...guestNames] = PLAYER_NAMES;

    const matchId = await createMatch(hostPage, hostName);
    for (const [index, page] of guestPages.entries()) {
      await joinMatch(page, matchId, guestNames[index]);
    }

    for (const name of PLAYER_NAMES) {
      await expect(hostPage.getByText(name).first()).toBeVisible({
        timeout: 8000,
      });
    }

    const lastGuestPage = guestPages[guestPages.length - 1];
    for (const name of PLAYER_NAMES) {
      await expect(lastGuestPage.getByText(name).first()).toBeVisible({
        timeout: 8000,
      });
    }

    await configureTemplatesForEightPlayers(hostPage);

    for (const page of [hostPage, ...guestPages]) {
      await expect(page).toHaveURL(/\/game/, { timeout: 15000 });
      await expect(page.getByText(/discussion/i).first()).toBeVisible({
        timeout: 8000,
      });
    }

    const pagesByName: Record<string, Page> = {
      [hostName]: hostPage,
    };
    for (const [index, page] of guestPages.entries()) {
      pagesByName[guestNames[index]] = page;
    }

    let match = await getMatchSnapshot(hostPage, matchId);
    expect(match.players).toHaveLength(8);
    expect(match.templates).toHaveLength(8);
    expect(
      match.templates.filter((t) => t.alignment === "villain"),
    ).toHaveLength(2);
    expect(match.templates.every((t) => t.abilities.length === 0)).toBeTruthy();

    // Round 1: skip majority (4 skips) beats target votes (3 votes) => no elimination.
    await advancePhase(hostPage); // discussion -> voting
    await expect(hostPage.getByText(/voting/i).first()).toBeVisible({
      timeout: 8000,
    });

    match = await getMatchSnapshot(hostPage, matchId);
    const skipRoundTarget = getAliveNamesByAlignment(match, "hero")[0];
    if (!skipRoundTarget) {
      throw new Error(
        "Expected at least one alive hero for skip-majority round",
      );
    }

    const voters = getAliveNames(match).filter(
      (name) => name !== skipRoundTarget,
    );
    const skipVoters = voters.slice(0, 4);
    const targetVoters = voters.slice(4, 7);

    for (const name of skipVoters) {
      await pagesByName[name]
        .getByRole("button", { name: /skip vote/i })
        .click();
    }
    for (const name of targetVoters) {
      await castVoteForTarget(pagesByName[name], skipRoundTarget);
    }

    await expect(
      hostPage.getByTestId("vote-status-panel").getByText(/^Skip$/),
    ).toHaveCount(4);
    await expect(hostPage.getByText(/3 votes/i)).toBeVisible({ timeout: 5000 });

    await advancePhase(hostPage); // voting -> action (no elimination expected)

    for (const page of [hostPage, guestPages[0]]) {
      await expect(page.getByText(/action/i).first()).toBeVisible({
        timeout: 8000,
      });
      if (!ENABLE_ABILITIES_IN_REAL_SCENARIO) {
        await expect(
          page.getByRole("button", { name: ABILITY_BUTTON_LABEL_PATTERN }),
        ).toHaveCount(0);
      }
    }

    match = await getMatchSnapshot(hostPage, matchId);
    expect(match.players.find((p) => p.name === skipRoundTarget)?.status).toBe(
      "alive",
    );
    expect(match.status).toBe("started");

    // Keep eliminating heroes by vote until villains reach parity and the match ends.
    for (let round = 1; round <= 4; round++) {
      if (match.status === "finished") {
        break;
      }

      await advancePhase(hostPage); // action -> resolution
      await advancePhase(hostPage); // resolution -> discussion
      await advancePhase(hostPage); // discussion -> voting
      await expect(hostPage.getByText(/voting/i).first()).toBeVisible({
        timeout: 8000,
      });

      match = await getMatchSnapshot(hostPage, matchId);
      const heroTarget = getAliveNamesByAlignment(match, "hero")[0];
      if (!heroTarget) {
        throw new Error(
          `No alive hero target found for elimination round ${round}`,
        );
      }

      const aliveVoters = getAliveNames(match).filter(
        (name) => name !== heroTarget,
      );
      for (const voterName of aliveVoters) {
        await castVoteForTarget(pagesByName[voterName], heroTarget);
      }

      await advancePhase(hostPage); // voting -> action (may finish match)

      match = await getMatchSnapshot(hostPage, matchId);
      if (match.status === "started") {
        expect(match.players.find((p) => p.name === heroTarget)?.status).toBe(
          "eliminated",
        );
      }
    }

    match = await getMatchSnapshot(hostPage, matchId);
    expect(match.status).toBe("finished");
    expect(match.winnerAlignment).toBe("villain");
    expect(match.actions).toHaveLength(0);

    for (const page of [hostPage, ...guestPages]) {
      await expect(page).toHaveURL(/\/end/, { timeout: 15000 });
      await expect(page.getByText(/villains win/i)).toBeVisible({
        timeout: 10000,
      });
    }

    await expect(hostPage.getByText(/role reveal/i)).toBeVisible({
      timeout: 8000,
    });
    for (const name of PLAYER_NAMES) {
      await expect(hostPage.getByText(name).first()).toBeVisible({
        timeout: 8000,
      });
    }
  });
});
