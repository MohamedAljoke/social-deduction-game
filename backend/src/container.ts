import { CreateMatchUseCase } from "./application/CreateMatch";
import { ListMatchesUseCase } from "./application/ListMatchs";
import { JoinMatchUseCase } from "./application/JoinMatch";
import { StartMatchUseCase } from "./application/StartMatch";
import { UseAbilityUseCase } from "./application/UseAbility";
import { AdvancePhaseUseCase } from "./application/AdvancePhase";
import { GetMatchUseCase } from "./application/GetMatch";
import { MatchRepository } from "./domain/ports/persistance/MatchRepository";
import { RealtimePublisher } from "./domain/ports/RealtimePublisher";
import { InMemoryMatchRepository } from "./infrastructure/persistence/InMemoryMatchRepository";
import { WebSocketPublisher } from "./infrastructure/websocket/WebSocketPublisher";

const wsPublisher = new WebSocketPublisher();

// Branded token type used for type-safe dependency resolution.
// At runtime this is just a string, but at compile time it carries
// the associated return type (T) so `container.resolve(token)`
// can correctly infer the resolved dependency type.
// The phantom property exists only for typing and is erased in JS.
export type Token<T> = string & { __type?: T };

export const TOKENS = {
  MatchRepository: "MatchRepository" as Token<MatchRepository>,
  CreateMatchUseCase: "CreateMatchUseCase" as Token<CreateMatchUseCase>,
  ListMatchesUseCase: "ListMatchesUseCase" as Token<ListMatchesUseCase>,
  JoinMatchUseCase: "JoinMatchUseCase" as Token<JoinMatchUseCase>,
  StartMatchUseCase: "StartMatchUseCase" as Token<StartMatchUseCase>,
  UseAbilityUseCase: "UseAbilityUseCase" as Token<UseAbilityUseCase>,
  AdvancePhaseUseCase: "AdvancePhaseUseCase" as Token<AdvancePhaseUseCase>,
  GetMatchUseCase: "GetMatchUseCase" as Token<GetMatchUseCase>,
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

export function buildContainer() {
  const container = new Container();

  container.register(
    TOKENS.MatchRepository,
    () => new InMemoryMatchRepository(),
    { singleton: true },
  );

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
        wsPublisher,
      ),
  );

  container.register(
    TOKENS.StartMatchUseCase,
    (c) =>
      new StartMatchUseCase(
        c.resolve(TOKENS.MatchRepository),
        wsPublisher,
      ),
  );

  container.register(
    TOKENS.UseAbilityUseCase,
    (c) => new UseAbilityUseCase(c.resolve(TOKENS.MatchRepository)),
  );

  container.register(
    TOKENS.AdvancePhaseUseCase,
    (c) => new AdvancePhaseUseCase(c.resolve(TOKENS.MatchRepository)),
  );

  container.register(
    TOKENS.GetMatchUseCase,
    (c) => new GetMatchUseCase(c.resolve(TOKENS.MatchRepository)),
  );

  return container;
}
