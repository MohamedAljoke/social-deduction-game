import { describe, expect, test } from "vitest";
import { Match, MatchStatus } from "../domain/models/match";
import {
  AbilityDoesNotBelongToUser,
  MissingTemplate,
  PlayerIsDeadError,
  PlayerNotFound,
  WrongPhaseError,
} from "../domain/errors";
import { PHASE_ORDER } from "../domain/models/phase";
import { Alignment, Template } from "../domain/models/template";
import { Ability, AbilityId } from "../domain/models/ability";

describe("match", () => {
  test("should get all players", () => {
    const match = new Match();

    match.addPlayer("test1");

    expect(match.getPlayers()).length(1);
  });

  test("should get a player by id", () => {
    const match = new Match();

    match.addPlayer("test1");
    const player = match.getPlayers()[0];

    const foundPlayer = match.getPlayerByID(player.id);

    expect(foundPlayer.id).toBe(player.id);
    expect(foundPlayer.name).toBe(player.name);
  });

  test("should throw an error when player does not exist", () => {
    const match = new Match();

    expect(() => match.getPlayerByID("random_id")).toThrow(PlayerNotFound);
  });

  test("should start a match in discussion phase", () => {
    const match = new Match();

    expect(match.getCurrentPhase()).toBe("discussion");
  });

  test("should go to next phase correctly", () => {
    const match = new Match();

    PHASE_ORDER.forEach((_, index) => {
      match.nextPhase();
      expect(match.getCurrentPhase()).toBe(
        PHASE_ORDER[(index + 1) % PHASE_ORDER.length],
      );
    });
  });

  test("should eliminate player when found", () => {
    const match = new Match();

    match.addPlayer("test1");
    match.addPlayer("test2");

    const player = match.getPlayers()[0];
    match.eliminatePlayer(player.id);

    expect(match.getPlayerByID(player.id).isAlive()).toBe(false);
  });

  test("should allow player to act when player has the ability", () => {
    const match = new Match();

    const playerOne = match.addPlayer("test1");
    const playerTwo = match.addPlayer("test2");

    const templateKiller = new Template("player_one_id", Alignment.Villain, [
      new Ability(AbilityId.Kill),
    ]);

    playerOne.assignTemplate(templateKiller);

    match.nextPhase();
    match.nextPhase();

    expect(() =>
      match.submitAction(playerOne.id, AbilityId.Kill, [playerTwo.id]),
    ).not.toThrow();
  });

  test("should not allow action in discussion phase", () => {
    const match = new Match();

    const playerOne = match.addPlayer("test1");
    const playerTwo = match.addPlayer("test2");

    const templateKiller = new Template("player_one_id", Alignment.Villain, [
      new Ability(AbilityId.Kill),
    ]);

    playerOne.assignTemplate(templateKiller);

    expect(() =>
      match.submitAction(playerOne.id, AbilityId.Kill, [playerTwo.id]),
    ).toThrow(WrongPhaseError);
  });
  test("should not allow action if player does not have a template", () => {
    const match = new Match();

    const playerOne = match.addPlayer("test1");
    const playerTwo = match.addPlayer("test2");

    match.nextPhase();
    match.nextPhase();

    expect(() =>
      match.submitAction(playerOne.id, AbilityId.Kill, [playerTwo.id]),
    ).toThrow(MissingTemplate);
  });
  test("should not allow action if player does not have the ability", () => {
    const match = new Match();

    const playerOne = match.addPlayer("test1");
    const playerTwo = match.addPlayer("test2");

    const templateKiller = new Template("player_one_id", Alignment.Villain, [
      new Ability(AbilityId.Kill),
    ]);

    playerOne.assignTemplate(templateKiller);

    match.nextPhase();
    match.nextPhase();

    expect(() =>
      match.submitAction(playerOne.id, AbilityId.Protect, [playerTwo.id]),
    ).toThrow(AbilityDoesNotBelongToUser);
  });

  describe("jester win condition", () => {
    function makeJesterTemplate(endsGameOnWin: boolean) {
      return new Template(
        "jester_tmpl",
        Alignment.Neutral,
        [],
        "vote_eliminated",
        endsGameOnWin,
      );
    }

    function advanceToVoting(match: Match) {
      // Starts in "discussion", advance once to reach "voting"
      match.advancePhase();
    }

    test("jester voted out with endsGameOnWin:true ends the match immediately", () => {
      const match = new Match();
      const jester = match.addPlayer("jester");
      const hero = match.addPlayer("hero");

      jester.assignTemplate(makeJesterTemplate(true));
      hero.assignTemplate(new Template("hero_tmpl", Alignment.Hero, []));

      advanceToVoting(match);
      match.submitVote(hero.id, jester.id);
      match.advancePhase(); // leaves voting → tallies votes, checks jester win

      expect(match.getStatus()).toBe(MatchStatus.FINISHED);
      expect(match.getWinner()).toBe("jester");
      expect(match.getJesterWinners()).toContain(jester.id);
    });

    test("jester voted out with endsGameOnWin:false does not end the match", () => {
      const match = new Match();
      const jester = match.addPlayer("jester");
      const hero = match.addPlayer("hero");

      jester.assignTemplate(makeJesterTemplate(false));
      hero.assignTemplate(new Template("hero_tmpl", Alignment.Hero, []));

      advanceToVoting(match);
      match.submitVote(hero.id, jester.id);
      match.advancePhase(); // leaves voting

      expect(match.getStatus()).not.toBe(MatchStatus.FINISHED);
      expect(match.getJesterWinners()).toContain(jester.id);
    });

    test("jester killed at night does not trigger jester win", () => {
      const match = new Match();
      const jester = match.addPlayer("jester");
      match.addPlayer("villain");

      jester.assignTemplate(makeJesterTemplate(true));

      // Simulate a night kill by eliminating directly (not through vote tally)
      match.eliminatePlayer(jester.id);

      expect(match.getJesterWinners()).toHaveLength(0);
    });
  });

  test("should not allow a dead player to make action for alive ability", () => {
    const match = new Match();

    const playerOne = match.addPlayer("test1");
    const playerTwo = match.addPlayer("test2");

    const templateKiller = new Template("player_one_id", Alignment.Villain, [
      new Ability(AbilityId.Kill),
    ]);

    playerOne.assignTemplate(templateKiller);

    playerOne.eliminate();

    match.nextPhase();
    match.nextPhase();

    expect(() =>
      match.submitAction(playerOne.id, AbilityId.Kill, [playerTwo.id]),
    ).toThrow(PlayerIsDeadError);
  });
});
