# Social Deduction Game — Health Check & Roadmap

## Overall Assessment

| Metric                     | Score                                                  |
| -------------------------- | ------------------------------------------------------ |
| Core gameplay completeness | 90%                                                    |
| Architecture quality       | Excellent (clean DDD layers, no coupling violations)   |
| Test coverage              | Good (50+ E2E scenarios, all phases/abilities covered) |
| Production readiness       | 75% (no DB, no auth, no WS retry)                      |

---

## What's Implemented

| Area                                                    | Status   |
| ------------------------------------------------------- | -------- |
| Phase cycle (discussion → voting → action → resolution) | Complete |
| Multi-stage action resolution with priority             | Complete |
| Voting (casting, counting, tie/skip/no-vote)            | Complete |
| 4 ability types (kill, protect, roleblock, investigate) | Complete |
| Alignment-based win conditions (Hero/Villain parity)    | Complete |
| Template-specific win conditions (EliminateAlignment)   | Complete |
| Real-time WebSocket sync                                | Complete |
| Session persistence via localStorage                    | Complete |
| End screen with role reveals                            | Complete |
| Template builder UI (lobby)                             | Complete |
| Dead player restrictions in UI                          | Complete |
| E2E test suite                                          | Complete |

---

## Gaps Found

### Bug: Neutral alignment has no win path

- `WinConditionEvaluator.ts` counts neutral players but has zero win logic for them
- Neutral templates can be configured in the template builder but can never trigger victory
- The builder even offers "Eliminate Neutrals" as a target alignment — neutrals have no reciprocal path

### Structural gaps

| Gap                                        | Severity | Notes                                                                          |
| ------------------------------------------ | -------- | ------------------------------------------------------------------------------ |
| Neutral has no win logic                   | High     | Real gameplay bug                                                              |
| No WS reconnection retry/backoff           | Medium   | Connection drops = stuck game; localStorage reconnect exists but no retry loop |
| Template builder ability list is hardcoded | Low      | Adding new ability types requires updating frontend ABILITIES array manually   |
| No persistent storage                      | Low-Med  | In-memory only; server restart wipes all matches                               |
| No authentication                          | Low      | Any player ID is trusted; fine for LAN/local play                              |

---

## Ability Extension Points

The handler framework is designed for easy extension:

```
backend/src/domain/services/resolution/
├── ActionResolver.ts          ← core multi-stage runner (don't touch)
├── ActionResolverFactory.ts   ← register new handlers HERE
├── EffectHandler.ts           ← interface to implement
└── handlers/
    ├── KillHandler.ts
    ├── ProtectHandler.ts
    ├── RoleBlockHandler.ts
    └── InvestigateHandler.ts
```

Adding a new ability = 1 new handler file + 1 line in factory + 1 enum value + 1 line in frontend ABILITIES array.

---

## Recommended Roadmap

### Priority 1 — Fix Neutral Win Condition (bug)

Add `survive_to_end` win condition: neutral wins alongside the alignment winner if alive when game ends.

**Files:**

- `backend/src/domain/entity/match.ts` → add `SurviveToEnd = "survive_to_end"` to `WinCondition` enum
- `backend/src/domain/services/match/WinConditionEvaluator.ts` → after alignment winner determined, collect alive players with `SurviveToEnd` as co-winners
- `client/src/features/lobby/TemplateBuilder/TemplateBuilderScreen.tsx` → add `survive_to_end` to WIN_CONDITIONS; hide alignment picker for this option
- `client/src/domain/match.ts` → add `"survive_to_end"` to WinCondition union type

---

---

### Priority 3 — Add `corrupt` Ability (Frame)

Marks a target so any investigation or reveal returns "villain" for them, regardless of true alignment.

- Stage: TARGET_MUTATION (runs first) | Priority: 0 | Targets: 1 alive player

**Files:**

- `backend/src/domain/entity/ability.ts` → add `Corrupt = "corrupt"` + priority entry
- `backend/src/domain/services/resolution/handlers/CorruptHandler.ts` → new file; adds "corrupted" modifier to target
- `backend/src/domain/services/resolution/handlers/InvestigateHandler.ts` → check "corrupted" modifier → return "villain" if present
- `backend/src/domain/services/resolution/handlers/RevealHandler.ts` → same corrupted check
- `backend/src/domain/services/resolution/ActionResolverFactory.ts` → register handler
- `client/src/features/lobby/TemplateBuilder/TemplateBuilderScreen.tsx` → add corrupt to ABILITIES list

---

## Ability Interaction Chain (Reveal + Corrupt)

```
Night phase:
  Villain A uses Corrupt on Hero B
  Hero C uses Reveal on Hero B

Resolution order:
  1. TARGET_MUTATION: Corrupt marks Hero B as "corrupted"
  2. READ: Reveal checks Hero B → sees "corrupted" → broadcasts "Hero B is villain"

Result: All players falsely believe Hero B is a villain
```
