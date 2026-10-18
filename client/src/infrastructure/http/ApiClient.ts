import type {
  CreateMatchInput,
  JoinMatchResult,
  Match,
  TemplateInput,
} from "../../types/match";

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

export class ApiClient {
  private baseUrl: string;
  private playerToken: string | null = null;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  setPlayerToken(token: string | null): void {
    this.playerToken = token;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.playerToken ? { "X-Player-Token": this.playerToken } : {}),
    };
  }

  async createMatch(input: CreateMatchInput): Promise<Match> {
    const response = await fetch(`${this.baseUrl}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("Failed to create match");
    return response.json();
  }

  async getMatch(matchId: string): Promise<Match> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}`, {
      headers: this.headers(),
    });
    if (!response.ok) throw new Error("Failed to fetch match");
    return response.json();
  }

  async joinMatch(matchId: string, name: string): Promise<JoinMatchResult> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error("Failed to join match");
    return response.json();
  }

  async startMatch(
    matchId: string,
    templates: TemplateInput[],
  ): Promise<Match> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}/start`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ templates }),
    });
    if (!response.ok) throw new Error("Failed to start match");
    return response.json();
  }

  async rematch(matchId: string): Promise<Match> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}/rematch`, {
      method: "POST",
      headers: this.headers(),
    });
    if (!response.ok) throw new Error("Failed to start rematch");
    return response.json();
  }

  async useAbility(
    matchId: string,
    EffectType: string,
    targetIds: string[],
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}/ability`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ EffectType, targetIds }),
    });
    if (!response.ok) throw new Error("Failed to use ability");
  }

  async submitVote(matchId: string, targetId: string | null): Promise<Match> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}/vote`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ targetId }),
    });
    if (!response.ok) throw new Error("Failed to submit vote");
    return response.json();
  }

  async advancePhase(matchId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}/phase`, {
      method: "POST",
      headers: this.headers(),
    });
    if (!response.ok) throw new Error("Failed to advance phase");
  }
}
