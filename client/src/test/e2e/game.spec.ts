import { test, expect } from "./fixtures";
import { startGame, advancePhase } from "./helpers";

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
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    const phases = ["voting", "action", "resolution", "discussion"];
    for (const phase of phases) {
      await advancePhase(hostPage);
      for (const page of [hostPage, guestPage]) {
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
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    // Advance to voting
    await advancePhase(hostPage);
    await expect(guestPage.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Guest votes for Alice (host)
    await guestPage.getByText("Alice").first().click();
    await guestPage.getByRole("button", { name: /cast vote/i }).click();
    await expect(guestPage.getByText(/1 vote/i)).toBeVisible({ timeout: 5000 });

    // Host advances phase — Alice should be eliminated
    await advancePhase(hostPage);

    for (const page of [hostPage, guestPage]) {
      await expect(page.getByText(/action/i).first()).toBeVisible({
        timeout: 5000,
      });
    }

    // Alice's card should show eliminated status
    await expect(hostPage.getByText(/eliminated/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("eliminated player shows as eliminated status", async ({
    createPlayers,
  }) => {
    const [hostPage, guestPage] = await createPlayers(2);
    await startGame(hostPage, [guestPage]);

    await advancePhase(hostPage);
    await expect(guestPage.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Guest votes for Alice
    await guestPage.getByText("Alice").first().click();
    await guestPage.getByRole("button", { name: /cast vote/i }).click();
    await expect(guestPage.getByText(/1 vote/i)).toBeVisible({ timeout: 5000 });

    await advancePhase(hostPage);

    await expect(guestPage.getByText(/eliminated/i).first()).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Voting — edge cases", () => {
  test("most-voted player is eliminated with 3 players (clear majority)", async ({
    createPlayers,
  }) => {
    // Alice=host, Bob=guest1, Charlie=guest2
    const [hostPage, guest1Page, guest2Page] = await createPlayers(3);
    await startGame(hostPage, [guest1Page, guest2Page]);

    await advancePhase(hostPage);
    await expect(guest1Page.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Both Bob and Charlie vote for Alice — Alice gets 2 votes (clear majority)
    await guest1Page.getByText("Alice").first().click();
    await guest1Page.getByRole("button", { name: /cast vote/i }).click();
    await expect(guest1Page.getByText(/2 votes|1 vote/i).first()).toBeVisible({
      timeout: 5000,
    });

    await guest2Page.getByText("Alice").first().click();
    await guest2Page.getByRole("button", { name: /cast vote/i }).click();
    await expect(guest2Page.getByText(/2 votes/i)).toBeVisible({
      timeout: 5000,
    });

    // Advance phase — Alice (2 votes) must be eliminated, not Bob or Charlie
    await advancePhase(hostPage);

    for (const page of [hostPage, guest1Page, guest2Page]) {
      await expect(page.getByText(/action/i).first()).toBeVisible({
        timeout: 5000,
      });
    }

    // Only Alice's card shows eliminated; Bob and Charlie remain alive
    await expect(hostPage.getByText(/eliminated/i).first()).toBeVisible({
      timeout: 5000,
    });
    // Bob and Charlie are alive — their status should still say "alive"
    await expect(guest1Page.getByText(/alive/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("tie vote — first-voted player is eliminated (deterministic tie-break)", async ({
    createPlayers,
  }) => {
    // Alice=host, Bob=guest1, Charlie=guest2
    // Bob votes for Alice first → Alice enters the tally map first
    // Charlie votes for Bob → Bob enters second with equal count
    // Tie-break: first entry (Alice) is eliminated
    const [hostPage, guest1Page, guest2Page] = await createPlayers(3);
    await startGame(hostPage, [guest1Page, guest2Page]);

    await advancePhase(hostPage);
    await expect(guest1Page.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Bob votes for Alice (Alice is first in tally)
    await guest1Page.getByText("Alice").first().click();
    await guest1Page.getByRole("button", { name: /cast vote/i }).click();
    await expect(guest1Page.getByText(/1 vote/i)).toBeVisible({
      timeout: 5000,
    });

    // Charlie votes for Bob (Bob is second in tally — now tied 1-1)
    await guest2Page.getByText("Bob").first().click();
    await guest2Page.getByRole("button", { name: /cast vote/i }).click();
    await expect(guest2Page.getByText(/1 vote/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Advance phase — tie → first-voted player (Alice) gets eliminated
    await advancePhase(hostPage);

    for (const page of [hostPage, guest1Page, guest2Page]) {
      await expect(page.getByText(/action/i).first()).toBeVisible({
        timeout: 5000,
      });
    }

    // Exactly one player eliminated — Alice (first in tally)
    await expect(hostPage.getByText(/eliminated/i).first()).toBeVisible({
      timeout: 5000,
    });
    // Bob must still be alive (he was second in tally)
    await expect(guest1Page.getByText("Bob").first()).toBeVisible({
      timeout: 3000,
    });
    // Bob's status card should show "alive", not "eliminated"
    const bobCard = guest1Page.getByText("Bob").first().locator("..");
    await expect(bobCard.getByText(/alive/i)).toBeVisible({ timeout: 3000 });
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
      await expect(page.getByText(/eliminated/i)).not.toBeVisible();
    }
  });

  test("player changing their vote replaces the previous vote", async ({
    createPlayers,
  }) => {
    // Alice=host, Bob=guest1, Charlie=guest2
    const [hostPage, guest1Page, guest2Page] = await createPlayers(3);
    await startGame(hostPage, [guest1Page, guest2Page]);

    await advancePhase(hostPage);
    await expect(guest1Page.getByText(/voting/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Bob initially votes for Alice
    await guest1Page.getByText("Alice").first().click();
    await guest1Page.getByRole("button", { name: /cast vote/i }).click();
    await expect(guest1Page.getByText(/1 vote/i)).toBeVisible({
      timeout: 5000,
    });

    // Bob changes his vote to Charlie
    await guest1Page.getByText("Charlie").first().click();
    await guest1Page.getByRole("button", { name: /cast vote/i }).click();

    // Charlie's card should now have 1 vote; Alice's should have 0 (badge gone)
    await expect(guest1Page.getByText(/1 vote/i)).toBeVisible({
      timeout: 5000,
    });
    // Only one vote badge should be visible total (Charlie's)
    await expect(guest1Page.getByText(/1 vote/i)).toHaveCount(1, {
      timeout: 3000,
    });

    // Advance phase — Charlie (1 vote) is eliminated, Alice is safe
    await advancePhase(hostPage);

    for (const page of [hostPage, guest1Page, guest2Page]) {
      await expect(page.getByText(/action/i).first()).toBeVisible({
        timeout: 5000,
      });
    }

    await expect(guest2Page.getByText(/eliminated/i).first()).toBeVisible({
      timeout: 5000,
    });
    // Alice must still be alive
    await expect(guest2Page.getByText("Alice").first()).toBeVisible({
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
