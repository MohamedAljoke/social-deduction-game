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

## Rooms and joining

`WebSocketManager` (`infrastructure/websocket/mod.ts`) keeps a `MatchRoom` per match. A client opens
`ws://.../ws` and sends `join_match` with its match and player ids. A `JoinAuthorizer` checks that this
player really is in that match before the socket joins the room, so a socket can't listen in on a match
it isn't part of.

Most events go to the whole room: players joining and leaving, the start, votes, phase changes, deaths and
the end. Investigation results don't: `InvestigateResult` is sent **only to the investigator**, through
`sendToPlayer`.

## Surviving a refresh

The client keeps its match id, player id and name in `localStorage`. After a reload it fetches the match
over HTTP and joins the room again, landing back on the same screen. Playwright's
`session-persistence.spec.ts` covers this.

When a socket closes, a `DisconnectHandler` runs the `LeaveMatch` use case for that player, so a lobby
doesn't fill up with players who closed the tab.

## Where to look

| Path | What it holds |
| --- | --- |
| `backend/src/application/publishMatchEvents.ts` | Domain events to realtime messages |
| `backend/src/infrastructure/websocket/` | Rooms, join authorization, the publisher |
| `client/src/infrastructure/ws/GameGateway.ts` | The client side of the socket |
| `client/src/context/GameContext.tsx` | Game state and the stored session |
