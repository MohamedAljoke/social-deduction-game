import type { Match, TemplateInput } from "../../domain/match"

const API_URL = "http://localhost:3000"

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl
  }

  async createMatch(name: string): Promise<Match> {
    const response = await fetch(`${this.baseUrl}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!response.ok) throw new Error("Failed to create match")
    return response.json()
  }

  async getMatch(matchId: string): Promise<Match> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}`)
    if (!response.ok) throw new Error("Failed to fetch match")
    return response.json()
  }

  async joinMatch(matchId: string, name: string): Promise<Match> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!response.ok) throw new Error("Failed to join match")
    return response.json()
  }

  async startMatch(matchId: string, templates: TemplateInput[]): Promise<Match> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates }),
    })
    if (!response.ok) throw new Error("Failed to start match")
    return response.json()
  }

  async useAbility(
    matchId: string,
    actorId: string,
    abilityId: string,
    targetIds: string[]
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}/ability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId, abilityId, targetIds }),
    })
    if (!response.ok) throw new Error("Failed to use ability")
  }

  async advancePhase(matchId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/match/${matchId}/phase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) throw new Error("Failed to advance phase")
  }
}
