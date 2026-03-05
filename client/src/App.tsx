import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import { GameProvider, useGameContext } from "./context/GameContext";
import { HomeScreen } from "./features/home/HomeScreen";
import { LobbyScreen } from "./features/lobby/LobbyScreen";
import { TemplateBuilderScreen } from "./features/lobby/TemplateBuilder/TemplateBuilderScreen";
import { GameScreen } from "./features/game/GameScreen";
import { EndScreen } from "./features/end/EndScreen";
import type { MatchStatus } from "./types/match";

const STATUS_ROUTE: Record<MatchStatus, string> = {
  lobby: "/lobby",
  started: "/game",
  finished: "/end",
};

// Requires an active session AND a match in one of the allowed statuses.
// If the session exists but match has a different status, redirects to the correct route.
function MatchRoute({ statuses }: { statuses: MatchStatus[] }) {
  const { state } = useGameContext();

  if (!state.matchId) return <Navigate to="/" replace />;
  if (!state.match) return null; // hydrating

  if (!statuses.includes(state.match.status)) {
    return <Navigate to={STATUS_ROUTE[state.match.status]} replace />;
  }

  return <Outlet />;
}

function HomeRoute() {
  const { state } = useGameContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state.matchId || !state.match) return;
    navigate(STATUS_ROUTE[state.match.status], { replace: true });
  }, [state.matchId, state.match, navigate]);

  // Session exists but match not yet fetched — show nothing while hydrating
  if (state.matchId && !state.match) return null;

  return <Outlet />;
}

export function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <Routes>
          <Route element={<HomeRoute />}>
            <Route path="/" element={<HomeScreen />} />
          </Route>
          <Route element={<MatchRoute statuses={["lobby"]} />}>
            <Route path="/lobby" element={<LobbyScreen />} />
            <Route path="/templates" element={<TemplateBuilderScreen />} />
          </Route>
          <Route element={<MatchRoute statuses={["started"]} />}>
            <Route path="/game" element={<GameScreen />} />
          </Route>
          <Route element={<MatchRoute statuses={["finished"]} />}>
            <Route path="/end" element={<EndScreen />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}
