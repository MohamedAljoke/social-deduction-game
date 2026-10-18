# Social Deduction Game docs

How the game works, part by part. Start with the [project README](../README.md) for the overview.

| Doc | What it covers |
| --- | --- |
| [DOMAIN.md](DOMAIN.md) | The `Match` aggregate, its invariants and typed errors, domain services, domain events, ports and layers |
| [ABILITIES.md](ABILITIES.md) | The abilities, staged and prioritized resolution, one handler per ability, roles and win conditions |
| [REALTIME.md](REALTIME.md) | HTTP for actions and WebSockets for updates, match rooms, join authorization, surviving a refresh |
| [AI-NARRATOR.md](AI-NARRATOR.md) | The optional AI game master: a port, provider failover, public events only, never blocking the game |
| [TESTING.md](TESTING.md) | Architecture fitness tests, the test layers, Playwright and CI |

## Development notes

- [backend/docs/architecture.md](../backend/docs/architecture.md) and
  [architecture-analysis.md](../backend/docs/architecture-analysis.md): diagrams and an in-depth review of
  the backend.
- [backend/docs/adr/](../backend/docs/adr): architecture decision records.
- [backend/docs/learn/](../backend/docs/learn): study notes on testing, dependency injection, SOLID and
  clean architecture, with examples from this code.
- [backend/plan.md](../backend/plan.md): the plan behind the staged ability system.
- [CONTRIBUTING.md](../CONTRIBUTING.md) and [dev/gh-new-issue.md](dev/gh-new-issue.md): how work is
  tracked and submitted.
