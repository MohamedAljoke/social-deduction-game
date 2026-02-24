import { Action } from "../models/action";
import { AbilityEffectFactory, EffectRegistry, INVESTIGATIONS_KEY } from "../effects";
import { ResolutionState } from "../resolution/ResolutionState";
import { ResolutionContext, ResolutionEvent } from "../resolution/ResolutionContext";
import { PlayerRoster } from "./PlayerRoster";

export class ActionResolver {
  private actionQueue: Action[] = [];
  private effectRegistry: EffectRegistry;
  private investigationResults: Map<string, string> = new Map();
  private events: ResolutionEvent[] = [];

  constructor(private playerRoster: PlayerRoster) {
    this.effectRegistry = AbilityEffectFactory.createRegistry();
  }

  submitAction(action: Action): void {
    this.actionQueue.push(action);
  }

  resolveActions(): Map<string, string> {
    this.investigationResults = new Map();
    this.events = [];

    const state = new ResolutionState();

    const context: ResolutionContext = {
      killPlayer: (id: string) => this.playerRoster.eliminatePlayer(id),
      isPlayerAlive: (id: string) => {
        return this.playerRoster.isPlayerAlive(id);
      },
      getPlayerAlignment: (id: string) => {
        return this.playerRoster.getPlayerAlignment(id);
      },
      emit: (event: ResolutionEvent) => {
        this.events.push(event);
      },
    };

    const actionEffectPairs = this.actionQueue
      .map((action) => ({
        action,
        effect: this.effectRegistry.getEffect(action.abilityId),
      }))
      .filter((pair) => pair.effect !== undefined)
      .sort((a, b) => a.effect!.priority - b.effect!.priority);

    for (const { action, effect } of actionEffectPairs) {
      effect!.execute(action, this.actionQueue, context, state);
    }

    this.investigationResults = state.getMap(INVESTIGATIONS_KEY);

    this.actionQueue = [];

    return this.investigationResults;
  }

  getInvestigationResults(): Map<string, string> {
    return this.investigationResults;
  }

  getEvents(): ResolutionEvent[] {
    return this.events;
  }
}
