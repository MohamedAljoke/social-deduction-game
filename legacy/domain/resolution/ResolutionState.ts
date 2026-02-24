export class ResolutionState {
  private data = new Map<string, unknown>();

  getSet(key: string): Set<string> {
    if (!this.data.has(key)) this.data.set(key, new Set<string>());
    return this.data.get(key) as Set<string>;
  }

  getMap(key: string): Map<string, string> {
    if (!this.data.has(key)) this.data.set(key, new Map<string, string>());
    return this.data.get(key) as Map<string, string>;
  }
}
