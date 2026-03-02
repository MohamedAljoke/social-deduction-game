# Testing Fundamentals

## Why Test?

Tests give **confidence** to change code. Without tests, you fear breaking things. With tests, you refactor freely.

## Starting Simple

Let's test a simplified Match class:

```typescript
// match.ts
export class Match {
  constructor(
    public id: string,
    public name: string,
    public status: "lobby" | "started" | "finished" = "lobby"
  ) {}

  start() {
    if (this.status !== "lobby") {
      throw new Error("Can only start a match in lobby");
    }
    this.status = "started";
  }
}
```

## Phase 1: Manual Testing

```typescript
// manual-test.ts
const match = new Match("1", "Test");
match.start();
console.log(match.status); // must check manually
```

Problems: no summary, no isolation, manual verification.

## Phase 2: Helper Functions

```typescript
// test-utils.ts
export function it(description: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${description}`);
  } catch (error) {
    console.log(`✗ ${description}: ${error}`);
  }
}

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
    },
    toThrow(message?: string) {
      let threw = false;
      try { actual(); } catch (e: any) { threw = true; }
      if (!threw) throw new Error("Expected to throw");
    },
  };
}
```

Now tests are readable:

```typescript
it("starts a match", () => {
  const match = new Match("1", "Test");
  match.start();
  expect(match.status).toBe("started");
});
```

## Phase 3: Vitest

Vitest gives you this + more (hooks, mocking, async, coverage).

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("Match", () => {
  let match: Match;

  beforeEach(() => {
    match = new Match("1", "Test");
  });

  it("starts with lobby status", () => {
    expect(match.status).toBe("lobby");
  });

  it("starts the match", () => {
    match.start();
    expect(match.status).toBe("started");
  });

  it("throws if already started", () => {
    match.start();
    expect(() => match.start()).toThrow("Can only start");
  });
});
```

Run: `npx vitest run`

## Core Concepts

| Concept | Purpose |
|---------|---------|
| `describe` | Group related tests |
| `it` / `test` | Single test case |
| `expect` | Assertion |
| `beforeEach` | Reset state before each test |

## In This Project

Real tests in `src/__test__/`:

```typescript
// src/__test__/end-to-end/match.e2e.spec.ts
import { describe, it, expect, beforeEach } from "vitest";
import { Match } from "../domain/entity/match";
import { MatchStatus } from "../domain/entity/match";

describe("Match", () => {
  let match: Match;

  beforeEach(() => {
    match = Match.create("Test");
  });

  it("creates with lobby status", () => {
    expect(match.getStatus()).toBe(MatchStatus.LOBBY);
  });
});
```

## Why DI Makes Testing Easy

With dependency injection, pass mocks instead of real implementations:

```typescript
// No database needed!
const mockRepo = {
  save: vi.fn(),
  findById: vi.fn().mockResolvedValue(null),
};

const useCase = new CreateMatchUseCase(mockRepo);
await useCase.execute({ name: "Test" });

expect(mockRepo.save).toHaveBeenCalled();
```

## Key Takeaway

Tests verify behavior, not implementation. Domain logic in `src/domain/entity/` is pure - no external dependencies, easy to test.

---

[← Back to Overview](./01-overview.md)
