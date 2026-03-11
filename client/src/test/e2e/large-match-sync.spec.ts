import { expect } from "@playwright/test";
import { test } from "./fixtures";
import {
  LARGE_PLAYER_NAMES,
  advancePhase,
  buildPagesByName,
  castVoteForTarget,
  configureTemplates,
  createAndJoinPlayers,
  getAliveNames,
  getAliveNamesByAlignment,
  getMatchSnapshot,
  saveTemplatesAndStart,
  waitForPhase,
  waitForRoster,
  type TemplateBuilderConfig,
} from "./helpers";

const PLAYER_NAMES = LARGE_PLAYER_NAMES;

const NO_ABILITY_TEMPLATES: TemplateBuilderConfig[] = PLAYER_NAMES.map(
  (_name, index) => ({
    name: `Template ${index + 1}`,
    alignment: index < 2 ? "villain" : "hero",
    abilities: [],
  }),
);

test.describe("Large match realtime sync", () => {
  test("keeps 10 players converged through lobby, voting, elimination, and end routing", async ({
    createPlayers,
  }) => {
    test.setTimeout(180_000);

    const [hostPage, ...guestPages] = await createPlayers(10);
    const allPages = [hostPage, ...guestPages];
    const matchId = await createAndJoinPlayers(hostPage, guestPages, PLAYER_NAMES);

    await waitForRoster(hostPage, PLAYER_NAMES);
    await waitForRoster(guestPages[guestPages.length - 1], PLAYER_NAMES);

    await configureTemplates(hostPage, NO_ABILITY_TEMPLATES);
    await saveTemplatesAndStart(hostPage, allPages);
    await waitForPhase(allPages, /discussion/i);

    const pagesByName = buildPagesByName(hostPage, guestPages, PLAYER_NAMES);

    await advancePhase(hostPage);
    await waitForPhase(allPages, /voting/i);

    let match = await getMatchSnapshot(hostPage, matchId);
    const firstVillain = getAliveNamesByAlignment(match, "villain")[0];
    if (!firstVillain) {
      throw new Error("Expected a villain target in the first vote round");
    }

    let aliveVoters = getAliveNames(match).filter((name) => name !== firstVillain);
    for (const voterName of aliveVoters) {
      await castVoteForTarget(pagesByName[voterName], firstVillain);
    }

    for (const page of [hostPage, guestPages[guestPages.length - 1]]) {
      const panel = page
        .getByTestId("vote-status-panel")
        .filter({ hasText: firstVillain })
        .first();
      await expect(panel).toBeVisible({ timeout: 8000 });
    }

    await advancePhase(hostPage);
    await waitForPhase(allPages, /action/i);

    match = await getMatchSnapshot(hostPage, matchId);
    expect(match.players.find((player) => player.name === firstVillain)?.status).toBe(
      "eliminated",
    );

    await advancePhase(hostPage);
    await waitForPhase(allPages, /resolution/i);
    await advancePhase(hostPage);
    await waitForPhase(allPages, /discussion/i);
    await advancePhase(hostPage);
    await waitForPhase(allPages, /voting/i);

    match = await getMatchSnapshot(hostPage, matchId);
    const secondVillain = getAliveNamesByAlignment(match, "villain")[0];
    if (!secondVillain) {
      throw new Error("Expected a second villain target in the final vote round");
    }

    aliveVoters = getAliveNames(match).filter((name) => name !== secondVillain);
    for (const voterName of aliveVoters) {
      await castVoteForTarget(pagesByName[voterName], secondVillain);
    }

    await advancePhase(hostPage);

    match = await getMatchSnapshot(hostPage, matchId);
    expect(match.status).toBe("finished");
    expect(match.winnerAlignment).toBe("hero");

    for (const page of allPages) {
      await expect(page).toHaveURL(/\/end/, { timeout: 15000 });
      await expect(page.getByText(/heroes win/i)).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
