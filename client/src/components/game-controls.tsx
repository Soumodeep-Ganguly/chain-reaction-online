import { VolumeX, Volume2, Home } from "lucide-react";

interface GameControlsProps {
  isPlayerTurn: boolean;
  onExitGame: () => void;
  muteControl: () => void;
  isMuted: boolean;
}

export function GameControls({
  isPlayerTurn,
  onExitGame,
  muteControl,
  isMuted,
}: GameControlsProps) {
  return (
    <div className="flex justify-between items-center gap-4 p-4 bg-black/20 backdrop-blur-sm rounded-lg">
      <div className="flex gap-2">
        <button
          className="h-8 px-3 rounded-md inline-flex items-center justify-center gap-2 text-sm font-medium border border-white/40 bg-transparent text-white hover:bg-white/20 transition-all"
          onClick={onExitGame}
        >
          <Home className="h-4 w-4" />
          Exit
        </button>

        <button
          className="h-8 px-3 rounded-md inline-flex items-center justify-center gap-2 text-sm font-medium border border-white/40 bg-transparent text-white hover:bg-white/20 transition-all"
          onClick={() => muteControl()}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="text-white text-sm font-bold">
        {isPlayerTurn ? (
          <span className="text-yellow-300">Your Turn - Place an Orb!</span>
        ) : (
          <span>Waiting for opponent...</span>
        )}
      </div>
    </div>
  );
}
