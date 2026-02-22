# Task 2.6 — Remove Duplicate MatchStatus Type

**Principle violated:** DRY / Single Source of Truth
**Priority:** Low (quick win, cleanup)
**Phase:** 1

---

## Problem

Two separate status type definitions exist for the same concept:

```typescript
// domain/match.ts:20-24
export enum MatchStatus {
  LOBBY = "lobby",
  STARTED = "started",
  FINISHED = "finished",
}

// infrastructure/persistence/MatchRepository.ts:3
export type MatchStatus = "lobby" | "in_progress" | "finished";
```

These diverge: the domain uses `"started"` while the infrastructure one uses `"in_progress"`. The `MatchSession.status` field is never read by any use case — they all call `session.match.getStatus()` instead — making the infrastructure `status` field dead code.

---

## Proposed Solution

Remove `status` from `MatchSession`. The canonical status lives on `Match`.

```typescript
// infrastructure/persistence/MatchRepository.ts
export interface MatchSession {
  id: string;
  match: Match;
  createdAt: Date;
}
```

Delete the duplicate `MatchStatus` type from the infrastructure layer. Import `MatchStatus` from the domain wherever needed in infrastructure.

---

## Acceptance Criteria

- [ ] `MatchStatus` type removed from `infrastructure/persistence/MatchRepository.ts`
- [ ] `status` field removed from `MatchSession`
- [ ] Any code reading `session.status` is updated to call `session.match.getStatus()`
- [ ] Domain `MatchStatus` enum is the single definition
- [ ] All existing tests pass

---

## Files to Modify

- `src/infrastructure/persistence/MatchRepository.ts` — remove duplicate type and `status` field
- Any file that reads `session.status` directly (check with grep)
