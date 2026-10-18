# Tests, and the architecture they protect

The design only stays clean if something fails when it erodes. So besides behaviour, the tests check the
shape of the code.

## Fitness functions

`backend/src/__test__/fitness-functions/architecture-fitness.spec.ts` reads the source tree and fails the
build when a dependency points the wrong way:

- `domain/` must not import from `infrastructure/`;
- the WebSocket infrastructure must not import from `application/`;
- the WebSocket publisher must not reach for a global manager instead of having its dependency injected.

The last one comes from a real refactor, recorded in
[backend/docs/adr/001-realtime-publisher-isp-fix.md](../backend/docs/adr/001-realtime-publisher-isp-fix.md):
once the publisher was split along interface lines, the test keeps it from sliding back.

## Layers of tests

| Layer | Tool | What it covers |
| --- | --- | --- |
| Domain | Vitest | The aggregate's events and phase rules, and each domain service: voting, role assignment, building actions, win conditions, snapshots |
| Application | Vitest | Turning domain events into realtime messages, and the narration pipeline: public events only, context, fallback |
| Infrastructure | Vitest | The WebSocket publisher, each AI provider, failover and choosing a provider from the environment |
| End to end | Vitest | The real server over HTTP (create, join, start, vote, abilities, resolution, and how it refuses bad requests) and over WebSockets |
| Browser | Playwright | Full games in several browser contexts at once: abilities, large matches staying in sync, refreshing mid-game |

## CI

`.github/workflows/ci.yml` runs on every push and pull request: the backend's typecheck, build and tests,
the client's build, and the Playwright suite against the real backend and client.

```sh
npm run test --prefix backend -- --run   # domain, application, infrastructure, e2e, fitness
npm run test:e2e --prefix client         # Playwright
```
