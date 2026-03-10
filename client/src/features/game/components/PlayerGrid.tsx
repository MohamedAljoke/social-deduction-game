import type { Match, Player } from "../../../types/match";
import { PLAYER_COLORS } from "../hooks";

function getPlayerCardBorder(isDead: boolean, isSelected: boolean): string {
  if (isDead) return "2px solid #6b6b80";
  if (isSelected) return "2px solid #e94560";
  return "2px solid #2a2a4a";
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
          isSelected={
            selectedTarget === player.id || selectedVote === player.id
          }
          canSelectPlayers={canSelectPlayers}
          showVoteCount={match.phase === "voting" && showVotingTransparency}
          voteCount={
            match.votes?.filter((vote) => vote.targetId === player.id).length ?? 0
          }
          colorIndex={index}
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
  onSelectPlayer,
}: {
  player: Player;
  playerId: string | null;
  isSelected: boolean;
  canSelectPlayers: boolean;
  showVoteCount: boolean;
  voteCount: number;
  colorIndex: number;
  onSelectPlayer: (playerId: string) => void;
}) {
  const isDead = player.status !== "alive";
  const isSelf = player.id === playerId;
  const isClickable = !isDead && canSelectPlayers;

  return (
    <div
      className="rounded-2xl p-4 text-center transition-all duration-200"
      style={{
        backgroundColor: "#16213e",
        border: getPlayerCardBorder(isDead, isSelected),
        opacity: isDead ? 0.5 : 1,
        boxShadow: isSelected ? "0 0 20px rgba(233,69,96,0.4)" : "none",
        cursor: isClickable ? "pointer" : "not-allowed",
      }}
      onClick={() => {
        if (isClickable) {
          onSelectPlayer(player.id);
        }
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg mx-auto mb-2.5"
        style={{
          background: `linear-gradient(135deg, ${PLAYER_COLORS[colorIndex % PLAYER_COLORS.length]}, #764ba2)`,
        }}
      >
        {player.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="font-semibold text-sm mb-1">
        {player.name}
        {isSelf ? " (You)" : ""}
      </div>
      <div
        className="text-[11px] uppercase"
        style={{
          color: player.status === "alive" ? "#4ade80" : "#e94560",
        }}
      >
        {player.status}
      </div>
      {showVoteCount && voteCount > 0 && (
        <div
          className="mt-1 text-[11px] font-bold rounded-full px-2 py-0.5 inline-block"
          style={{ backgroundColor: "#e94560", color: "#fff" }}
        >
          {voteCount} vote{voteCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
