import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "./application/game/GameContext";
import { HomeScreen } from "./features/home/HomeScreen";
import { LobbyScreen } from "./features/lobby/LobbyScreen";
import { TemplateBuilderScreen } from "./features/lobby/TemplateBuilder/TemplateBuilderScreen";
import { GameScreen } from "./features/game/GameScreen";
import { EndScreen } from "./features/end/EndScreen";

export function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route path="/templates" element={<TemplateBuilderScreen />} />
          <Route path="/game" element={<GameScreen />} />
          <Route path="/end" element={<EndScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}
