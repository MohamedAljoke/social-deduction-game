import { Button, Card, Input } from "@/shared/components";
import { ErrorMessage } from "@/shared/components/error";
import { Logo } from "@/shared/ui/Logo";
import { ScreenContainer } from "@/shared/ui/ScreenContainer";
import { useHomeScreen } from "./hooks/useHomeScreen";
import { Divider } from "@/shared/components/divider";
import { t } from "@/infrastructure/i18n/translations";

export function HomeScreen() {
  const {
    mode,
    playerName,
    matchCode,
    openVoting,
    loading,
    error,
    setPlayerName,
    setMatchCode,
    setOpenVoting,
    toggleMode,
    submit,
  } = useHomeScreen();

  const isCreate = mode === "create";

  return (
    <ScreenContainer>
      <div className="fade-in">
        <Logo
          title={t('home.title')}
          subtitle={t('home.subtitle')}
        />

        <Card>
          <form onSubmit={submit}>
            <div className="text-lg font-semibold mb-6 flex items-center gap-2.5">
              <span
                className="w-1 h-5 rounded-sm"
                style={!isCreate ? { backgroundColor: "#e94560" } : undefined}
              />
              {isCreate ? t('home.createGameBtn') : t('home.enterGameDetails')}
            </div>

            <Input
              id="playerName"
              label={t('home.yourName')}
              placeholder={t('home.yourNamePlaceholder')}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              required
            />

            {!isCreate && (
              <Input
                id="gameCode"
                label={t('home.matchId')}
                placeholder={t('home.matchIdPlaceholder')}
                value={matchCode}
                onChange={(e) => setMatchCode(e.target.value)}
                maxLength={10}
                required
              />
            )}

            {isCreate && (
              <div
                className="mb-5 p-4 rounded-xl flex items-center justify-between"
                style={{
                  backgroundColor: "#1a1a2e",
                  border: "2px solid #2a2a4a",
                }}
              >
                <div>
                  <div
                    className="text-xs uppercase tracking-wider"
                    style={{ color: "#a0a0b8" }}
                  >
                    {t('home.openVoting')}
                  </div>
                  <div className="text-sm" style={{ color: "#6b6b80" }}>
                    {t('home.openVotingDesc')}
                  </div>
                </div>
                <input
                  id="openVoting"
                  type="checkbox"
                  checked={openVoting}
                  onChange={(e) => setOpenVoting(e.target.checked)}
                  aria-label="Open Voting"
                  className="w-5 h-5 cursor-pointer accent-[#e94560]"
                />
              </div>
            )}

            <Button type="submit" loading={loading}>
              {isCreate ? t('home.createBtn') : t('home.joinBtn')}
            </Button>
          </form>

          {error && <ErrorMessage message={error} />}

          <Divider />

          <Button variant="secondary" onClick={toggleMode}>
            {isCreate ? t('home.joinGameTitle') : t('home.backBtn')}
          </Button>
        </Card>
      </div>
    </ScreenContainer>
  );
}
