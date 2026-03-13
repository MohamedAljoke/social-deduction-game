import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, Avatar, Badge } from "../../shared/components";
import { ScreenContainer } from "../../shared/ui/ScreenContainer";
import { Logo } from "../../shared/ui/Logo";
import { useLobby } from "./hooks";
import { useGame } from "../../context/GameContext";
import { t } from "@/infrastructure/i18n/translations";

export function LobbyScreen() {
  const navigate = useNavigate();
  const { match, isHost, loading, handleStartGame } = useLobby();
  const { service } = useGame();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!match) return;
    void navigator.clipboard.writeText(match.id.toUpperCase()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!match) {
    return <div>Loading...</div>;
  }

  return (
    <ScreenContainer>
      <div className="fade-in w-full">
        <Logo title={t('lobby.title')} subtitle={t('lobby.waitingForPlayers')} />

        <Card>
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium mb-5 bg-success/10 border border-success/30 text-success">
            <span className="w-2 h-2 rounded-full animate-pulse bg-success" />
            {isHost ? t('lobby.readyToStart') : t('lobby.waitingForHost')}
          </div>

          {/* Game code copy button */}
          <button
            onClick={handleCopy}
            className={`w-full border-2 border-dashed rounded-2xl p-6 text-center mb-6 cursor-pointer transition-colors duration-150 bg-surface-raised
              ${copied ? "border-success" : "border-rim"}`}
          >
            <div className="text-xs uppercase tracking-widest mb-2 text-ink-muted">
              {t('lobby.gameCode')}
            </div>
            <div
              data-testid="match-id"
              className={`text-[36px] font-bold tracking-widest font-mono ${copied ? "text-success" : "text-brand"}`}
            >
              {match.id.toUpperCase()}
            </div>
            <div
              className="text-xs mt-2 transition-opacity duration-150 text-ink-muted"
              style={{ opacity: copied ? 1 : 0.5 }}
            >
              {copied ? t('lobby.copied') : t('lobby.clickToCopy')}
            </div>
          </button>

          {/* Player list */}
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider mb-3 text-ink-muted">
              {t('lobby.playersLabel')} (<span>{match.players.length}</span>)
            </div>
            {match.players.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-3 rounded-xl mb-2 bg-surface-raised slide-up stagger-${Math.min(index + 1, 8)}`}
              >
                <Avatar name={player.name} index={index} />
                <span className="font-medium text-ink">{player.name}</span>
                {index === 0 && <Badge variant="host">{t('lobby.host')}</Badge>}
              </div>
            ))}
          </div>

          {isHost && (
            <>
              <Button onClick={() => navigate("/templates")} variant="secondary">
                {t('lobby.configTemplates')}
              </Button>
              <Button onClick={handleStartGame} loading={loading} className="mt-3">
                {t('lobby.startBtn')}
              </Button>
            </>
          )}
          <Button
            onClick={() => {
              if (confirm(t('lobby.confirmLeave'))) service.leave();
            }}
            variant="secondary"
            className="mt-3"
          >
            {t('lobby.leaveBtn')}
          </Button>
        </Card>
      </div>
    </ScreenContainer>
  );
}
