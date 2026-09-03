import { useState, useEffect } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { HomeView } from "./components/home-view";
import { CreateRoomView } from "./components/create-room-view";
import { JoinRoomView } from "./components/join-room-view";
import { GameView } from "./components/game-view";
import { AuthView } from "./components/auth-view";
import { ProfileView } from "./components/profile-view";
import {
  OfflineSetupView,
  OfflineGameConfig,
} from "./components/offline-setup-view";
import { OfflineGameView } from "./components/offline-game-view";
import { TutorialView } from "./components/tutorial-view";
import { Toaster } from "./components/ui/sonner";
import { initAudio } from "@/lib/sounds";

type AppView =
  | "home"
  | "create-room"
  | "join-room"
  | "game"
  | "auth"
  | "profile"
  | "offline-setup"
  | "offline-game"
  | "tutorial";

function ChainReactionContent() {
  const [currentView, setCurrentView] = useState<AppView>("home");

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      initAudio();
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
    document.addEventListener("click", unlock);
    document.addEventListener("touchstart", unlock);
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("4");
  const [boardRows, setBoardRows] = useState("8");
  const [boardCols, setBoardCols] = useState("8");
  const [players, setPlayers] = useState<string[]>([]);
  const [offlineConfig, setOfflineConfig] = useState<OfflineGameConfig | null>(
    null
  );

  const handleStartOfflineGame = (config: OfflineGameConfig) => {
    setOfflineConfig(config);
    setCurrentView("offline-game");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-600 via-teal-500 to-cyan-500 w-[100vw]">
      {currentView === "home" && (
        <HomeView onNavigate={setCurrentView} />
      )}

      {currentView === "auth" && (
        <AuthView onNavigate={setCurrentView} />
      )}

      {currentView === "profile" && (
        <ProfileView onNavigate={setCurrentView} />
      )}

      {currentView === "create-room" && (
        <CreateRoomView
          onNavigate={setCurrentView}
          playerName={playerName}
          setPlayerName={setPlayerName}
          maxPlayers={maxPlayers}
          setMaxPlayers={setMaxPlayers}
          boardRows={boardRows}
          setBoardRows={setBoardRows}
          boardCols={boardCols}
          setBoardCols={setBoardCols}
          roomId={roomId}
          setRoomId={setRoomId}
          players={players}
          setPlayers={setPlayers}
        />
      )}

      {currentView === "join-room" && (
        <JoinRoomView
          onNavigate={setCurrentView}
          playerName={playerName}
          setPlayerName={setPlayerName}
          roomId={roomId}
          setRoomId={setRoomId}
        />
      )}

      {currentView === "game" && (
        <GameView
          onNavigate={setCurrentView}
          playerName={playerName}
          roomId={roomId}
        />
      )}

      {currentView === "offline-setup" && (
        <OfflineSetupView
          onNavigate={setCurrentView}
          onStartGame={handleStartOfflineGame}
        />
      )}

      {currentView === "offline-game" && offlineConfig && (
        <OfflineGameView
          onNavigate={() => setCurrentView("home")}
          config={offlineConfig}
        />
      )}

      {currentView === "tutorial" && (
        <TutorialView
          onNavigate={setCurrentView}
          onStartGame={() => setCurrentView("offline-setup")}
        />
      )}

      <Toaster position="top-center" expand={false} richColors closeButton />
    </div>
  );
}

export default function ChainReactionGame() {
  return (
    <AuthProvider>
      <ChainReactionContent />
    </AuthProvider>
  );
}
