import { useNavigate } from "react-router-dom";
import { Card, Button, Avatar, Badge } from "../../shared/components";
import { ScreenContainer } from "../../shared/ui/ScreenContainer";
import { Logo } from "../../shared/ui/Logo";
import { useLobby } from "./hooks";

export function LobbyScreen() {
  const navigate = useNavigate();
  const { match, isHost, loading, handleStartGame } = useLobby();

  if (!match) {
    return <div>Loading...</div>;
  }

  return (
    <ScreenContainer>
      <div className="fade-in min-w-100">
        <Logo title="Game Lobby" subtitle="Waiting for players to join" />

        <Card>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium mb-5"
            style={{
              backgroundColor: "rgba(74, 222, 128, 0.1)",
              border: "1px solid rgba(74, 222, 128, 0.3)",
              color: "#4ade80",
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "#4ade80" }}
            ></span>
            {isHost ? "Ready to start" : "Waiting for host to start"}
          </div>

          <div
            className="border-2 border-dashed rounded-2xl p-6 text-center mb-6"
            style={{ borderColor: "#2a2a4a", backgroundColor: "#1a1a2e" }}
          >
            <div
              className="text-xs uppercase tracking-widest mb-2"
              style={{ color: "#6b6b80" }}
            >
              Game Code
            </div>
            <div
              className="text-[36px] font-bold tracking-widest font-mono"
              style={{ color: "#e94560" }}
            >
              {match.id.toUpperCase()}
            </div>
          </div>

          <div className="mb-6">
            <div
              className="text-xs uppercase tracking-wider mb-3"
              style={{ color: "#6b6b80" }}
            >
              Players (<span>{match.players.length}</span>)
            </div>
            {match.players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 rounded-xl mb-2"
                style={{ backgroundColor: "#1a1a2e" }}
              >
                <Avatar name={player.name} index={index} />
                <span className="font-medium">{player.name}</span>
                {index === 0 && <Badge variant="host">Host</Badge>}
              </div>
            ))}
          </div>

          {isHost && (
            <>
              <Button
                onClick={() => navigate("/templates")}
                variant="secondary"
              >
                Configure Templates
              </Button>
              <Button
                onClick={handleStartGame}
                loading={loading}
                className="mt-3"
              >
                Start Game
              </Button>
            </>
          )}
        </Card>
      </div>
    </ScreenContainer>
  );
}
