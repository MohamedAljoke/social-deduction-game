import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/features/session/context/GameContext";

export function useCreateMatch() {
  const navigate = useNavigate();
  const { createMatch } = useGame();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const create = useCallback(
    async (playerName: string) => {
      setLoading(true);
      setError("");

      try {
        await createMatch(playerName);
        navigate("/lobby");
      } catch (err) {
        setError(
          "Failed to create game. Make sure the server is running on port 3000.",
        );
      } finally {
        setLoading(false);
      }
    },
    [createMatch, navigate],
  );

  return { create, loading, error };
}
