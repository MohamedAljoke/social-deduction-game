import { describe, expect, test } from "vitest";
import { Match } from "../match";
import { PlayerNotFound } from "../errors";
import { PHASE_ORDER } from "../phase";

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
});
