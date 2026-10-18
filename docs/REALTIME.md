# Realtime: one room per match

Players act over plain HTTP and hear about everything over a WebSocket. That split keeps actions simple to
validate and retry, and keeps every screen in a match in step without polling.

## The path of a vote

```text
client ─POST /match/:id/vote─► route (Zod) ─► SubmitVote ─► match.submitVote ─► save
                                                       │
                                                       └─► pullEvents ─► RealtimePublisher
                                                                              │
every client in the match room ◄── vote_submitted ◄── WebSocketPublisher ◄────┘
```

The use case talks to `RealtimePublisher`, a port in the domain. `WebSocketPublisher` implements it on top
of `ws`, so no use case knows how messages travel.

## Who a player is

Joining a match returns the new player's id and a secret **player token**, shown only to that player.
Every action that speaks for a player (voting, using an ability, leaving, starting, advancing) sends it in
an `X-Player-Token` header, and the use case asks the aggregate who it belongs to with
`match.identify(token)`. Player ids are public, since every screen shows the players; the token is what
proves who is acting. A missing or wrong token is a `401` with `invalid_player_token`.

## Each player sees their own table

Roles are secret, so there is no single snapshot of a match anymore. `MatchSnapshotMapper` builds a
view for one viewer:

- their own role, and nobody else's, while the match runs;
- only their own queued actions;
- every role once the match has finished, for the end screen.

HTTP responses are the caller's view, and a `GET` without a token gets the public one. Over the socket,
`publishMatchEvents` builds one view per player and the room sends each socket its own.

## Rooms and joining

`WebSocketManager` (`infrastructure/websocket/mod.ts`) keeps a `MatchRoom` per match. A client opens
`ws://.../ws` and sends `join_match` with its match id and player token. A `JoinAuthorizer` resolves the
token to a player of that match before the socket joins the room, so a socket can't listen in on a match,
or as a player, it isn't.

Most events go to the whole room: players joining and leaving, the start, votes, phase changes, deaths and
the end. Investigation results don't: `InvestigateResult` is sent **only to the investigator**, through
`sendToPlayer`.

## Surviving a refresh

The client keeps its match id, player id, player token and name in `localStorage`. After a reload it
fetches its own view of the match over HTTP and joins the room again, landing back on the same screen.
Playwright's `session-persistence.spec.ts` covers this.

When a player leaves, a `DisconnectHandler` runs the `LeaveMatch` use case with that socket's token, so a
lobby doesn't fill up with players who closed the tab.

## Where to look

| Path | What it holds |
| --- | --- |
| `backend/src/application/publishMatchEvents.ts` | Domain events to realtime messages |
| `backend/src/infrastructure/websocket/` | Rooms, join authorization, the publisher |
| `client/src/infrastructure/ws/GameGateway.ts` | The client side of the socket |
| `client/src/context/GameContext.tsx` | Game state and the stored session |
