import { useState } from "react";
import { Card, Button, Input } from "../../shared/components";
import { ScreenContainer } from "../../shared/ui/ScreenContainer";
import { Logo } from "../../shared/ui/Logo";
import { useCreateMatch, useJoinMatch } from "./hooks";

export function HomeScreen() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [playerName, setPlayerName] = useState("");
  const [matchCode, setMatchCode] = useState("");

  const {
    create,
    loading: createLoading,
    error: createError,
  } = useCreateMatch();
  const { join, loading: joinLoading, error: joinError } = useJoinMatch();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    create(playerName.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !matchCode.trim()) return;
    join(matchCode.trim(), playerName.trim());
  };

  const loading = createLoading || joinLoading;
  const error = mode === "create" ? createError : joinError;

  return (
    <ScreenContainer>
      <div className="fade-in">
        <Logo
          title="Social Deduction"
          subtitle="Create or join a game with friends"
        />

        <Card>
          {mode === "create" ? (
            <form onSubmit={handleCreate}>
              <div className="text-lg font-semibold mb-6 flex items-center gap-2.5">
                <span className="w-1 h-5 rounded-sm"></span>
                Create New Game
              </div>
              <Input
                id="playerName"
                label="Your Name"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                required
              />
              <Button type="submit" loading={loading}>
                Create Game
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin}>
              <div className="text-lg font-semibold mb-6 flex items-center gap-2.5">
                <span
                  className="w-1 h-5 rounded-sm"
                  style={{ backgroundColor: "#e94560" }}
                ></span>
                Enter Game Details
              </div>
              <Input
                id="joinName"
                label="Your Name"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                required
              />
              <Input
                id="gameCode"
                label="Match ID"
                placeholder="Enter match ID"
                value={matchCode}
                onChange={(e) => setMatchCode(e.target.value)}
                maxLength={10}
                required
              />
              <Button type="submit" loading={loading}>
                Join Game
              </Button>
            </form>
          )}

          {error && (
            <div
              className="px-3 py-3 rounded-lg mb-4 text-sm"
              style={{
                backgroundColor: "rgba(233, 69, 96, 0.1)",
                border: "1px solid rgba(233, 69, 96, 0.3)",
                color: "#e94560",
              }}
            >
              {error}
            </div>
          )}

          <div
            className="flex items-center my-6 text-xs"
            style={{ color: "#6b6b80" }}
          >
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "#2a2a4a" }}
            ></div>
            <span className="px-4">or</span>
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "#2a2a4a" }}
            ></div>
          </div>

          <Button
            variant="secondary"
            onClick={() => setMode(mode === "create" ? "join" : "create")}
          >
            {mode === "create" ? "Join Existing Game" : "Back to Create"}
          </Button>
        </Card>
      </div>
    </ScreenContainer>
  );
}
