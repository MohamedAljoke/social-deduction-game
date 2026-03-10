import { test, expect } from "./fixtures";
import { startGame, advancePhase, startGameViaTemplateBuilder } from "./helpers";
import type { Page } from "@playwright/test";

type MatchAlignment = "hero" | "villain" | "neutral";

interface MatchPlayerSnapshot {
  id: string;
  name: string;
  templateId?: string;
}

interface MatchTemplateSnapshot {
  id: string;
  alignment: MatchAlignment;
}

interface MatchSnapshot {
  players: MatchPlayerSnapshot[];
  templates: MatchTemplateSnapshot[];
}

async function getMatchSnapshot(page: Page, matchId: string): Promise<MatchSnapshot> {
  const response = await page.request.get(`http://localhost:3000/match/${matchId}`);
  if (!response.ok()) {
    throw new Error(`Failed to fetch match ${matchId}`);
  }
  return (await response.json()) as MatchSnapshot;
}

function getAlignmentByName(match: MatchSnapshot, playerName: string): MatchAlignment | null {
  const player = match.players.find((p) => p.name === playerName);
  if (!player?.templateId) return null;
  const template = match.templates.find((t) => t.id === player.templateId);
  return template?.alignment ?? null;
}

function findHeroTarget(match: MatchSnapshot, candidates: string[]): string {
  const hero = candidates.find((name) => getAlignmentByName(match, name) === "hero");
  if (!hero) {
    throw new Error(`No hero target found in candidates: ${candidates.join(", ")}`);
  }
  return hero;
}

async function voteForTarget(page: Page, targetName: string): Promise<void> {
  await page.getByText(targetName).first().click();
  await page.getByRole("button", { name: /cast vote/i }).click();
}

