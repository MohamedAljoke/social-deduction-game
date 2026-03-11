import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { advancePhase, startGameViaTemplateBuilder } from "./helpers";

// ── Snapshot helpers ──────────────────────────────────────────────────────────

interface MatchPlayerSnapshot {
  id: string;
  name: string;
  status: "alive" | "dead" | "eliminated";
  templateId?: string;
}

interface MatchTemplateSnapshot {
  id: string;
  alignment: "hero" | "villain" | "neutral";
  abilities: Array<{ id: string }>;
}

interface MatchSnapshot {
  players: MatchPlayerSnapshot[];
  templates: MatchTemplateSnapshot[];
}

async function getMatchSnapshot(page: Page, matchId: string): Promise<MatchSnapshot> {
  const res = await page.request.get(`http://127.0.0.1:3000/match/${matchId}`);
  if (!res.ok()) throw new Error(`Failed to fetch match ${matchId}`);
  return (await res.json()) as MatchSnapshot;
}

function getAlignment(match: MatchSnapshot, playerName: string): string | null {
  const player = match.players.find((p) => p.name === playerName);
  if (!player?.templateId) return null;
  return match.templates.find((t) => t.id === player.templateId)?.alignment ?? null;
}

function getAbility(match: MatchSnapshot, playerName: string): string | null {
  const player = match.players.find((p) => p.name === playerName);
  if (!player?.templateId) return null;
  return match.templates.find((t) => t.id === player.templateId)?.abilities[0]?.id ?? null;
}

// ── UI appearance tests ───────────────────────────────────────────────────────

async function configureTemplatesWithAbilities(page: Page) {
  // Default templates are: Killer (villain/kill) + Detective (hero/investigate).
  // Just click Protect chip on the first template so both have abilities.
  await page.getByTestId("ability-chip").nth(1).click(); // Protect on template 1
}

test.describe("Abilities", () => {
  test("abilities panel appears in action phase", async ({ createPlayers }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGameViaTemplateBuilder(
      hostPage,
      [guestPage],
      configureTemplatesWithAbilities,
    );

    await advancePhase(hostPage); // discussion -> voting
    await advancePhase(hostPage); // voting -> action

    await expect(hostPage.getByText("Your Abilities", { exact: true })).toBeVisible(
      { timeout: 5000 },
    );
    await expect(guestPage.getByText("Your Abilities", { exact: true })).toBeVisible(
      { timeout: 5000 },
    );
  });

  test("abilities not shown in discussion phase", async ({ createPlayers }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGameViaTemplateBuilder(
      hostPage,
      [guestPage],
      configureTemplatesWithAbilities,
    );

    await expect(hostPage.getByText("Your Abilities", { exact: true })).not.toBeVisible();
  });

  test("abilities not shown in voting phase", async ({ createPlayers }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGameViaTemplateBuilder(
      hostPage,
      [guestPage],
      configureTemplatesWithAbilities,
    );

    await advancePhase(hostPage); // discussion -> voting

    await expect(hostPage.getByText("Your Abilities", { exact: true })).not.toBeVisible();
  });
});

// ── Ability resolution tests ──────────────────────────────────────────────────

test.describe("Ability resolution", () => {
  test("kill: villain kills hero → hero shows dead, villain wins", async ({
    createPlayers,
  }) => {
    // Default templates: Killer (villain/kill) + Detective (hero/investigate)
    const [hostPage, guestPage] = await createPlayers(2);
    const matchId = await startGameViaTemplateBuilder(hostPage, [guestPage]);

    // Identify roles
    const match = await getMatchSnapshot(hostPage, matchId);
    const aliceAlignment = getAlignment(match, "Alice");
    const villainPage = aliceAlignment === "villain" ? hostPage : guestPage;
    const heroName = aliceAlignment === "villain" ? "Bob" : "Alice";

    // Advance to action phase
    await advancePhase(hostPage); // discussion -> voting
    await advancePhase(hostPage); // voting -> action
    await expect(villainPage.getByText(/action/i).first()).toBeVisible({ timeout: 5000 });

    // Villain uses Kill, targets hero
    await villainPage.getByRole("button", { name: /kill/i }).click();
    await villainPage.getByText(heroName).first().click();
    await villainPage.getByRole("button", { name: /confirm/i }).click();

    // Advance to resolution
    await advancePhase(hostPage);

    // Hero is dead — verify via HTTP (faster than waiting for UI on end screen)
    const resolved = await getMatchSnapshot(hostPage, matchId);
    const heroPlayer = resolved.players.find((p) => p.name === heroName);
    expect(heroPlayer?.status).toBe("dead");

    // Both players should see the end screen (villain wins 1v1 after kill)
    for (const page of [hostPage, guestPage]) {
      await expect(page).toHaveURL(/\/end/, { timeout: 8000 });
      await expect(page.getByText(/villains win/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test("investigate: detective investigates villain → result banner appears with correct alignment", async ({
    createPlayers,
  }) => {
    // 3 players: villain + detective + citizen (no ability)
    // Default 2 templates (villain/kill + detective/investigate) padded to 3 with a citizen hero.
    const [hostPage, guest1Page, guest2Page] = await createPlayers(3);
    const matchId = await startGameViaTemplateBuilder(hostPage, [
      guest1Page,
      guest2Page,
    ]);

    // Identify which page has the detective
    const match = await getMatchSnapshot(hostPage, matchId);

    const pagesByName: Record<string, Page> = {
      Alice: hostPage,
      Bob: guest1Page,
      Charlie: guest2Page,
    };

    const detectiveName = ["Alice", "Bob", "Charlie"].find(
      (name) => getAbility(match, name) === "investigate",
    );
    const villainName = ["Alice", "Bob", "Charlie"].find(
      (name) => getAlignment(match, name) === "villain",
    );
    expect(detectiveName).toBeDefined();
    expect(villainName).toBeDefined();

    const detectivePage = pagesByName[detectiveName!];

    // Advance to action phase
    await advancePhase(hostPage); // discussion -> voting
    await advancePhase(hostPage); // voting -> action
    await expect(detectivePage.getByText(/action/i).first()).toBeVisible({ timeout: 5000 });

    // Detective investigates the villain
    await detectivePage.getByRole("button", { name: /investigate/i }).click();
    await detectivePage.getByText(villainName!).first().click();
    await detectivePage.getByRole("button", { name: /confirm/i }).click();

    // Advance to resolution — no kill was submitted so everyone stays alive
    await advancePhase(hostPage);

    // Detective sees the investigation result banner
    const banner = detectivePage.getByTestId("investigate-result-banner");
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText(/villain/i);
    await expect(banner).toContainText(new RegExp(villainName!, "i"));
  });
});
