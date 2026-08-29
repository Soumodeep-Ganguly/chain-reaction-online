import { useState, useEffect, useRef, useCallback } from "react";
import { GameBoard } from "@/components/game-board";
import { PlayerIndicator } from "@/components/player-indicator";
import { GameControls } from "@/components/game-controls";
import { toast } from "sonner";
import socket from "@/lib/socket";
import { GameState, Player, TurnEvent } from "@/types/game";
import { AskReplay } from "./ask-replay";
import { useAuth } from "@/lib/auth-context";
import { countPlayerOrbs, countPlayerCells } from "@/lib/game-helpers";

interface GameViewProps {
  onNavigate: (
    view: "home" | "create-room" | "join-room" | "game"
  ) => void;
  playerName: string;
  roomId: string;
}

export function GameView({ onNavigate, roomId, playerName }: GameViewProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCurrentPlayer, setIsCurrentPlayer] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState(false);
  const [winnerSelected, setWinnerSelected] = useState(false);
  const [exitGame, setExitGame] = useState(false);
  const [animatingCells, setAnimatingCells] = useState<
    Map<string, string>
  >(new Map());
  const [eventLog, setEventLog] = useState<string[]>([]);

  const { uuid } = useAuth();
  const joinedRef = useRef(false);
  const firstConnectRef = useRef(true);

  // Process turn events for animation
  const processTurnEvents = useCallback(
    (events: TurnEvent[]) => {
      if (!events || events.length === 0) return;

      const newAnimating = new Map<string, string>();
      const logs: string[] = [];

      events.forEach((event) => {
        if (event.type === "explosion" && event.row !== undefined && event.col !== undefined) {
          const key = `${event.row}-${event.col}`;
          newAnimating.set(key, "explosion");
          logs.push(`💥 ${event.playerName || "Player"}'s cell exploded at (${event.row}, ${event.col})`);
        } else if (event.type === "capture" && event.row !== undefined && event.col !== undefined) {
          const key = `${event.row}-${event.col}`;
          newAnimating.set(key, "capture");
          logs.push(`⚡ ${event.playerName || "Player"} captured cell at (${event.row}, ${event.col})`);
        } else if (event.type === "elimination") {
          logs.push(`❌ ${event.playerName || "Player"} has been eliminated!`);
        } else if (event.type === "win") {
          logs.push(`🏆 ${event.playerName || "Player"} wins the game!`);
        }
      });

      setAnimatingCells(newAnimating);
      setEventLog((prev) => [...prev.slice(-10), ...logs]);

      // Clear animations after delay
      setTimeout(() => {
        setAnimatingCells(new Map());
      }, 1000);
    },
    []
  );

  useEffect(() => {
    socket.emit("join-room", { roomId, playerName, uuid });
    joinedRef.current = true;

    const handleConnect = () => {
      if (firstConnectRef.current) {
        firstConnectRef.current = false;
        return;
      }
      if (joinedRef.current) {
        socket.emit("join-room", { roomId, playerName, uuid });
      }
    };
    socket.on("connect", handleConnect);

    socket.on("game-started", (state: GameState) => {
      setGameState(state);
      setEventLog([]);
      toast.success("Game started!");
    });

    socket.on("game-updated", (state: GameState) => {
      setGameState(state);

      // Process turn events for animation
      if (state.turnEvents && state.turnEvents.length > 0) {
        processTurnEvents(state.turnEvents);
      }

      if (!state.winner) setWinnerSelected(false);

      if (
        !state ||
        !state?.players ||
        state?.players?.length === 0
      ) {
        setTimeout(() => {
          onNavigate("home");
        }, 1000);
      }
    });

    socket.on("player-joined", (state: GameState) => {
      setGameState((prev) =>
        prev ? { ...prev, players: state.players } : null
      );
      if (!state.started) {
        toast.info("Waiting for more players to join...");
      }
    });

    socket.on("player-left", (playerId: string) => {
      if (playerId === socket.id) {
        onNavigate("home");
        return;
      }
      const player = gameState?.players.find((p) => p.id === playerId);
      if (player) {
        toast.info(`${player.name} left the game`);
      }
      const remaining =
        gameState?.players.filter((p) => p.id !== playerId) || [];
      if (remaining.length <= 1) {
        toast.info("Not enough players. Returning to home...");
        setTimeout(() => onNavigate("home"), 1500);
      }
    });

    socket.on("invalid-move", ({ message }: { message: string }) => {
      toast.error(message);
    });

    socket.on("game-over", ({ winner }: { winner: Player }) => {
      toast.success(
        `${winner.id === socket.id ? "You" : winner.name} won the game!`
      );
      setWinnerSelected(true);
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("game-started");
      socket.off("game-updated");
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("invalid-move");
      socket.off("game-over");
    };
  }, [roomId, playerName, processTurnEvents]);

  useEffect(() => {
    if (gameState) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      setIsCurrentPlayer(currentPlayer?.id === socket.id);
    }
  }, [gameState]);

  const handleCellClick = (row: number, col: number) => {
    if (!isCurrentPlayer || !gameState) return;
    socket.emit("place-orb", { roomId, row, col });
  };

  const muteControl = () => setIsMuted((prev) => !prev);

  const replay = () => {
    socket.emit("play-again", { roomId });
    setTimeout(() => {
      setWinnerSelected(false);
      setEventLog([]);
    }, 1000);
  };

  const destroyRoom = () => {
    socket.emit("destroy-room", { roomId });
    setTimeout(() => {
      onNavigate("home");
    }, 3000);
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-600 via-teal-500 to-cyan-500">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-600 via-teal-500 to-cyan-500">
      {/* Winner overlay */}
      {gameState?.players.length > 1 &&
        gameState?.players[0].id === socket.id &&
        winnerSelected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <AskReplay
              confirmAction={replay}
              declineAction={destroyRoom}
              title="Do you want to re-play?"
              confirmText="Play Again"
              declineText="Destroy Room"
            />
          </div>
        )}

      {/* Exit game overlay */}
      {exitGame && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <AskReplay
            confirmAction={() => {
              socket.emit("leave-room", { roomId });
              onNavigate("home");
            }}
            declineAction={() => setExitGame(false)}
            title="Exit this game?"
            confirmText="Yes"
            declineText="No"
          />
        </div>
      )}

      {/* Top section - other players */}
      <div className="flex justify-center p-4 gap-3 flex-wrap">
        {gameState.players
          .filter((p) => p.id !== socket.id)
          .map((player) => (
            <PlayerIndicator
              key={player.id}
              player={player}
              orbCount={countPlayerOrbs(gameState.board, player.id)}
              cellCount={countPlayerCells(gameState.board, player.id)}
              isActive={
                player.id ===
                gameState.players[gameState.currentPlayerIndex]?.id
              }
            />
          ))}
      </div>

      {/* Middle section - board */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Turn indicator */}
        {!winnerSelected && (
          <div className="mb-4 text-white text-xl font-bold">
            {gameState.players[gameState.currentPlayerIndex]?.id ===
            socket.id
              ? "Your"
              : `${
                  gameState.players[gameState.currentPlayerIndex]?.name
                }'s`}{" "}
            turn
          </div>
        )}

        {/* Board */}
        <div className="mb-4">
          <GameBoard
            board={gameState.board}
            rows={gameState.rows}
            cols={gameState.cols}
            isCurrentPlayerTurn={isCurrentPlayer}
            currentPlayerId={socket.id || ""}
            players={gameState.players}
            onCellClick={handleCellClick}
            animatingCells={animatingCells}
          />
        </div>

        {/* Event log */}
        {eventLog.length > 0 && (
          <div className="w-full max-w-md mb-4">
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 max-h-24 overflow-y-auto">
              {eventLog.slice(-5).map((log, i) => (
                <div
                  key={i}
                  className="text-white text-xs py-0.5 opacity-80"
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game controls */}
        <div className="w-full max-w-md mx-auto">
          <GameControls
            isPlayerTurn={isCurrentPlayer}
            onExitGame={() => setExitGame(true)}
            muteControl={muteControl}
            isMuted={isMuted}
          />
        </div>
      </div>

      {/* Bottom section - current player info */}
      <div className="p-4 bg-black/20 backdrop-blur-sm">
        <div className="flex justify-center items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full"
              style={{
                backgroundColor:
                  gameState.players.find((p) => p.id === socket.id)
                    ?.color || "#6b7280",
              }}
            />
            <span className="text-white font-bold">
              {gameState.players.find((p) => p.id === socket.id)?.name ||
                "You"}
            </span>
          </div>
          <div className="text-white text-sm">
            Orbs:{" "}
            <span className="font-bold">
              {countPlayerOrbs(gameState.board, socket.id || "")}
            </span>
          </div>
          <div className="text-white text-sm">
            Cells:{" "}
            <span className="font-bold">
              {countPlayerCells(gameState.board, socket.id || "")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
