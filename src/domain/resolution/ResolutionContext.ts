export interface ResolutionContext {
  killPlayer(id: string): void;
  isPlayerAlive(id: string): boolean;
  getPlayerAlignment(id: string): string;
}
