import type { Match, Player } from "../../../types/match";
import { t } from "@/infrastructure/i18n/translations";
import {
  type GameMasterFeedEntry,
  type GameLogEntry,
  PANEL_STYLE,
} from "./gameScreenShared";

function getVoteTargetLabel(match: Match, player: Player): string {
  const vote = match.votes?.find((entry) => entry.voterId === player.id);
  if (vote === undefined) return t("game.waiting");
  if (vote.targetId === null) return t("game.skip");
  return (
    match.players.find((entry) => entry.id === vote.targetId)?.name ??
    t("game.unknownPlayer")
  );
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
      <div className="text-base mb-4 text-ink">{t("game.confirmAction")}</div>
      <button
        className="py-3 px-8 border-none rounded-lg text-white text-sm font-semibold cursor-pointer bg-success"
        onClick={onConfirm}
      >
        {t("game.confirm")}
      </button>
      <button
        className="py-3 px-8 rounded-lg text-sm cursor-pointer ml-3 bg-transparent border-2 border-rim text-ink-muted"
        onClick={onCancel}
      >
        {t("game.cancel")}
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
  const alivePlayers = match.players.filter((p) => p.status === "alive");

  return (
    <div
      data-testid="vote-status-panel"
      className="rounded-2xl p-4 mb-5"
      style={PANEL_STYLE}
    >
      <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-ink-muted">
        {t("game.voteStatus")}
      </div>
      {alivePlayers.map((player) => {
        const vote = match.votes?.find((entry) => entry.voterId === player.id);
        return (
          <div
            key={player.id}
            className="flex justify-between text-sm py-1 border-b border-rim text-ink-secondary"
          >
            <span className="text-brand font-semibold">
              {player.name}
              {player.id === playerId ? " (You)" : ""}
            </span>
            <span>
              →{" "}
              <span
                className={`font-semibold ${vote?.targetId === null ? "text-ink-muted" : "text-success"}`}
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
      <div className="text-base mb-4 text-ink">{t("game.voteInstruction")}</div>
      <button
        className="py-3 px-8 border-none rounded-lg text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-success"
        disabled={isCastVoteDisabled}
        onClick={onConfirm}
      >
        {pendingVoteAction === "cast"
          ? t("game.castingVote")
          : t("game.castVote")}
      </button>
      <button
        className="py-3 px-8 rounded-lg text-sm font-semibold cursor-pointer ml-3 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-2 border-ink-muted text-ink-secondary"
        disabled={isVoteSubmitting}
        onClick={onSkipVote}
      >
        {pendingVoteAction === "skip"
          ? t("game.skippingVote")
          : t("game.skipVote")}
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
      <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-ink-muted">
        {t("game.gameLog")}
      </div>
      {actions.length === 0 ? (
        <div className="text-sm py-1.5 border-b border-rim text-ink-secondary">
          {t("game.gameStartedWaiting")}
        </div>
      ) : (
        actions.map((action, index) => (
          <div
            key={index}
            className="text-sm py-1.5 border-b border-rim text-ink-secondary"
          >
            <span className="text-brand font-semibold">{action.actorName}</span>{" "}
            {action.verb}{" "}
            <span className="text-success font-semibold">
              {action.targetNames}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export function GameMasterPanel({
  messages,
  emptyMessage,
  title,
}: {
  messages: GameMasterFeedEntry[];
  emptyMessage: string;
  title: string;
}) {
  return (
    <div
      data-testid="game-master-panel"
      className="rounded-2xl p-4 max-h-[220px] overflow-y-auto"
      style={PANEL_STYLE}
    >
      <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-ink-muted">
        {title}
      </div>
      {messages.length === 0 ? (
        <div className="text-sm py-1.5 border-b border-rim text-ink-secondary">
          {emptyMessage}
        </div>
      ) : (
        messages.map((entry) => (
          <div
            key={entry.messageId}
            className="text-sm py-2 border-b border-rim text-gm-text"
          >
            {entry.message}
          </div>
        ))
      )}
    </div>
  );
}
