const BASE_URL = "http://localhost:3000";

type Alignment = "villain" | "hero" | "neutral";
type AbilityId = "kill" | "protect";

const SCRIPT = {
  players: ["Alice", "Bob", "Charlie", "Diana"],
  templates: [
    {
      alignment: "villain" as Alignment,
      abilities: [{ id: "kill" as AbilityId }],
    },
    {
      alignment: "hero" as Alignment,
      abilities: [{ id: "protect" as AbilityId }],
    },
    { alignment: "hero" as Alignment, abilities: [] },
    { alignment: "hero" as Alignment, abilities: [] },
  ],

  turns: [
    {
      label: "Round 1 — Protect saves Diana from Alice's kill",
      votes: [
        { voter: "Bob", target: "Charlie" },
        { voter: "Charlie", target: "Alice" },
        { voter: "Diana", target: "Charlie" },
        // Bob + Diana outvote Charlie → Charlie eliminated
      ],
      actions: [
        { actor: "Alice", ability: "kill" as AbilityId, targets: ["Diana"] },
        { actor: "Bob", ability: "protect" as AbilityId, targets: ["Diana"] },
        // Bob protects Diana → Alice's kill is blocked
      ],
    },
    {
      label: "Round 2 — Alice kills Bob",
      votes: [
        // No majority → no day elimination
      ],
      actions: [
        { actor: "Alice", ability: "kill" as AbilityId, targets: ["Bob"] },
        // Bob was the only doctor — unprotected kill succeeds
      ],
    },
    {
      label: "Round 3 — Tie vote, Alice kills Diana, villains win",
      // NOTE: game should already be over after Round 2 (1v1 = villain win).
      // This turn is only reached if you change the scenario above.
      votes: [
        { voter: "Alice", target: "Diana" },
        { voter: "Diana", target: "Alice" },
        // Tie (1-1) → no elimination
      ],
      actions: [
        { actor: "Alice", ability: "kill" as AbilityId, targets: ["Diana"] },
      ],
    },
  ],
};

async function api<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `${method} ${path} → ${res.status}: ${JSON.stringify(data)}`,
    );
  }
  return data as T;
}

const post = <T>(path: string, body?: unknown) => api<T>("POST", path, body);
const get = <T>(path: string) => api<T>("GET", path);

const B = "\x1b[1m";
const D = "\x1b[2m";
const R = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";

const header = (t: string) => {
  const bar = "─".repeat(62);
  console.log(
    `\n${B}${CYAN}${bar}${R}\n${B}${CYAN}  ${t}${R}\n${B}${CYAN}${bar}${R}`,
  );
};

const step = (t: string) => console.log(`\n${B}${YELLOW}▶ ${t}${R}`);
const ok = (t: string) => console.log(`  ${GREEN}✓${R} ${t}`);
const warn = (t: string) => console.log(`  ${YELLOW}⚠${R} ${t}`);
const skip = (t: string) => console.log(`  ${D}– ${t}${R}`);

function printState(s: MatchState) {
  console.log(`\n  ${B}State:${R}`);
  console.log(`    phase  : ${MAGENTA}${s.currentPhase}${R}`);
  console.log(`    status : ${s.status}`);
  if (s.winner) console.log(`    winner : ${B}${GREEN}${s.winner}${R}`);
  console.log(`    players:`);
  for (const p of s.players) {
    const alive = p.isAlive ? `${GREEN}alive${R}` : `${RED}dead${R} `;
    console.log(`      ${p.name.padEnd(12)} ${alive}`);
  }
}

// ─────────────────────────────────────────────────────────────
// API response types (matching actual use case return shapes)
// ─────────────────────────────────────────────────────────────

