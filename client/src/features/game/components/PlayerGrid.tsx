import type { Match, Player } from "../../../types/match";
import { t } from "@/infrastructure/i18n/translations";

function getCardBorderClass(isDead: boolean, isSelected: boolean): string {
  if (isDead) return "border-ink-muted";
  if (isSelected) return "border-brand";
  return "border-rim";
}

export function PlayerGrid({
  match,
  playerId,
  selectedTarget,
  selectedVote,
  canSelectPlayers,
  showVotingTransparency,
  onSelectPlayer,
}: {
  match: Match;
  playerId: string | null;
  selectedTarget: string | null;
  selectedVote: string | null;
  canSelectPlayers: boolean;
  showVotingTransparency: boolean;
  onSelectPlayer: (playerId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-5">
      {match.players.map((player, index) => (
        <PlayerCard
          key={player.id}
          player={player}
          playerId={playerId}
          isSelected={selectedTarget === player.id || selectedVote === player.id}
          canSelectPlayers={canSelectPlayers}
          showVoteCount={match.phase === "voting" && showVotingTransparency}
          voteCount={
            match.votes?.filter((vote) => vote.targetId === player.id).length ?? 0
          }
          colorIndex={index}
          staggerIndex={index}
          onSelectPlayer={onSelectPlayer}
        />
      ))}
    </div>
  );
}

function PlayerCard({
  player,
  playerId,
  isSelected,
  canSelectPlayers,
  showVoteCount,
  voteCount,
  colorIndex,
  staggerIndex,
  onSelectPlayer,
}: {
  player: Player;
  playerId: string | null;
  isSelected: boolean;
  canSelectPlayers: boolean;
  showVoteCount: boolean;
  voteCount: number;
  colorIndex: number;
  staggerIndex: number;
  onSelectPlayer: (playerId: string) => void;
}) {
  const isDead = player.status !== "alive";
  const isSelf = player.id === playerId;
  const isClickable = !isDead && canSelectPlayers;

  const testId = `player-card-${player.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  const staggerClass = `slide-up stagger-${Math.min(staggerIndex + 1, 8)}`;
  const borderClass = getCardBorderClass(isDead, isSelected);

  return (
    <div
      className={`rounded-2xl p-4 text-center transition-all duration-200 border-2 bg-surface-card
        ${borderClass} ${staggerClass} ${isSelected ? "glow-pulse" : ""}`}
      data-testid={testId}
      style={{
        opacity: isDead ? 0.5 : 1,
        cursor: isClickable ? "pointer" : "not-allowed",
      }}
      onClick={() => { if (isClickable) onSelectPlayer(player.id); }}
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg mx-auto mb-2.5 avatar-gradient-${colorIndex % 5}`}
      >
        {player.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="font-semibold text-sm mb-1 text-ink">
        {player.name}{isSelf ? t('game.youLabel') : ""}
      </div>
      <div className={`text-[11px] uppercase ${player.status === "alive" ? "text-success" : "text-brand-dim"}`}>
        {player.status}
      </div>
      {showVoteCount && voteCount > 0 && (
        <div
          data-testid="vote-count-badge"
          className="mt-1 text-[11px] font-bold rounded-full px-2 py-0.5 inline-block bg-brand text-white"
        >
          {voteCount} {voteCount !== 1 ? t('game.voteCount.plural') : t('game.voteCount.singular')}
        </div>
      )}
    </div>
  );
}
