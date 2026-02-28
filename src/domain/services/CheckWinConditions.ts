import { Match } from "../entity/match";
import { Alignment } from "../entity/template";

export interface WinResult {
  hasWinner: boolean;
  winningAlignment?: Alignment;
}

export class CheckWinConditions {
  check(match: Match): WinResult {
    const players = match.getPlayers();
    const templates = match.getTemplates();

    const alivePlayers = players.filter((p) => p.isAlive());

    if (alivePlayers.length <= 1) {
      if (alivePlayers.length === 1) {
        const winner = this.getPlayerAlignment(alivePlayers[0], templates);
        return { hasWinner: true, winningAlignment: winner };
      }
      return { hasWinner: false };
    }

    const alignmentCounts = this.countAlignments(alivePlayers, templates);

    const aliveAlignments = Object.entries(alignmentCounts)
      .filter(([, count]) => count > 0)
      .map(([alignment]) => alignment as Alignment);

    if (aliveAlignments.length === 1) {
      return { hasWinner: true, winningAlignment: aliveAlignments[0] };
    }

    return { hasWinner: false };
  }

  private countAlignments(
    alivePlayers: ReturnType<Match["getPlayers"]>,
    templates: ReturnType<Match["getTemplates"]>
  ): Record<Alignment, number> {
    const counts: Record<Alignment, number> = {
      [Alignment.Villain]: 0,
      [Alignment.Hero]: 0,
      [Alignment.Neutral]: 0,
    };

    for (const player of alivePlayers) {
      const alignment = this.getPlayerAlignment(player, templates);
      if (alignment) {
        counts[alignment]++;
      }
    }

    return counts;
  }

  private getPlayerAlignment(
    player: ReturnType<Match["getPlayers"]>[number],
    templates: ReturnType<Match["getTemplates"]>
  ): Alignment | undefined {
    const templateId = player.getTemplateId();
    if (!templateId) return undefined;

    const template = templates.find((t) => t.id === templateId);
    return template?.alignment;
  }
}
