# Task 2.5 — Move Repository Interfaces to Domain Layer

**Principle violated:** Dependency Inversion Principle
**Priority:** Low (file-move refactor, no logic changes)
**Phase:** 4

---

## Problem

Currently:

```
application/StartMatchUseCase.ts
  → imports interface from infrastructure/persistence/MatchRepository.ts
  → imports interface from infrastructure/persistence/TemplateRepository.ts
```

In Clean Architecture the **interface** belongs in the domain or application layer. The infrastructure layer provides the **implementation**. The current structure makes the application layer depend on the infrastructure layer for the interface definition — the wrong direction.

---

## Proposed Solution

Move the interface definitions inward. This is a file-move refactor with no logic changes.

**Target structure:**

```
src/domain/repositories/
  MatchRepository.ts        ← interface only (moved from infrastructure)
  TemplateRepository.ts     ← interface only (moved from infrastructure)

src/infrastructure/persistence/
  InMemoryMatchRepository.ts      ← implements domain interface
  InMemoryTemplateRepository.ts   ← implements domain interface
```

Update all import paths. Infrastructure files implement the domain interfaces via `implements`.

---

## Acceptance Criteria

- [ ] `MatchRepository` interface lives in `src/domain/repositories/MatchRepository.ts`
- [ ] `TemplateRepository` interface lives in `src/domain/repositories/TemplateRepository.ts`
- [ ] `InMemoryMatchRepository` imports and implements the domain interface
- [ ] `InMemoryTemplateRepository` imports and implements the domain interface
- [ ] All use cases import the interface from `domain/repositories/`, not from `infrastructure/`
- [ ] No interface definitions remain in the infrastructure layer
- [ ] All existing tests pass (import path updates only)

---

## Notes

This is purely a file-move. No method signatures, no logic, and no types change. It can be done safely with a find-and-replace of import paths after moving the files.
