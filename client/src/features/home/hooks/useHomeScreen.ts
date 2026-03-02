import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/features/session/context/GameContext";

type Mode = "create" | "join";

export function useHomeScreen() {
  const navigate = useNavigate();
  const { createMatch, joinMatch } = useGame();

  const [mode, setMode] = useState<Mode>("create");
  const [playerName, setPlayerName] = useState("");
  const [matchCode, setMatchCode] = useState("");

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
          await createMatch(playerName.trim());
        } else {
          await joinMatch(matchCode.trim(), playerName.trim());
        }

        navigate("/lobby");
      } catch (err) {
        setError(
          mode === "create"
            ? "Failed to create game. Make sure the server is running."
            : "Failed to join game. Check the ID and try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [mode, playerName, matchCode, createMatch, joinMatch, navigate],
  );

  return {
    mode,
    playerName,
    matchCode,
    loading,
    error,
    setPlayerName,
    setMatchCode,
    toggleMode,
    submit,
  };
}
