const API_URL = 'http://localhost:3000';

export const api = {
  async createMatch(name: string) {
    const response = await fetch(`${API_URL}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error('Failed to create match');
    return response.json();
  },

  async getMatch(matchId: string) {
    const response = await fetch(`${API_URL}/match/${matchId}`);
    if (!response.ok) throw new Error('Failed to fetch match');
    return response.json();
  },

  async joinMatch(matchId: string, name: string) {
    const response = await fetch(`${API_URL}/match/${matchId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error('Failed to join match');
    return response.json();
  },

  async startMatch(matchId: string, templates: { name?: string; alignment: string; abilities: { id: string }[] }[]) {
    const response = await fetch(`${API_URL}/match/${matchId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates }),
    });
    if (!response.ok) throw new Error('Failed to start match');
    return response.json();
  },

  async useAbility(matchId: string, actorId: string, abilityId: string, targetIds: string[]) {
    const response = await fetch(`${API_URL}/match/${matchId}/ability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorId, abilityId, targetIds }),
    });
    if (!response.ok) throw new Error('Failed to use ability');
    return response.json();
  },

  async advancePhase(matchId: string) {
    const response = await fetch(`${API_URL}/match/${matchId}/phase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to advance phase');
    return response.json();
  },
};
