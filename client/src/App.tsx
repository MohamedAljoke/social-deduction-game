import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { GameProvider, useGame } from "./features/session/context/GameContext";
import { HomeScreen } from "./features/home/HomeScreen";
import { LobbyScreen } from "./features/lobby/LobbyScreen";
import { TemplateBuilderScreen } from "./features/lobby/TemplateBuilder/TemplateBuilderScreen";
import { GameScreen } from "./features/game/GameScreen";
import { EndScreen } from "./features/end/EndScreen";
import { socketService } from "./services/socket";

function AppContent() {
  const { state } = useGame();

  useEffect(() => {
    if (state.matchId && state.playerId) {
      socketService.connect(state.matchId, state.playerId);
    }
    return () => socketService.disconnect();
  }, [state.matchId, state.playerId]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/lobby" element={<LobbyScreen />} />
        <Route path="/templates" element={<TemplateBuilderScreen />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/end" element={<EndScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
