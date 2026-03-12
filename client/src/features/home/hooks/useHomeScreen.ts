import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/context/GameContext";
import { t } from "@/infrastructure/i18n/translations";

type Mode = "create" | "join";

export function useHomeScreen() {
  const navigate = useNavigate();
  const { service } = useGame();

  const [mode, setMode] = useState<Mode>("create");
  const [playerName, setPlayerName] = useState("");
  const [matchCode, setMatchCode] = useState("");
  const [openVoting, setOpenVoting] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleMode = useCallback(() => {
    setError("");
    setMode((prev) => (prev === "create" ? "join" : "create"));
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!playerName.trim()) return;
      if (mode === "join" && !matchCode.trim()) return;

      setLoading(true);
      setError("");

      try {
        if (mode === "create") {
          await service.createMatch(playerName.trim(), {
            showVotingTransparency: openVoting,
          });
        } else {
          await service.joinMatch(matchCode.trim(), playerName.trim());
        }
        navigate("/lobby");
      } catch (err) {
        setError(
          mode === "create"
            ? t('errors.failedCreateGame')
            : t('errors.failedJoinGame'),
        );
      } finally {
        setLoading(false);
      }
    },
    [mode, playerName, matchCode, openVoting, service, navigate],
  );

  return {
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
  };
}