interface MatchState {
  id: string;
  status: string; // "lobby" | "started" | "finished"
  currentPhase: string;
  winner: string | null;
  players: Array<{ id: string; name: string; isAlive: boolean }>;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Main runner
// ─────────────────────────────────────────────────────────────

async function run() {
  header("Social Deduction Game — Demo Runner");

  // 1. Create match
  step("Creating match");
  const { id: matchId } = await post<{ id: string }>("/matches");
  ok(`Match created: ${matchId}`);

  // 2. Create templates
  step("Creating templates");
  const templateIds: string[] = [];
  for (const [i, tpl] of SCRIPT.templates.entries()) {
    const { id: templateId } = await post<{ id: string }>("/templates", tpl);
    templateIds.push(templateId);
    const abilityList =
      tpl.abilities.map((a) => a.id).join(", ") || "no abilities";
    ok(
      `Template ${i + 1}: ${tpl.alignment} [${abilityList}]  id=${templateId}`,
    );
  }

  // 3. Players join  (join returns { matchId, players: [{ id, name }] })
  step("Players joining");
  const playerIdByName = new Map<string, string>();

  for (const name of SCRIPT.players) {
    const result = await post<{
      matchId: string;
      players: Array<{ id: string; name: string }>;
    }>(`/matches/${matchId}/join`, { playerName: name });
    // Newly added player is always the last one in the list
    const joined = result.players.at(-1)!;
    playerIdByName.set(name, joined.id);
    ok(`${name} joined  id=${joined.id}`);
  }

  // Helpers
  const id = (name: string): string | undefined => playerIdByName.get(name);

  const fetchState = (): Promise<MatchState> =>
    get<MatchState>(`/matches/${matchId}`);

  // 4. Start match
  step("Starting match");
  await post(`/matches/${matchId}/start`, { templateIds });
  ok(`Match started`);

  // 5. Print role assignments
  step("Role assignments");
  for (const name of SCRIPT.players) {
    const pid = id(name)!;
    const { role } = await get<{
      role: { alignment: string; abilities: Array<{ id: string }> };
    }>(`/matches/${matchId}/players/${pid}/role`);
    const abilities = role.abilities.map((a) => a.id).join(", ") || "none";
    console.log(
      `  ${name.padEnd(12)} → ${role.alignment.padEnd(8)} [${abilities}]`,
    );
  }

  // 6. Game loop
  let matchOver = false;

  for (const [turnIndex, turn] of SCRIPT.turns.entries()) {
    if (matchOver) break;

    header(`Turn ${turnIndex + 1}: ${turn.label}`);

    // ── discussion → voting ──────────────────────────────────
    step("Advancing: discussion → voting");
    await post(`/matches/${matchId}/advance-phase`);
    ok("Now in: voting");

    // Submit votes (skip dead voters/targets)
    const stateBeforeVote = await fetchState();

    if (turn.votes.length > 0) {
      step("Submitting votes");
      for (const v of turn.votes) {
        const voterId = id(v.voter);
        const targetId = id(v.target);
        if (!voterId || !targetId) {
          warn(`Unknown name in vote — skipping`);
          continue;
        }

        const voter = stateBeforeVote.players.find((p) => p.id === voterId);
        const target = stateBeforeVote.players.find((p) => p.id === targetId);
        if (!voter?.isAlive) {
          skip(`${v.voter} is dead, skipping vote`);
          continue;
        }
        if (!target?.isAlive) {
          skip(`${v.target} already dead, skipping vote`);
          continue;
        }

        await post(`/matches/${matchId}/votes`, { voterId, targetId });
        ok(`${v.voter} votes for ${v.target}`);
      }
    } else {
      skip("No votes this round");
    }

    // ── voting → action (tally runs here) ────────────────────
    step("Advancing: voting → action  [vote tally happens here]");
    await post(`/matches/${matchId}/advance-phase`);
    const stateAfterTally = await fetchState();
    ok("Now in: action");
    printState(stateAfterTally);

    if (stateAfterTally.status === "finished") {
      matchOver = true;
      continue;
    }

    // Submit night actions (skip if actor/target dead)
    if (turn.actions.length > 0) {
      step("Submitting night actions");
      const stateForActions = await fetchState();

      for (const a of turn.actions) {
        const actorId = id(a.actor);
        const targetIds = a.targets
          .map((t) => id(t))
          .filter((t): t is string => !!t);

        if (!actorId) {
          warn(`Unknown actor "${a.actor}" — skipping`);
          continue;
        }

        const actor = stateForActions.players.find((p) => p.id === actorId);
        if (!actor?.isAlive) {
          skip(`${a.actor} is dead, cannot use ${a.ability}`);
          continue;
        }

        const deadTargets = a.targets.filter((name) => {
          const tid = id(name);
          return !stateForActions.players.find((p) => p.id === tid)?.isAlive;
        });
        if (deadTargets.length)
          warn(
            `${a.actor}: target(s) [${deadTargets.join(", ")}] already dead`,
          );

        try {
          await post(`/matches/${matchId}/actions`, {
            actorId,
            abilityId: a.ability,
            targetIds,
          });
          ok(`${a.actor} uses ${a.ability} on [${a.targets.join(", ")}]`);
        } catch (err) {
          warn(`${a.actor}'s action failed: ${(err as Error).message}`);
        }
      }
    } else {
      skip("No night actions this round");
    }

    // ── action → resolution (effects resolve here) ────────────
    step("Advancing: action → resolution  [effects resolve here]");
    await post(`/matches/${matchId}/advance-phase`);
    const stateAfterResolution = await fetchState();
    ok("Resolution complete");
    printState(stateAfterResolution);

    if (stateAfterResolution.status === "finished") {
      matchOver = true;
      continue;
    }

    // ── resolution → discussion ──────────────────────────────
    step("Advancing: resolution → discussion");
    await post(`/matches/${matchId}/advance-phase`);
    ok("Next round begins");
  }

  // ─────────────────────────────────────────────────────────
  // Final result
  // ─────────────────────────────────────────────────────────
  header("Game Over");
  const final = await fetchState();
  printState(final);

  if (final.winner) {
    console.log(`\n  ${B}${GREEN}Winner: ${final.winner.toUpperCase()}${R}\n`);
  } else {
    console.log(`\n  ${YELLOW}Script ended — no winner yet.${R}`);
    console.log(
      `  ${D}Add more turns to SCRIPT.turns to continue the game.${R}\n`,
    );
  }
}

run().catch((err) => {
  console.error(`\n${RED}${B}Fatal:${R} ${err.message}`);
  console.error(`${D}Is the server running?  npm run dev${R}\n`);
  process.exit(1);
});
