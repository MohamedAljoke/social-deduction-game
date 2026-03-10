import type { Match, Player } from "../../../types/match";
import {
  type GameLogEntry,
  MUTED_TEXT,
  PANEL_STYLE,
} from "./gameScreenShared";

function getVoteTargetLabel(match: Match, player: Player): string {
  const vote = match.votes?.find((entry) => entry.voterId === player.id);
  if (vote === undefined) return "Waiting...";
  if (vote.targetId === null) return "Skip";
  return match.players.find((entry) => entry.id === vote.targetId)?.name ?? "?";
}

export function ActionConfirmation({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl p-5 mb-5 text-center" style={PANEL_STYLE}>
      <div className="text-base mb-4">Confirm your action</div>
      <button
        className="py-3 px-8 border-none rounded-lg text-white text-sm font-semibold cursor-pointer"
        style={{ backgroundColor: "#4ade80" }}
        onClick={onConfirm}
      >
        Confirm
      </button>
      <button
        className="py-3 px-8 rounded-lg text-sm cursor-pointer ml-3"
        style={{
          backgroundColor: "transparent",
          border: "2px solid #2a2a4a",
          color: "#6b6b80",
        }}
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}

export function VoteStatusPanel({
  match,
  playerId,
}: {
  match: Match;
  playerId: string | null;
}) {
  const alivePlayers = match.players.filter((player) => player.status === "alive");

  return (
    <div
      data-testid="vote-status-panel"
      className="rounded-2xl p-4 mb-5"
      style={PANEL_STYLE}
    >
      <div
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "#6b6b80" }}
      >
        Vote Status
      </div>
      {alivePlayers.map((player) => {
        const vote = match.votes?.find((entry) => entry.voterId === player.id);

        return (
          <div
            key={player.id}
            className="flex justify-between text-sm py-1"
            style={{
              color: MUTED_TEXT,
              borderBottom: "1px solid #2a2a4a",
            }}
          >
            <span style={{ color: "#e94560", fontWeight: 600 }}>
              {player.name}
              {player.id === playerId ? " (You)" : ""}
            </span>
            <span>
              →{" "}
              <span
                style={{
                  color: vote?.targetId === null ? "#6b6b80" : "#4ade80",
                  fontWeight: 600,
                }}
              >
                {getVoteTargetLabel(match, player)}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function VotingControls({
  isVoteSubmitting,
  pendingVoteAction,
  isCastVoteDisabled,
  onConfirm,
  onSkipVote,
}: {
  isVoteSubmitting: boolean;
  pendingVoteAction: "cast" | "skip" | null;
  isCastVoteDisabled: boolean;
  onConfirm: () => void | Promise<void>;
  onSkipVote: () => void | Promise<void>;
}) {
  return (
    <div className="rounded-2xl p-5 mb-5 text-center" style={PANEL_STYLE}>
      <div className="text-base mb-4">Vote to eliminate a player</div>
      <button
        className="py-3 px-8 border-none rounded-lg text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#4ade80" }}
        disabled={isCastVoteDisabled}
        onClick={onConfirm}
      >
        {pendingVoteAction === "cast" ? "Casting Vote..." : "Cast Vote"}
      </button>
      <button
        className="py-3 px-8 rounded-lg text-sm font-semibold cursor-pointer ml-3 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: "transparent",
          border: "2px solid #6b6b80",
          color: "#a0a0b8",
        }}
        disabled={isVoteSubmitting}
        onClick={onSkipVote}
      >
        {pendingVoteAction === "skip" ? "Skipping Vote..." : "Skip Vote"}
      </button>
    </div>
  );
}

export function GameLogPanel({ actions }: { actions: GameLogEntry[] }) {
  return (
    <div
      className="rounded-2xl p-4 max-h-[200px] overflow-y-auto"
      style={PANEL_STYLE}
    >
      <div
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "#6b6b80" }}
      >
        Game Log
      </div>
      {actions.length === 0 ? (
        <div
          className="text-sm py-1.5"
          style={{ color: MUTED_TEXT, borderBottom: "1px solid #2a2a4a" }}
        >
          Game started. Waiting for actions...
        </div>
      ) : (
        actions.map((action, index) => (
          <div
            key={index}
            className="text-sm py-1.5"
            style={{ color: MUTED_TEXT, borderBottom: "1px solid #2a2a4a" }}
          >
            <span style={{ color: "#e94560", fontWeight: 600 }}>
              {action.actorName}
            </span>{" "}
            {action.verb}{" "}
            <span style={{ color: "#4ade80", fontWeight: 600 }}>
              {action.targetNames}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
