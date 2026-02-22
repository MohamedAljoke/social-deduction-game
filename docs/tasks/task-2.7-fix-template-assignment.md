# Task 2.7 — Fix Silent Template Assignment

**Priority:** Medium (correctness bug)
**Phase:** 1

---

## Problem

`match.ts:69-84`:

```typescript
public start(templates: Template[]): void {
  if (this.status !== MatchStatus.LOBBY) {
    throw new MatchAlreadyStarted();
  }
  const templateMap = new Map(templates.map((t) => [t.id, t]));
  this.players.forEach((player, index) => {
    const template = templateMap.get(templates[index].id);
    if (template) {
      player.assignTemplate(template);
    }
  });
  this.status = MatchStatus.STARTED;
}
```

Four problems:

1. If `templates.length < players.length`, some players silently get no template
2. If `templates.length > players.length`, extra templates are silently ignored
3. The `templateMap` construction is redundant — `templates[index]` already gives the template directly
4. No validation that every player actually received a template

---

## Proposed Solution

```typescript
public start(templates: Template[]): void {
  if (this.status !== MatchStatus.LOBBY)
    throw new MatchAlreadyStarted();
  if (templates.length !== this.players.length)
    throw new TemplatePlayerCountMismatch(templates.length, this.players.length);

  this.players.forEach((player, index) => {
    player.assignTemplate(templates[index]);
  });

  this.status = MatchStatus.STARTED;
}
```

---

## Acceptance Criteria

- [ ] `TemplatePlayerCountMismatch` error class created (extends `DomainError` with a machine-readable `code`)
- [ ] `Match.start()` throws `TemplatePlayerCountMismatch` when `templates.length !== players.length`
- [ ] The redundant `templateMap` construction removed
- [ ] The silent `if (template)` guard removed — every player is always assigned
- [ ] HTTP layer maps `TemplatePlayerCountMismatch` to `400` in `middleware.ts`
- [ ] Test: starting with too few templates throws
- [ ] Test: starting with too many templates throws
- [ ] Existing start tests still pass

---

## Files to Modify

- `src/domain/match.ts` — fix `start()`
- `src/domain/errors.ts` (or wherever errors are defined) — add `TemplatePlayerCountMismatch`
- `src/http/middleware.ts` — map new error to 400
