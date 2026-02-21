import { describe, expect, test } from "vitest";
import { Match, MatchStatus } from "../domain/match";
import { Alignment, Template } from "../domain/template";
import { Ability, AbilityId } from "../domain/ability";

describe("E2E Game Flow - Complete Games Until Winner", () => {
  test("Scenario 1: Villains win by outnumbering heroes", () => {
    // Setup: 2 villains, 2 heroes
    const match = new Match();

    const villain1 = match.addPlayer("Mafia Boss");
    const villain2 = match.addPlayer("Mafia Goon");
    const hero1 = match.addPlayer("Doctor");
    const hero2 = match.addPlayer("Citizen");

    const villainTemplate = new Template("mafia", Alignment.Villain, [
      new Ability(AbilityId.Kill),
    ]);

    const doctorTemplate = new Template("doctor", Alignment.Hero, [
      new Ability(AbilityId.Protect),
    ]);

    const citizenTemplate = new Template("citizen", Alignment.Hero, []);

    villain1.assignTemplate(villainTemplate);
    villain2.assignTemplate(villainTemplate);
    hero1.assignTemplate(doctorTemplate);
    hero2.assignTemplate(citizenTemplate);

    match.start([villainTemplate, villainTemplate, doctorTemplate, citizenTemplate]);

    expect(match.getStatus()).toBe(MatchStatus.STARTED);
    expect(match.getCurrentPhase()).toBe("discussion");

    // Night 1: Discussion → Voting → Action → Resolution

    // Discussion phase
    expect(match.getCurrentPhase()).toBe("discussion");
    match.advancePhase();

    // Voting phase - everyone votes for villain1
    expect(match.getCurrentPhase()).toBe("voting");
    match.submitVote(villain2.id, villain1.id);
    match.submitVote(hero1.id, villain1.id);
    match.submitVote(hero2.id, villain1.id);
    match.submitVote(villain1.id, hero1.id); // villain1 votes hero1

    // Advance from voting → tallies votes, villain1 eliminated
    match.advancePhase();
    expect(villain1.isAlive()).toBe(false);
    expect(match.getCurrentPhase()).toBe("action");

    // Action phase - villain2 kills hero2, doctor protects hero1
    match.submitAction(villain2.id, AbilityId.Kill, [hero2.id]);
    match.submitAction(hero1.id, AbilityId.Protect, [hero1.id]);

    // Advance to resolution → resolves actions
    match.advancePhase();
    expect(match.getCurrentPhase()).toBe("resolution");

    // Advance from resolution → triggers resolution and win check
    match.advancePhase();

    // After resolution: hero2 should be dead, 1 villain vs 1 hero = villains win!
    expect(hero2.isAlive()).toBe(false);
    expect(hero1.isAlive()).toBe(true);
    expect(villain2.isAlive()).toBe(true);

    // Villains equal heroes (1v1) - villains win condition met
    expect(match.getStatus()).toBe(MatchStatus.FINISHED);
    expect(match.getWinner()).toBe("villains");
  });

  test("Scenario 2: Heroes win by eliminating all villains", () => {
    // Setup: 1 villain, 3 heroes
    const match = new Match();

    const villain = match.addPlayer("Serial Killer");
    const hero1 = match.addPlayer("Doctor");
    const hero2 = match.addPlayer("Bodyguard");
    const hero3 = match.addPlayer("Detective");

    const villainTemplate = new Template("killer", Alignment.Villain, [
      new Ability(AbilityId.Kill),
    ]);

    const protectorTemplate = new Template("protector", Alignment.Hero, [
      new Ability(AbilityId.Protect),
    ]);

    const citizenTemplate = new Template("citizen", Alignment.Hero, []);

    villain.assignTemplate(villainTemplate);
    hero1.assignTemplate(protectorTemplate);
    hero2.assignTemplate(protectorTemplate);
    hero3.assignTemplate(citizenTemplate);

    match.start([villainTemplate, protectorTemplate, protectorTemplate, citizenTemplate]);

    expect(match.getStatus()).toBe(MatchStatus.STARTED);

    // Day 1: Vote out the villain
    match.advancePhase(); // voting

    // All heroes vote for villain
    match.submitVote(hero1.id, villain.id);
    match.submitVote(hero2.id, villain.id);
    match.submitVote(hero3.id, villain.id);
    match.submitVote(villain.id, hero1.id);

    match.advancePhase(); // action phase

    // Villain eliminated by vote
    expect(villain.isAlive()).toBe(false);

    // Action phase - no kills possible
    match.submitAction(hero1.id, AbilityId.Protect, [hero2.id]);

    match.advancePhase(); // resolution
    match.advancePhase(); // triggers win check

    // All villains dead, heroes win!
    expect(match.getStatus()).toBe(MatchStatus.FINISHED);
    expect(match.getWinner()).toBe("heroes");

    // Verify all heroes still alive
    expect(hero1.isAlive()).toBe(true);
    expect(hero2.isAlive()).toBe(true);
    expect(hero3.isAlive()).toBe(true);
  });

  test("Scenario 3: Villains win quickly through voting and kills", () => {
    // Setup: 2 villains, 3 heroes
    const match = new Match();

    const villain1 = match.addPlayer("Godfather");
    const villain2 = match.addPlayer("Consort");
    const hero1 = match.addPlayer("Sheriff");
    const hero2 = match.addPlayer("Escort");
    const hero3 = match.addPlayer("Lookout");

    const villainTemplate = new Template("mafia", Alignment.Villain, [
      new Ability(AbilityId.Kill),
    ]);

    const heroTemplate = new Template("town", Alignment.Hero, []);

    villain1.assignTemplate(villainTemplate);
    villain2.assignTemplate(villainTemplate);
    hero1.assignTemplate(heroTemplate);
    hero2.assignTemplate(heroTemplate);
    hero3.assignTemplate(heroTemplate);

    match.start([villainTemplate, villainTemplate, heroTemplate, heroTemplate, heroTemplate]);

    // Day 1: Villains coordinate vote
    match.advancePhase(); // voting

    // Villains + confused hero vote out hero1
    match.submitVote(villain1.id, hero1.id);
    match.submitVote(villain2.id, hero1.id);
    match.submitVote(hero1.id, villain1.id);
    match.submitVote(hero2.id, hero1.id); // Mislynch
    match.submitVote(hero3.id, villain1.id);

    match.advancePhase(); // action

    expect(hero1.isAlive()).toBe(false);
    // Now 2 villains vs 2 heroes

    // Night 1: Villains kill hero2
    match.submitAction(villain1.id, AbilityId.Kill, [hero2.id]);

    match.advancePhase(); // resolution
    match.advancePhase(); // triggers win check

    expect(hero2.isAlive()).toBe(false);
    // Now 2 villains vs 1 hero - villains win!

    expect(match.getStatus()).toBe(MatchStatus.FINISHED);
    expect(match.getWinner()).toBe("villains");

    // Verify final state
    expect(villain1.isAlive()).toBe(true);
    expect(villain2.isAlive()).toBe(true);
    expect(hero1.isAlive()).toBe(false);
    expect(hero2.isAlive()).toBe(false);
    expect(hero3.isAlive()).toBe(true);
  });

  test("Scenario 4: Protection mechanic prevents villain victory", () => {
    // Setup: 1 villain with kill, 2 heroes (1 doctor)
    const match = new Match();

    const villain = match.addPlayer("Assassin");
    const doctor = match.addPlayer("Town Doctor");
    const citizen = match.addPlayer("Citizen");

    const villainTemplate = new Template("assassin", Alignment.Villain, [
      new Ability(AbilityId.Kill),
    ]);

    const doctorTemplate = new Template("doctor", Alignment.Hero, [
      new Ability(AbilityId.Protect),
    ]);

    const citizenTemplate = new Template("citizen", Alignment.Hero, []);

    villain.assignTemplate(villainTemplate);
    doctor.assignTemplate(doctorTemplate);
    citizen.assignTemplate(citizenTemplate);

    match.start([villainTemplate, doctorTemplate, citizenTemplate]);

    expect(match.getCurrentPhase()).toBe("discussion");

    // Round 1: Discussion → Voting → Action → Resolution
    match.advancePhase(); // discussion → voting

    expect(match.getCurrentPhase()).toBe("voting");
    // No votes submitted, no elimination
    match.advancePhase(); // voting → action

    expect(match.getCurrentPhase()).toBe("action");
    // Villain tries to kill citizen, doctor protects citizen
    match.submitAction(villain.id, AbilityId.Kill, [citizen.id]);
    match.submitAction(doctor.id, AbilityId.Protect, [citizen.id]);

    match.advancePhase(); // action → resolution
    expect(match.getCurrentPhase()).toBe("resolution");

    match.advancePhase(); // resolution → discussion (with win check)

    // Citizen saved by doctor!
    expect(citizen.isAlive()).toBe(true);
    expect(match.getStatus()).toBe(MatchStatus.STARTED);

    // Round 2: Vote out villain
    expect(match.getCurrentPhase()).toBe("discussion");
    match.advancePhase(); // discussion → voting

    expect(match.getCurrentPhase()).toBe("voting");
    match.submitVote(doctor.id, villain.id);
    match.submitVote(citizen.id, villain.id);
    match.submitVote(villain.id, doctor.id);

    match.advancePhase(); // voting → action (tallies votes, villain eliminated)

    expect(villain.isAlive()).toBe(false);
    expect(match.getCurrentPhase()).toBe("action");

    // No actions needed
    match.advancePhase(); // action → resolution
    match.advancePhase(); // resolution → discussion (with win check)

    // Heroes win!
    expect(match.getStatus()).toBe(MatchStatus.FINISHED);
    expect(match.getWinner()).toBe("heroes");
    expect(doctor.isAlive()).toBe(true);
    expect(citizen.isAlive()).toBe(true);
  });
});
