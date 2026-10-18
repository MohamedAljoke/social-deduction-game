# The domain model

The game is small, but its rules are fiddly: who may vote when, what a dead player can still do, when a
side has won. All of them live in one place, the `Match` aggregate, and nothing outside it can put a match
into a state the rules forbid.

## Match is the aggregate root

`backend/src/domain/entity/match.ts` owns everything that changes during a game: the players, the current
phase, the votes, the queued actions, the role templates and the winner. Its fields are private. The only
way to change a match is through a method that names what happened:

| Method | What it does |
| --- | --- |
| `addPlayer`, `removePlayer` | Join or leave the lobby |
| `startWithTemplates` | Assign a role template to every player and start the game |
| `submitVote` | Record a vote in the voting phase |
| `useAbility` | Queue an ability for the action phase |
| `advancePhase` | Move to the next phase, eliminating the voted player when leaving the vote |
| `resolveActions` | Resolve the queued abilities and check for a winner |
| `rematch` | Start again with the same players once a game has ended |

A round goes **discussion → voting → action → resolution**, then around again until a side wins.

## Invariants, enforced where the data lives

Each method checks its own rules before changing anything, and a broken rule is a typed error from
`domain/errors.ts`, never a silent no-op:

- joining a started match throws `MatchAlreadyStarted`;
- voting or acting before the start throws `MatchNotStarted`;
- an ability out of its phase throws `InvalidPhase`;
- a dead player acting throws `PlayerIsDeadError`, unless the ability allows it;
- targeting a dead player throws `TargetNotAlive`, a wrong number of targets `InvalidTargetCount`, and
  yourself, when the ability forbids it, `CannotTargetSelf`;
- starting with fewer templates than players throws `TemplatePlayerCountMismatch`.

The HTTP layer turns these into `4xx` answers with the error's code, so the client can explain what went
wrong without the rules being duplicated in the UI.

The smaller pieces guard their own state too: `Player` knows whether it's alive or eliminated, `Phase`
knows its order and refuses to resolve outside the resolution phase, and `Template` carries a role's
alignment, abilities and win condition.

## Domain services keep the aggregate readable

The aggregate delegates work that is a rule set of its own to small services in
`domain/services/match/`: `MatchVoting` counts votes and picks who is eliminated,
`WinConditionEvaluator` decides whether a side has won, `TemplateAssignmentService` deals roles out, and
`MatchSnapshotMapper` builds the JSON view. Each is tested on its own. Ability resolution has its own
module, described in [ABILITIES.md](ABILITIES.md).

## Domain events

The aggregate doesn't know there are WebSockets. When something happens it **records** an event:
`PlayerJoined`, `PlayerLeft`, `MatchStarted`, `VoteSubmitted`, `PhaseAdvanced`, `ActionsResolved`,
`MatchEnded`, `MatchRematched`.

A use case runs the method, saves the match, and only then **pulls** the events and publishes them:

```ts
match.submitVote(input.voterId, input.targetId);
await this.matchRepository.save(match);
const result = match.toJSON();
publishMatchEvents(match.pullEvents(), result, this.publisher);
```

Publishing after the save means players never hear about a change that wasn't stored. `publishMatchEvents`
translates domain events into realtime messages, so the wire format can change without touching the
domain. See [REALTIME.md](REALTIME.md).

## Ports, and the layers around them

```text
backend/src/
├── domain/           entities, value objects, services, events, errors, ports; no framework imports
├── application/      one use case per action: CreateMatch, JoinMatch, SubmitVote, UseAbility, ...
└── infrastructure/   HTTP (Express and Hono), WebSockets, in-memory repositories, AI providers
```

The inner layers define the interfaces they need: `MatchRepository`, `RealtimePublisher`, `AiNarrator`.
Infrastructure implements them, and `container.ts` wires them together. Even the web framework sits behind
an interface: `ExpressServer` and the Hono adapter both implement `HttpServer`, so switching is one line in
`app.ts`. Matches are kept in memory today; a database would be one more `MatchRepository`.