test.describe("Game screen", () => {
  test("all players see the game screen with phase banner after game starts", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    for (const page of [hostPage, guestPage]) {
      await expect(page.getByText(/discussion/i).first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("host sees Next Phase button, guests do not", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await expect(
      hostPage.getByRole("button", { name: /next phase/i }),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      guestPage.getByRole("button", { name: /next phase/i }),
    ).not.toBeVisible();
  });
});

test.describe("Phase advance", () => {
  test("host advancing phase updates all players in real-time", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await advancePhase(hostPage);

    for (const page of [hostPage, guestPage]) {
      await expect(page.getByText(/voting/i).first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("phase cycles: discussion → voting → action → resolution → discussion", async ({
    createPlayers,
  }) => {
    // 3 players = 1 villain + 2 heroes (default templates + 1 citizen pad).
    // With 2 heroes alive, villain parity condition (>=) is never met during
    // resolution unless a kill lands, so the game doesn't end prematurely.
    const [hostPage, guestPage1, guestPage2] = await createPlayers(3);
    await startGameViaTemplateBuilder(hostPage, [guestPage1, guestPage2]);

    const phases = ["voting", "action", "resolution", "discussion"];
    for (const phase of phases) {
      await advancePhase(hostPage);
      for (const page of [hostPage, guestPage1, guestPage2]) {
        await expect(
          page.getByText(new RegExp(phase, "i")).first(),
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe("Voting", () => {
  test("player can select a target and cast vote during voting phase", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    // Advance to voting phase
    await advancePhase(hostPage);
    await expect(guestPage.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Guest clicks "Alice" (host) to vote for her
    await guestPage.getByText("Alice").first().click();

    // Cast vote button should be enabled
    await expect(
      guestPage.getByRole("button", { name: /cast vote/i }),
    ).toBeEnabled({ timeout: 3000 });

    await guestPage.getByRole("button", { name: /cast vote/i }).click();
  });

  test("vote count appears on targeted player's card", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await advancePhase(hostPage);
    await expect(guestPage.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Guest votes for Alice (host)
    await guestPage.getByText("Alice").first().click();
    await guestPage.getByRole("button", { name: /cast vote/i }).click();

    // Vote count badge should appear on Alice's card on both pages
    await expect(guestPage.getByText(/1 vote/i)).toBeVisible({ timeout: 5000 });
    await expect(hostPage.getByText(/1 vote/i)).toBeVisible({ timeout: 5000 });
  });

  test("advancing phase from voting eliminates the most-voted player", async ({
    createPlayers,
  }) => {
    const [hostPage, guest1Page, guest2Page, guest3Page] = await createPlayers(4);
    const code = await startGameViaTemplateBuilder(hostPage, [
      guest1Page,
      guest2Page,
      guest3Page,
    ]);
    const match = await getMatchSnapshot(hostPage, code);
    const targetName = findHeroTarget(match, ["Bob", "Charlie", "Diana"]);
    const pagesByName: Record<string, Page> = {
      Alice: hostPage,
      Bob: guest1Page,
      Charlie: guest2Page,
      Diana: guest3Page,
    };

    // Advance to voting
    await advancePhase(hostPage);
    await expect(guest1Page.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    for (const [name, page] of Object.entries(pagesByName)) {
      if (name === targetName) continue;
      await voteForTarget(page, targetName);
    }

    // Host advances phase — target should be eliminated
    await advancePhase(hostPage);

    for (const page of [hostPage, guest1Page, guest2Page, guest3Page]) {
      await expect(page.getByText(/action/i).first()).toBeVisible({
        timeout: 5000,
      });
    }

    await expect(
      pagesByName[targetName].getByText(/dead|eliminated/i).first(),
    ).toBeVisible({
      timeout: 5000,
    });
  });

  test("eliminated player shows as eliminated status", async ({
    createPlayers,
  }) => {
    const [hostPage, guest1Page, guest2Page, guest3Page] = await createPlayers(4);
    const code = await startGameViaTemplateBuilder(hostPage, [
      guest1Page,
      guest2Page,
      guest3Page,
    ]);
    const match = await getMatchSnapshot(hostPage, code);
    const targetName = findHeroTarget(match, ["Bob", "Charlie", "Diana"]);
    const pagesByName: Record<string, Page> = {
      Alice: hostPage,
      Bob: guest1Page,
      Charlie: guest2Page,
      Diana: guest3Page,
    };
    const targetPage = pagesByName[targetName];

    await advancePhase(hostPage);
    await expect(guest1Page.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    for (const [name, page] of Object.entries(pagesByName)) {
      if (name === targetName) continue;
      await voteForTarget(page, targetName);
    }

    await advancePhase(hostPage);

    await expect(targetPage.getByText(/dead|eliminated/i).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(targetPage.getByText(/you have been eliminated/i)).toBeVisible({
      timeout: 5000,
    });

    // Advance to the next voting round; eliminated players still cannot vote.
    await advancePhase(hostPage); // action -> resolution
    await advancePhase(hostPage); // resolution -> discussion
    await advancePhase(hostPage); // discussion -> voting

    await expect(hostPage.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(
      targetPage.getByRole("button", { name: /cast vote/i }),
    ).toHaveCount(0);
    await expect(
      targetPage.getByRole("button", { name: /skip vote/i }),
    ).toHaveCount(0);
  });
});

test.describe("Voting — edge cases", () => {
  test("most-voted player is eliminated with 4 players (clear majority)", async ({
    createPlayers,
  }) => {
    // Alice=host, Bob=guest1, Charlie=guest2, Diana=guest3
    const [hostPage, guest1Page, guest2Page, guest3Page] = await createPlayers(4);
    const code = await startGameViaTemplateBuilder(hostPage, [
      guest1Page,
      guest2Page,
      guest3Page,
    ]);
    const match = await getMatchSnapshot(hostPage, code);
    const targetName = findHeroTarget(match, ["Bob", "Charlie", "Diana"]);
    const pagesByName: Record<string, Page> = {
      Alice: hostPage,
      Bob: guest1Page,
      Charlie: guest2Page,
      Diana: guest3Page,
    };

    await advancePhase(hostPage);
    await expect(guest1Page.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    for (const [name, page] of Object.entries(pagesByName)) {
      if (name === targetName) continue;
      await voteForTarget(page, targetName);
    }

    // Advance phase — selected target must be eliminated
    await advancePhase(hostPage);

    for (const page of [hostPage, guest1Page, guest2Page, guest3Page]) {
      await expect(page.getByText(/action/i).first()).toBeVisible({
        timeout: 5000,
      });
    }

    await expect(
      pagesByName[targetName].getByText(/dead|eliminated/i).first(),
    ).toBeVisible({
      timeout: 5000,
    });
    // At least one non-target player remains alive.
    await expect(guest1Page.getByText(/alive/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("player can cast skip vote — no vote badge appears on any card", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await advancePhase(hostPage);
    await expect(guestPage.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    await guestPage.getByRole("button", { name: /skip vote/i }).click();

    await expect(guestPage.getByText(/\d+ votes?/i)).toHaveCount(0, {
      timeout: 5000,
    });
    await expect(hostPage.getByText(/\d+ votes?/i)).toHaveCount(0, {
      timeout: 5000,
    });
  });

  test("skip majority — player is not eliminated when skips outnumber votes", async ({
    createPlayers,
  }) => {
    // Alice=host, Bob=guest1, Charlie=guest2
    const [hostPage, guest1Page, guest2Page] = await createPlayers(3);
    await startGame(hostPage, [guest1Page, guest2Page]);

    await advancePhase(hostPage);
    await expect(guest1Page.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Bob and Charlie skip, Alice votes Bob => Bob 1, skip 2
    await guest1Page.getByRole("button", { name: /skip vote/i }).click();
    await guest2Page.getByRole("button", { name: /skip vote/i }).click();
    await hostPage.getByText("Bob").first().click();
    await hostPage.getByRole("button", { name: /cast vote/i }).click();

    await advancePhase(hostPage);

    for (const page of [hostPage, guest1Page, guest2Page]) {
      await expect(page.getByText(/action/i).first()).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/dead|eliminated/i)).toHaveCount(0);
    }
  });

  test("tie vote — no player is eliminated when votes are tied", async ({
    createPlayers,
  }) => {
    const [hostPage, guest1Page, guest2Page] = await createPlayers(3);
    await startGame(hostPage, [guest1Page, guest2Page]);

    await advancePhase(hostPage);
    await expect(guest1Page.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Bob -> Alice, Charlie -> Bob (1-1 tie)
    await guest1Page.getByText("Alice").first().click();
    await guest1Page.getByRole("button", { name: /cast vote/i }).click();
    await guest2Page.getByText("Bob").first().click();
    await guest2Page.getByRole("button", { name: /cast vote/i }).click();

    await advancePhase(hostPage);

    for (const page of [hostPage, guest1Page, guest2Page]) {
      await expect(page.getByText(/action/i).first()).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/dead|eliminated/i)).toHaveCount(0);
    }
  });

  test("voting transparency panel is visible during voting phase", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await advancePhase(hostPage);
    await expect(hostPage.getByText(/vote status/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(hostPage.getByText("Alice").first()).toBeVisible();
    await expect(hostPage.getByText("Bob").first()).toBeVisible();
  });

  test("transparency panel shows Skip for players who skip", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await advancePhase(hostPage);
    await guestPage.getByRole("button", { name: /skip vote/i }).click();

    await expect(
      hostPage.getByTestId("vote-status-panel").getByText(/^Skip$/),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      guestPage.getByTestId("vote-status-panel").getByText(/^Skip$/),
    ).toBeVisible({ timeout: 5000 });
  });

  test("no votes cast — phase advances without any elimination", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await advancePhase(hostPage);
    await expect(guestPage.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Nobody votes — host advances phase immediately
    await advancePhase(hostPage);

    for (const page of [hostPage, guestPage]) {
      await expect(page.getByText(/action/i).first()).toBeVisible({
        timeout: 5000,
      });
      // No player should be eliminated
      await expect(page.getByText(/dead|eliminated/i)).not.toBeVisible();
    }
  });

  test("player changing their vote replaces the previous vote", async ({
    createPlayers,
  }) => {
    // Alice=host, Bob=guest1, Charlie=guest2, Diana=guest3
    const [hostPage, guest1Page, guest2Page, guest3Page] = await createPlayers(4);
    const code = await startGameViaTemplateBuilder(hostPage, [
      guest1Page,
      guest2Page,
      guest3Page,
    ]);
    const match = await getMatchSnapshot(hostPage, code);
    const eliminationTarget = findHeroTarget(match, ["Charlie", "Diana"]);
    const initialTarget = eliminationTarget === "Charlie" ? "Alice" : "Charlie";
    const pagesByName: Record<string, Page> = {
      Alice: hostPage,
      Bob: guest1Page,
      Charlie: guest2Page,
      Diana: guest3Page,
    };

    await advancePhase(hostPage);
    await expect(guest1Page.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Bob initially votes for one target
    await voteForTarget(guest1Page, initialTarget);
    await expect(guest1Page.getByText(/1 vote/i)).toBeVisible({
      timeout: 5000,
    });

    // Bob changes his vote to the elimination target
    await voteForTarget(guest1Page, eliminationTarget);

    // Only one player should have Bob's vote
    await expect(guest1Page.getByText(/1 vote/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(guest1Page.getByText(/1 vote/i)).toHaveCount(1, {
      timeout: 3000,
    });

    // Add a second vote to guarantee elimination without ending the game
    await voteForTarget(hostPage, eliminationTarget);

    await advancePhase(hostPage);

    for (const page of [hostPage, guest1Page, guest2Page, guest3Page]) {
      await expect(page.getByText(/action/i).first()).toBeVisible({
        timeout: 5000,
      });
    }

    await expect(
      pagesByName[eliminationTarget].getByText(/dead|eliminated/i).first(),
    ).toBeVisible({
      timeout: 3000,
    });
    await expect(guest3Page.getByText("Alice").first()).toBeVisible({
      timeout: 3000,
    });
  });

  test("vote counts shown correctly across multiple player cards", async ({
    createPlayers,
  }) => {
    // Alice=host, Bob=guest1, Charlie=guest2
    // Bob votes for Alice, Charlie votes for Alice → Alice has 2 votes, others have 0
    const [hostPage, guest1Page, guest2Page] = await createPlayers(3);
    await startGame(hostPage, [guest1Page, guest2Page]);

    await advancePhase(hostPage);
    await expect(guest1Page.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    await guest1Page.getByText("Alice").first().click();
    await guest1Page.getByRole("button", { name: /cast vote/i }).click();
    await expect(guest1Page.getByText(/1 vote/i)).toBeVisible({
      timeout: 5000,
    });

    await guest2Page.getByText("Alice").first().click();
    await guest2Page.getByRole("button", { name: /cast vote/i }).click();
    await expect(guest2Page.getByText(/2 votes/i)).toBeVisible({
      timeout: 5000,
    });

    // Verify from the host's perspective too
    await expect(hostPage.getByText(/2 votes/i)).toBeVisible({
      timeout: 5000,
    });
    // Only Alice's card has a vote badge — Bob and Charlie have none
    await expect(hostPage.getByText(/\d+ votes?/i)).toHaveCount(1, {
      timeout: 3000,
    });
  });
});

test.describe("End game", () => {
  test("match finishes and all players are redirected to end screen", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await advancePhase(hostPage); // discussion -> voting
    await guestPage.getByText("Alice").first().click();
    await guestPage.getByRole("button", { name: /cast vote/i }).click();
    await advancePhase(hostPage); // voting -> action (and match finish)

    for (const page of [hostPage, guestPage]) {
      await expect(page).toHaveURL(/\/end/, { timeout: 8000 });
      await expect(page.getByText(/heroes win|villains win/i)).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/role reveal/i)).toBeVisible();
      await expect(page.getByText("Alice").first()).toBeVisible();
      await expect(page.getByText("Bob").first()).toBeVisible();
    }
  });
});
