import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { test } from "./fixtures";
import {
  LARGE_PLAYER_NAMES,
  advancePhase,
  buildPagesByName,
  castVoteForTarget,
  configureTemplates,
  createAndJoinPlayers,
  getAbilityByName,
  getAliveNames,
  getAliveNamesByAlignment,
  getMatchSnapshot,
  saveTemplatesAndStart,
  useAbilityOnTarget,
  waitForPhase,
  waitForRoster,
  type AbilityId,
  type TemplateBuilderConfig,
} from "./helpers";

const PLAYER_NAMES = LARGE_PLAYER_NAMES.slice(0, 8);

const ABILITY_TEMPLATES: TemplateBuilderConfig[] = [
  { name: "Killer", alignment: "villain", abilities: ["kill"] },
  { name: "Bruiser", alignment: "villain", abilities: [] },
  { name: "Guardian", alignment: "hero", abilities: ["protect"] },
  { name: "Detective", alignment: "hero", abilities: ["investigate"] },
  { name: "Escort", alignment: "hero", abilities: ["roleblock"] },
  { name: "Citizen 1", alignment: "hero", abilities: [] },
  { name: "Citizen 2", alignment: "hero", abilities: [] },
  { name: "Citizen 3", alignment: "hero", abilities: [] },
];

function findPlayerWithAbility(
  match: Awaited<ReturnType<typeof getMatchSnapshot>>,
  ability: AbilityId,
): string {
  const playerName = PLAYER_NAMES.find((name) => getAbilityByName(match, name) === ability);
  if (!playerName) {
    throw new Error(`Expected a player with ability ${ability}`);
  }
  return playerName;
}

test.describe("Large match abilities flow", () => {
  test("resolves protect, roleblock, investigate, and finishes with hero victory", async ({
    createPlayers,
  }) => {
    test.setTimeout(180_000);

    const [hostPage, ...guestPages] = await createPlayers(8);
    const allPages = [hostPage, ...guestPages];
    const matchId = await createAndJoinPlayers(hostPage, guestPages, PLAYER_NAMES);

    await waitForRoster(hostPage, PLAYER_NAMES);
    await waitForRoster(guestPages[guestPages.length - 1], PLAYER_NAMES);

    await configureTemplates(hostPage, ABILITY_TEMPLATES);
    await saveTemplatesAndStart(hostPage, allPages);
    await waitForPhase(allPages, /discussion/i);

    const pagesByName = buildPagesByName(hostPage, guestPages, PLAYER_NAMES);

    let match = await getMatchSnapshot(hostPage, matchId);
    const killerName = findPlayerWithAbility(match, "kill");
    const protectorName = findPlayerWithAbility(match, "protect");
    const investigatorName = findPlayerWithAbility(match, "investigate");
    const roleblockerName = findPlayerWithAbility(match, "roleblock");
    const villainNames = getAliveNamesByAlignment(match, "villain");
    const protectedTarget = getAliveNamesByAlignment(match, "hero").find(
      (name) =>
        ![protectorName, investigatorName, roleblockerName].includes(name),
    );

    if (!protectedTarget) {
      throw new Error("Expected a hero target for protect vs kill");
    }

    await advancePhase(hostPage);
    await waitForPhase(allPages, /voting/i);
    for (const page of allPages) {
      await page.getByRole("button", { name: /skip vote/i }).click();
    }

    await advancePhase(hostPage);
    await waitForPhase(allPages, /action/i);

    await useAbilityOnTarget(pagesByName[killerName], "kill", protectedTarget);
    await useAbilityOnTarget(
      pagesByName[protectorName],
      "protect",
      protectedTarget,
    );
    await useAbilityOnTarget(
      pagesByName[investigatorName],
      "investigate",
      killerName,
    );

    await advancePhase(hostPage);
    await waitForPhase(allPages, /resolution/i);

    match = await getMatchSnapshot(hostPage, matchId);
    expect(
      match.players.find((player) => player.name === protectedTarget)?.status,
    ).toBe("alive");
    await expect(
      pagesByName[investigatorName].getByTestId("investigate-result-banner"),
    ).toContainText(/villain/i);
    await expect(
      pagesByName[protectedTarget].getByTestId("investigate-result-banner"),
    ).toHaveCount(0);

    await advancePhase(hostPage);
    await waitForPhase(allPages, /discussion/i);
    await advancePhase(hostPage);
    await waitForPhase(allPages, /voting/i);
    for (const page of allPages) {
      await page.getByRole("button", { name: /skip vote/i }).click();
    }

    await advancePhase(hostPage);
    await waitForPhase(allPages, /action/i);

    const roleblockTarget = villainNames.find((name) => name !== killerName);
    if (!roleblockTarget) {
      throw new Error("Expected a second villain for roleblock coverage");
    }

    const secondKillTarget = getAliveNamesByAlignment(
      await getMatchSnapshot(hostPage, matchId),
      "hero",
    ).find(
      (name) =>
        ![
          protectedTarget,
          protectorName,
          investigatorName,
          roleblockerName,
        ].includes(name),
    );

    if (!secondKillTarget) {
      throw new Error("Expected a second hero target for roleblock round");
    }

    await useAbilityOnTarget(
      pagesByName[roleblockerName],
      "roleblock",
      killerName,
    );
    await useAbilityOnTarget(pagesByName[killerName], "kill", secondKillTarget);

    await advancePhase(hostPage);
    await waitForPhase(allPages, /resolution/i);

    match = await getMatchSnapshot(hostPage, matchId);
    expect(
      match.players.find((player) => player.name === secondKillTarget)?.status,
    ).toBe("alive");

    const [firstVillain, secondVillain] = villainNames;
    await advancePhase(hostPage);
    await waitForPhase(allPages, /discussion/i);
    await advancePhase(hostPage);
    await waitForPhase(allPages, /voting/i);

    let aliveVoters = getAliveNames(await getMatchSnapshot(hostPage, matchId)).filter(
      (name) => name !== firstVillain,
    );
    for (const voterName of aliveVoters) {
      await castVoteForTarget(pagesByName[voterName], firstVillain);
    }

    await advancePhase(hostPage);

    match = await getMatchSnapshot(hostPage, matchId);
    expect(match.players.find((player) => player.name === firstVillain)?.status).toBe(
      "eliminated",
    );
    expect(match.status).toBe("started");

    await advancePhase(hostPage);
    await waitForPhase(allPages, /resolution/i);
    await advancePhase(hostPage);
    await waitForPhase(allPages, /discussion/i);
    await advancePhase(hostPage);
    await waitForPhase(allPages, /voting/i);

    aliveVoters = getAliveNames(await getMatchSnapshot(hostPage, matchId)).filter(
      (name) => name !== secondVillain,
    );
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
