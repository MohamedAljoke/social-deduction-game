import { useGame } from "../../context/GameContext";
import {
  useGameActions,
  useGamePlayer,
  useGameLog,
  useAvailableAbilities,
  PLAYER_COLORS,
} from "./hooks";
import { AbilitySelector } from "./components/AbilitySelector";

export function GameScreen() {
  const { service, state } = useGame();
  const { match, playerId, currentPlayer, currentTemplate, phaseConfig, isHost } =
    useGamePlayer();
  const {
    selectedAbility,
    selectedTarget,
    selectedVote,
    handleAbilityClick,
    handleTargetClick,
    handleConfirm,
    handleSkipVote,
    handleCancelAbility,
  } = useGameActions();
  const { actions } = useGameLog();
  const { availableAbilities } = useAvailableAbilities();
  const isCurrentPlayerAlive = currentPlayer?.status === "alive";
  const investigateResult = state.investigateResult
    ? {
        ...state.investigateResult,
        targetName:
          match?.players.find((p) => p.id === state.investigateResult!.targetId)
            ?.name ?? state.investigateResult.targetId,
      }
    : null;

  const handleLeave = () => {
    if (confirm("Leave the game?")) {
      service.leave();
    }
  };

  const handleAdvancePhase = () => {
    if (state.matchId) {
      service.advancePhase(state.matchId);
    }
  };

  if (!match) {
    return <div>Loading...</div>;
  }
  const showVotingTransparency = match.config?.showVotingTransparency ?? true;

  return (
    <div
      className="min-w-[400px] mx-auto px-5 py-5"
      style={{ backgroundColor: "#0f0f1a", minHeight: "100vh" }}
    >
      <div className="flex justify-between items-center mb-5">
        <button
          className="bg-transparent border-none cursor-pointer text-sm flex items-center gap-1.5"
          style={{ color: "#a0a0b8" }}
          onClick={handleLeave}
        >
          ← Leave Game
        </button>
      </div>

      {currentTemplate && match.phase === "action" && (
        <div
          className="rounded-2xl p-4 mb-5 text-center"
          style={{ backgroundColor: "#16213e", border: "2px solid #e94560" }}
        >
          <div
            className="text-xs uppercase tracking-widest"
            style={{ color: "#6b6b80" }}
          >
            Your Role
          </div>
          <div className="text-xl font-bold my-1" style={{ color: "#e94560" }}>
            {currentTemplate.name}
          </div>
          <div
            className="text-xs uppercase"
            style={{
              color:
                currentTemplate.alignment === "hero"
                  ? "#4ade80"
                  : currentTemplate.alignment === "villain"
                    ? "#e94560"
                    : "#fbbf24",
            }}
          >
            {currentTemplate.alignment}
          </div>
        </div>
      )}

      <div
        className="rounded-2xl p-5 text-center mb-5"
        style={{ background: "linear-gradient(135deg, #e94560, #ff6b6b)" }}
      >
        <div className="text-2xl font-bold uppercase tracking-wider">
          {phaseConfig.title}
        </div>
        <div className="text-sm opacity-90 mt-1">{phaseConfig.description}</div>
      </div>

      {investigateResult && (
        <div
          data-testid="investigate-result-banner"
          className="rounded-2xl p-4 mb-5 text-center"
          style={{ backgroundColor: "#1a2e1a", border: "2px solid #4ade80" }}
        >
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "#4ade80" }}>
            Investigation Result
          </div>
          <div className="text-base font-semibold" style={{ color: "#ffffff" }}>
            {investigateResult.targetName} is a{" "}
            <span
              style={{
                color:
                  investigateResult.alignment === "villain"
                    ? "#e94560"
                    : investigateResult.alignment === "hero"
                      ? "#4ade80"
                      : "#fbbf24",
                fontWeight: 700,
              }}
            >
              {investigateResult.alignment}
            </span>
          </div>
        </div>
      )}

      {!isCurrentPlayerAlive && (
        <div
          className="rounded-2xl p-4 mb-5 text-center"
          style={{ backgroundColor: "#1a1a2e", border: "2px solid #e94560" }}
        >
          <div className="text-lg font-semibold" style={{ color: "#e94560" }}>
            You have been eliminated
          </div>
          <div className="text-sm mt-1" style={{ color: "#a0a0b8" }}>
            You can continue watching, but you can no longer vote or use
            abilities.
          </div>
        </div>
      )}

      {isHost && match.status === "started" && (
        <div className="mb-5 text-center">
          <button
            className="py-2 px-6 border-none rounded-lg text-white text-sm font-semibold cursor-pointer"
            style={{ backgroundColor: "#6b6b80" }}
            onClick={handleAdvancePhase}
          >
            Next Phase →
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-5">
        {match.players.map((player, index) => {
          const isDead = player.status !== "alive";
          const isSelf = player.id === playerId;
          const isSelected =
            selectedTarget === player.id || selectedVote === player.id;
          const voteCount =
            match.votes?.filter((v) => v.targetId === player.id).length ?? 0;

          return (
            <div
              key={player.id}
              className="rounded-2xl p-4 text-center transition-all duration-200"
              style={{
                backgroundColor: "#16213e",
                border: isDead
                  ? "2px solid #6b6b80"
                  : isSelected
                    ? "2px solid #e94560"
                    : "2px solid #2a2a4a",
                opacity: isDead ? 0.5 : 1,
                boxShadow: isSelected ? "0 0 20px rgba(233,69,96,0.4)" : "none",
                cursor:
                  !isDead && isCurrentPlayerAlive ? "pointer" : "not-allowed",
              }}
              onClick={() =>
                !isDead && isCurrentPlayerAlive && handleTargetClick(player.id)
              }
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg mx-auto mb-2.5"
                style={{
                  background: `linear-gradient(135deg, ${PLAYER_COLORS[index % PLAYER_COLORS.length]}, #764ba2)`,
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
              {match.phase === "voting" && showVotingTransparency && voteCount > 0 && (
                <div
                  className="mt-1 text-[11px] font-bold rounded-full px-2 py-0.5 inline-block"
                  style={{ backgroundColor: "#e94560", color: "#fff" }}
                >
                  {voteCount} vote{voteCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {match.phase === "action" && currentTemplate && isCurrentPlayerAlive && (
        <AbilitySelector
          availableAbilities={availableAbilities}
          selectedAbility={selectedAbility}
          onAbilityClick={handleAbilityClick}
        />
      )}

      {selectedAbility && selectedTarget && isCurrentPlayerAlive && (
        <div
          className="rounded-2xl p-5 mb-5 text-center"
          style={{ backgroundColor: "#16213e", border: "2px solid #2a2a4a" }}
        >
          <div className="text-base mb-4">Confirm your action</div>
          <button
            className="py-3 px-8 border-none rounded-lg text-white text-sm font-semibold cursor-pointer"
            style={{ backgroundColor: "#4ade80" }}
            onClick={handleConfirm}
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
            onClick={handleCancelAbility}
          >
            Cancel
          </button>
        </div>
      )}

      {match.phase === "voting" && showVotingTransparency && (
        <div
          data-testid="vote-status-panel"
          className="rounded-2xl p-4 mb-5"
          style={{ backgroundColor: "#16213e", border: "2px solid #2a2a4a" }}
        >
          <div
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "#6b6b80" }}
          >
            Vote Status
          </div>
          {match.players
            .filter((player) => player.status === "alive")
            .map((player) => {
              const vote = match.votes?.find((v) => v.voterId === player.id);
              const targetLabel =
                vote === undefined
                  ? "Waiting..."
                  : vote.targetId === null
                    ? "Skip"
                    : (match.players.find((p) => p.id === vote.targetId)?.name ??
                      "?");
              return (
                <div
                  key={player.id}
                  className="flex justify-between text-sm py-1"
                  style={{
                    color: "#a0a0b8",
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
                      {targetLabel}
                    </span>
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {match.phase === "voting" && isCurrentPlayerAlive && (
        <div
          className="rounded-2xl p-5 mb-5 text-center"
          style={{ backgroundColor: "#16213e", border: "2px solid #2a2a4a" }}
        >
          <div className="text-base mb-4">Vote to eliminate a player</div>
          <button
            className="py-3 px-8 border-none rounded-lg text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#4ade80" }}
            disabled={!selectedVote}
            onClick={handleConfirm}
          >
            Cast Vote
          </button>
          <button
            className="py-3 px-8 rounded-lg text-sm font-semibold cursor-pointer ml-3"
            style={{
              backgroundColor: "transparent",
              border: "2px solid #6b6b80",
              color: "#a0a0b8",
            }}
            onClick={handleSkipVote}
          >
            Skip Vote
          </button>
        </div>
      )}

      <div
        className="rounded-2xl p-4 max-h-[200px] overflow-y-auto"
        style={{ backgroundColor: "#16213e", border: "2px solid #2a2a4a" }}
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
            style={{ color: "#a0a0b8", borderBottom: "1px solid #2a2a4a" }}
          >
            Game started. Waiting for actions...
          </div>
        ) : (
          actions.map((action, i) => (
            <div
              key={i}
              className="text-sm py-1.5"
              style={{ color: "#a0a0b8", borderBottom: "1px solid #2a2a4a" }}
            >
              <span style={{ color: "#e94560", fontWeight: 600 }}>
                {action?.actorName}
              </span>{" "}
              {action?.verb}{" "}
              <span style={{ color: "#4ade80", fontWeight: 600 }}>
                {action?.targetNames}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
