import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../../session/context/GameContext";

export function useJoinMatch() {
  const navigate = useNavigate();
  const { joinMatch } = useGame();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const join = useCallback(
    async (matchId: string, playerName: string) => {
      setLoading(true);
      setError("");

      try {
        await joinMatch(matchId, playerName);
        navigate("/lobby");
      } catch (err) {
        setError("Failed to join game. Check the ID and try again.");
      } finally {
        setLoading(false);
      }
    },
    [joinMatch, navigate],
  );

  return { join, loading, error };
}
