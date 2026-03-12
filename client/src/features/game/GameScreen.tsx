import { useGame } from "../../context/GameContext";
import { t } from "@/infrastructure/i18n/translations";
import { AbilitySelector } from "./components/AbilitySelector";
import {
  ActionConfirmation,
  GameMasterPanel,
  GameLogPanel,
  VoteStatusPanel,
  VotingControls,
} from "./components/GameActionPanels";
import {
  EliminatedBanner,
  InvestigationBanner,
  NextPhaseButton,
  PhaseBanner,
  RoleCard,
} from "./components/GameHeaderSections";
import { PlayerGrid } from "./components/PlayerGrid";
import { getInvestigateBannerData, MUTED_TEXT } from "./components/gameScreenShared";
import {
  useGameActions,
  useGameLog,
  useGamePlayer,
  useAvailableAbilities,
} from "./hooks";

export function GameScreen() {
  const { service, state } = useGame();
  const {
    match,
    playerId,
    currentPlayer,
    currentTemplate,
    phaseConfig,
    isHost,
  } = useGamePlayer();
  const {
    selectedAbility,
    selectedTarget,
    selectedVote,
    isVoteSubmitting,
    pendingVoteAction,
    isAdvancingPhase,
    handleAbilityClick,
    handleTargetClick,
    handleConfirm,
    handleSkipVote,
    handleAdvancePhase,
    handleCancelAbility,
  } = useGameActions();
  const { actions } = useGameLog();
  const { availableAbilities } = useAvailableAbilities();

  const isCurrentPlayerAlive = currentPlayer?.status === "alive";
  const showVotingTransparency = match?.config?.showVotingTransparency ?? true;
  const isVotingPhase = match?.phase === "voting";
  const isActionPhase = match?.phase === "action";
  const investigateResult = getInvestigateBannerData(match, state.investigateResult);
  const shouldShowGameMaster =
    (match?.config?.aiGameMasterEnabled ?? false) ||
    state.gameMasterMessages.length > 0;

  const handleLeave = () => {
    if (confirm(t('game.confirmLeave'))) {
      service.leave();
    }
  };

  if (!match) {
    return <div>Loading...</div>;
  }

  return (
    <div
      className="min-w-[400px] mx-auto px-5 py-5"
      style={{ backgroundColor: "#0f0f1a", minHeight: "100vh" }}
    >
      <div className="flex justify-between items-center mb-5">
        <button
          className="bg-transparent border-none cursor-pointer text-sm flex items-center gap-1.5"
          style={{ color: MUTED_TEXT }}
          onClick={handleLeave}
        >
          {t('game.leaveGame')}
        </button>
      </div>

      {currentTemplate && isActionPhase && <RoleCard template={currentTemplate} />}

      <PhaseBanner title={phaseConfig.title} description={phaseConfig.description} />

      {investigateResult && <InvestigationBanner result={investigateResult} />}

      {!isCurrentPlayerAlive && <EliminatedBanner />}

      {isHost && match.status === "started" && (
        <NextPhaseButton
          isAdvancing={isAdvancingPhase}
          onAdvance={handleAdvancePhase}
        />
      )}

      <PlayerGrid
        match={match}
        playerId={playerId}
        selectedTarget={selectedTarget}
        selectedVote={selectedVote}
        canSelectPlayers={Boolean(isCurrentPlayerAlive)}
        showVotingTransparency={showVotingTransparency}
        onSelectPlayer={handleTargetClick}
      />

      {isActionPhase && currentTemplate && isCurrentPlayerAlive && (
        <AbilitySelector
          availableAbilities={availableAbilities}
          selectedAbility={selectedAbility}
          onAbilityClick={handleAbilityClick}
        />
      )}

      {selectedAbility && selectedTarget && isCurrentPlayerAlive && (
        <ActionConfirmation
          onConfirm={handleConfirm}
          onCancel={handleCancelAbility}
        />
      )}

      {isVotingPhase && showVotingTransparency && (
        <VoteStatusPanel match={match} playerId={playerId} />
      )}

      {isVotingPhase && isCurrentPlayerAlive && (
        <VotingControls
          isVoteSubmitting={isVoteSubmitting}
          pendingVoteAction={pendingVoteAction}
          isCastVoteDisabled={!selectedVote || isVoteSubmitting}
          onConfirm={handleConfirm}
          onSkipVote={handleSkipVote}
        />
      )}

      {shouldShowGameMaster && (
        <div className="mb-5">
          <GameMasterPanel
            messages={state.gameMasterMessages}
            title={t('game.gameMaster')}
            emptyMessage={t('game.gameMasterWaiting')}
          />
        </div>
      )}

      <GameLogPanel actions={actions} />
    </div>
  );
}
