import { CreateMatchUseCase } from "./application/CreateMatch";
import { AiNarrator } from "./application/ai/AiNarrator";
import { ListMatchesUseCase } from "./application/ListMatchs";
import { JoinMatchUseCase } from "./application/JoinMatch";
import { LeaveMatchUseCase } from "./application/LeaveMatch";
import { StartMatchUseCase } from "./application/StartMatch";
import { UseAbilityUseCase } from "./application/UseAbility";
import { AdvancePhaseUseCase } from "./application/AdvancePhase";
import { SubmitVoteUseCase } from "./application/SubmitVote";
import { GetMatchUseCase } from "./application/GetMatch";
import { RematchMatchUseCase } from "./application/RematchMatch";
import { RealtimePublisher } from "./domain/ports/RealtimePublisher";
import { MatchRepository } from "./domain/ports/persistance/MatchRepository";
import { InMemoryMatchRepository } from "./infrastructure/persistence/InMemoryMatchRepository";
import {
  MatchBroadcaster,
  WebSocketPublisher,
} from "./infrastructure/websocket/WebSocketPublisher";
import { createAiNarratorFromEnv } from "./infrastructure/ai/createAiNarratorFromEnv";
import { ActionResolver, ActionResolverFactory } from "./domain/services/resolution";

// Branded token type used for type-safe dependency resolution.
// At runtime this is just a string, but at compile time it carries
// the associated return type (T) so `container.resolve(token)`
// can correctly infer the resolved dependency type.
// The phantom property exists only for typing and is erased in JS.
export type Token<T> = string & { __type?: T };

export const TOKENS = {
  MatchRepository: "MatchRepository" as Token<MatchRepository>,
  RealtimePublisher: "RealtimePublisher" as Token<RealtimePublisher>,
  AiNarrator: "AiNarrator" as Token<AiNarrator>,
  CreateMatchUseCase: "CreateMatchUseCase" as Token<CreateMatchUseCase>,
  ListMatchesUseCase: "ListMatchesUseCase" as Token<ListMatchesUseCase>,
  JoinMatchUseCase: "JoinMatchUseCase" as Token<JoinMatchUseCase>,
  LeaveMatchUseCase: "LeaveMatchUseCase" as Token<LeaveMatchUseCase>,
  StartMatchUseCase: "StartMatchUseCase" as Token<StartMatchUseCase>,
  UseAbilityUseCase: "UseAbilityUseCase" as Token<UseAbilityUseCase>,
  AdvancePhaseUseCase: "AdvancePhaseUseCase" as Token<AdvancePhaseUseCase>,
  SubmitVoteUseCase: "SubmitVoteUseCase" as Token<SubmitVoteUseCase>,
  GetMatchUseCase: "GetMatchUseCase" as Token<GetMatchUseCase>,
  RematchMatchUseCase: "RematchMatchUseCase" as Token<RematchMatchUseCase>,
  ActionResolver: "ActionResolver" as Token<ActionResolver>,
};

export class Container {
  private providers = new Map<string, any>();
  private singletons = new Map<string, any>();

  register<T>(
    token: Token<T>,
    factory: (container: Container) => T,
    options?: { singleton?: boolean },
  ) {
    this.providers.set(token, { factory, singleton: options?.singleton });
  }

  resolve<T>(token: Token<T>): T {
    const provider = this.providers.get(token);

    if (!provider) {
      throw new Error(`No provider found for token: ${token}`);
    }

    if (provider.singleton) {
      if (!this.singletons.has(token)) {
        this.singletons.set(token, provider.factory(this));
      }
      return this.singletons.get(token);
    }

    return provider.factory(this);
  }
}

export function buildContainer(matchBroadcaster: MatchBroadcaster) {
  const container = new Container();

  container.register(
    TOKENS.MatchRepository,
    () => new InMemoryMatchRepository(),
    { singleton: true },
  );

  container.register(
    TOKENS.ActionResolver,
    () => ActionResolverFactory.create(),
    { singleton: true },
  );

  container.register(
    TOKENS.RealtimePublisher,
    () => new WebSocketPublisher(matchBroadcaster),
    { singleton: true },
  );

  container.register(TOKENS.AiNarrator, () => createAiNarratorFromEnv(), {
    singleton: true,
  });

  container.register(
    TOKENS.CreateMatchUseCase,
    (c) => new CreateMatchUseCase(c.resolve(TOKENS.MatchRepository)),
  );

  container.register(
    TOKENS.ListMatchesUseCase,
    (c) => new ListMatchesUseCase(c.resolve(TOKENS.MatchRepository)),
  );

  container.register(
    TOKENS.JoinMatchUseCase,
    (c) =>
      new JoinMatchUseCase(
        c.resolve(TOKENS.MatchRepository),
        c.resolve(TOKENS.RealtimePublisher),
      ),
  );

  container.register(
    TOKENS.StartMatchUseCase,
    (c) =>
      new StartMatchUseCase(
        c.resolve(TOKENS.MatchRepository),
        c.resolve(TOKENS.RealtimePublisher),
        c.resolve(TOKENS.AiNarrator),
      ),
  );

  container.register(
    TOKENS.UseAbilityUseCase,
    (c) => new UseAbilityUseCase(c.resolve(TOKENS.MatchRepository)),
  );

  container.register(
    TOKENS.AdvancePhaseUseCase,
    (c) =>
      new AdvancePhaseUseCase(
        c.resolve(TOKENS.MatchRepository),
        c.resolve(TOKENS.RealtimePublisher),
        c.resolve(TOKENS.ActionResolver),
        c.resolve(TOKENS.AiNarrator),
      ),
  );

  container.register(
    TOKENS.SubmitVoteUseCase,
    (c) =>
      new SubmitVoteUseCase(
        c.resolve(TOKENS.MatchRepository),
        c.resolve(TOKENS.RealtimePublisher),
      ),
  );

  container.register(
    TOKENS.GetMatchUseCase,
    (c) => new GetMatchUseCase(c.resolve(TOKENS.MatchRepository)),
  );

  container.register(
    TOKENS.RematchMatchUseCase,
    (c) =>
      new RematchMatchUseCase(
        c.resolve(TOKENS.MatchRepository),
        c.resolve(TOKENS.RealtimePublisher),
      ),
  );

  container.register(
    TOKENS.LeaveMatchUseCase,
    (c) =>
      new LeaveMatchUseCase(
        c.resolve(TOKENS.MatchRepository),
        c.resolve(TOKENS.RealtimePublisher),
      ),
  );

  return container;
}
