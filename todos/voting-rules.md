# Voting Rules — Skip Vote, Majority, Tie → No Elimination, Transparency

## Background

Improve voting so that:

- Players can explicitly **skip** instead of being forced to vote for someone
- A player is eliminated **only** with a **strict majority** over all other options
  (skip count included — if skips ≥ top player's count, no elimination)
- **Ties between players** → no elimination (instead of arbitrary first-inserted winner)
- A **Vote Status panel** shows who voted for whom in real-time during voting phase
  (configurable later via match config)

### Elimination rules summary

| Scenario               | Result                      |
| ---------------------- | --------------------------- |
| Alice 3, Bob 1, skip 0 | Alice eliminated            |
| Alice 2, Bob 2, skip 0 | No elimination (tie)        |
| Alice 2, skip 2        | No elimination (skip ≥ top) |
| Alice 2, skip 1        | Alice eliminated            |
| All skip / 0 votes     | No elimination              |

---

## Task 1 — Backend: Accept null targetId (skip vote) + fix tally logic

**Self-contained. Do this first.**

### Files

- `backend/src/domain/entity/match.ts`
- `backend/src/domain/ports/RealtimePublisher.ts`
- `backend/src/infrastructure/websocket/WebSocketPublisher.ts`
- `backend/src/application/SubmitVote.ts`
- `backend/src/infrastructure/http/routes/match.ts`

### Changes

**`match.ts` — votes field**

```ts
private votes: Array<{ voterId: string; targetId: string | null }> = [];
```

**`match.ts` — `submitVote()`**

- Accept `targetId: string | null`
- Only check `playerIds.has(targetId)` when targetId is not null

**`match.ts` — vote tally in `advancePhase()`**
Replace existing tally with:

```ts
const skipCount = this.votes.filter((v) => v.targetId === null).length;
const tally = new Map<string, number>();
for (const { targetId } of this.votes) {
  if (targetId !== null) tally.set(targetId, (tally.get(targetId) ?? 0) + 1);
}
if (tally.size > 0) {
  const [topTarget, topCount] = [...tally.entries()].reduce((a, b) =>
    b[1] > a[1] ? b : a,
  );
  const isTied = [...tally.values()].filter((v) => v === topCount).length > 1;
  if (!isTied && topCount > skipCount) {
    this.players.find((p) => p.id === topTarget)?.eliminate();
  }
}
this.votes = [];
```

**`RealtimePublisher.ts`** — signature: `targetId: string | null`

**`WebSocketPublisher.ts`** — type update only (passes targetId through)

**`SubmitVote.ts`** — `SubmitVoteInput.targetId: string | null`

**`routes/match.ts`** — Zod: `targetId: z.string().nullable()`

### Verify

```bash
cd backend && ./node_modules/.bin/tsc --noEmit
```

---

## Task 2 — Frontend: Type updates (follow Task 1)

**Small, no UI changes.**

### Files

- `client/src/types/match.ts`
- `client/src/infrastructure/http/ApiClient.ts`
- `client/src/context/GameSessionService.ts`

### Changes

- `match.ts`: `votes?: Array<{ voterId: string; targetId: string | null }>`
- `ApiClient.ts`: `submitVote(..., targetId: string | null)`
- `GameSessionService.ts`: `castVote(..., targetId: string | null)`

### Verify

```bash
cd client && npx tsc --noEmit
```

---

## Task 3 — Frontend: Skip Vote button (depends on Tasks 1 + 2)

### Files

- `client/src/features/game/hooks/useGameActions.ts`
- `client/src/features/game/GameScreen.tsx`

### Changes

**`useGameActions.ts`** — add and export `handleSkipVote`:

```ts
const handleSkipVote = useCallback(async () => {
  if (!state.matchId || !state.playerId) return;
  await service.castVote(state.matchId, state.playerId, null);
}, [service, state.matchId, state.playerId]);
```

**`GameScreen.tsx`** — add "Skip Vote" button in the voting panel next to "Cast Vote":

```tsx
<button onClick={handleSkipVote}>Skip Vote</button>
```

---

## Task 4 — Frontend: Voting Transparency Panel (independent of Task 3)

Shows who voted for whom in real-time during the voting phase.

### File

- `client/src/features/game/GameScreen.tsx`

### Change

Add a "Vote Status" panel during `match.phase === "voting"`:

- For each alive player: show their name → their vote target name
- If not yet voted: "Waiting..."
- If skipped: "Skip"
- Add TODO comment: `// TODO: gate behind match config flag 'showVotingTransparency'`

```tsx
{
  match.phase === "voting" && (
    <div
      className="rounded-2xl p-4 mb-5"
      style={{ backgroundColor: "#16213e", border: "2px solid #2a2a4a" }}
    >
      <div
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "#6b6b80" }}
      >
        Vote Status
        {/* TODO: Add showVotingTransparency to match config — hide when config.showVotingTransparency === false */}
      </div>
      {match.players
        .filter((p) => p.status === "alive")
        .map((player) => {
          const vote = match.votes?.find((v) => v.voterId === player.id);
          const targetLabel =
            vote === undefined
              ? "Waiting..."
              : vote.targetId === null
                ? "Skip"
                : (match.players.find((p) => p.id === vote.targetId)?.name ??
                  "?");
          return (
            <div
              key={player.id}
              className="flex justify-between text-sm py-1"
              style={{ color: "#a0a0b8", borderBottom: "1px solid #2a2a4a" }}
            >
              <span style={{ color: "#e94560", fontWeight: 600 }}>
                {player.name}
                {player.id === playerId ? " (You)" : ""}
              </span>
              <span>
                →{" "}
                <span
                  style={{
                    color: vote?.targetId === null ? "#6b6b80" : "#4ade80",
                    fontWeight: 600,
                  }}
                >
                  {targetLabel}
                </span>
              </span>
            </div>
          );
        })}
    </div>
  );
}
```

---

## Task 5 — E2E Tests (do last, after Tasks 1–4)

### File

- `client/src/test/e2e/game.spec.ts`

### Updates to existing tests

**Update tie test** — behavior change (tie now = no elimination):

- Old: `"tie vote — first-voted player is eliminated (deterministic tie-break)"` → asserted elimination
- New: `"tie vote — no player is eliminated when votes are tied"` → assert all players still "alive"

### New tests to add (in `"Voting — edge cases"` describe)

1. **`"player can cast skip vote — no vote badge appears on any card"`**
   - 2 players, guest clicks "Skip Vote"
   - Assert: no `/\d+ votes?/i` badge visible on any card

2. **`"skip majority — player is not eliminated when skips outnumber votes"`**
   - 3 players (Alice, Bob, Charlie)
   - Bob skips, Charlie skips, Alice votes Bob (1 vote, 2 skips)
   - Advance phase → Bob NOT eliminated

3. **`"tie vote — no player is eliminated when votes are tied"`**
   - 3 players: Bob→Alice (1), Charlie→Bob (1)
   - Advance phase → no player shows "eliminated"
   - Both Bob and Alice still show "alive"

4. **`"voting transparency panel is visible during voting phase"`**
   - 2 players, advance to voting
   - Assert: "Vote Status" heading visible
   - Assert: player names visible in the panel

5. **`"transparency panel shows Skip for players who skip"`**
   - 2 players, guest clicks "Skip Vote"
   - Assert: "Skip" text visible in the panel

### Verify

```bash
npm run dev:client-test   # from client/
```

---

## Future TODOs (do not implement now)

- **Match config flag** `showVotingTransparency: boolean` (default `true`) — hide/show the Vote Status panel
- **Match config** for voting rules (e.g., `requireMajority`, `allowTies`) if game modes need different behavior
- **Re-vote round** if tie (force players to vote again before phase can advance)

<!-- now i want in game creation first in frontend we have the 2 templates for sugestions but if game has more players it should be able to create more templates as they wich and they should be
  able to put name to that template and when game start you would have the name of ur template or  like a simple citizen/hero (DEFAULT template) also i want when we are making a game we can
  configure if we want the voting sistem to be open white voting or not (the open voting was implemented in todos/voting-rules.md but now i want to have it like a flag depending on game
  config, make a todo plan this and then implement -->
