# Task 2.8 — Derive Zod Schemas from AbilityId Enum

**Priority:** High (correctness — new abilities are silently rejected by HTTP)
**Phase:** 1

---

## Problem

Ability IDs are hardcoded in two HTTP schemas:

```typescript
// matches.ts:33-37
const submitActionSchema = z.object({
  abilityId: z.enum(["kill", "protect"]),   // ← hardcoded
  ...
});

// templates.ts:16-24
const templateSchema = z.object({
  abilities: z.array(z.object({
    id: z.enum(["kill", "protect"]),         // ← hardcoded
    ...
  })),
  ...
});
```

When `AbilityId` enum adds `"roleblock"` or `"investigate"`, these schemas silently reject valid requests. The domain and HTTP layers are out of sync.

---

## Proposed Solution

Derive the Zod enum from the domain `AbilityId` enum values:

```typescript
import { AbilityId } from "../../domain/ability";

const abilityIdValues = Object.values(AbilityId) as [string, ...string[]];

const submitActionSchema = z.object({
  abilityId: z.enum(abilityIdValues),
  ...
});
```

Adding a new `AbilityId` value automatically updates both schemas.

---

## Acceptance Criteria

- [ ] `matches.ts` derives `abilityId` enum from `Object.values(AbilityId)`
- [ ] `templates.ts` derives ability `id` enum from `Object.values(AbilityId)`
- [ ] No hardcoded ability string literals remain in HTTP schemas
- [ ] `"roleblock"` and `"investigate"` are accepted by both schemas after this change
- [ ] All existing route tests pass

---

## Files to Modify

- `src/http/routes/matches.ts`
- `src/http/routes/templates.ts`
