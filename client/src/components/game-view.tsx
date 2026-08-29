import { useState, useEffect, useRef, useCallback } from "react";
import { PlayerIndicator } from "@/components/player-indicator";
import { GameControls } from "@/components/game-controls";
import { toast } from "sonner";
import socket from "@/lib/socket";
import { GameState, Player } from "@/types/game";
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
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [changedCells, setChangedCells] = useState<Set<string>>(new Set());

  const { uuid } = useAuth();
  const joinedRef = useRef(false);
  const firstConnectRef = useRef(true);
  const prevBoardRef = useRef<string>("");

  // Detect changed cells for animation highlights
  const detectChanges = useCallback((newBoard: any[][]) => {
    const boardStr = JSON.stringify(newBoard);
    if (prevBoardRef.current === "") {
      prevBoardRef.current = boardStr;
      return;
    }

    try {
      const prevBoard = JSON.parse(prevBoardRef.current);
      const changes = new Set<string>();

      for (let r = 0; r < newBoard.length; r++) {
        for (let c = 0; c < newBoard[r].length; c++) {
          if (
            prevBoard[r]?.[c]?.orbs !== newBoard[r][c].orbs ||
            prevBoard[r]?.[c]?.ownerId !== newBoard[r][c].ownerId
          ) {
            changes.add(`${r}-${c}`);
          }
        }
      }

      if (changes.size > 0) {
        setChangedCells(changes);
        // Clear highlights after animation
        setTimeout(() => setChangedCells(new Set()), 600);
      }
    } catch {
      // ignore parse errors
    }

    prevBoardRef.current = boardStr;
  }, []);

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
      prevBoardRef.current = JSON.stringify(state.board);
      toast.success("Game started!");
    });

    socket.on("game-updated", (state: GameState) => {
      // Detect changed cells for animation
      if (state.board) {
        detectChanges(state.board);
      }

      setGameState(state);

      // Process turn events for log
      if (state.turnEvents && state.turnEvents.length > 0) {
        const logs: string[] = [];
        state.turnEvents.forEach((event) => {
          if (event.type === "explosion") {
            logs.push(`💥 ${event.playerName || "Player"}'s cell exploded!`);
          } else if (event.type === "capture") {
            logs.push(`⚡ ${event.playerName || "Player"} captured a cell!`);
          } else if (event.type === "elimination") {
            logs.push(`❌ ${event.playerName || "Player"} has been eliminated!`);
          } else if (event.type === "win") {
            logs.push(`🏆 ${event.playerName || "Player"} wins the game!`);
          }
        });
        setEventLog((prev) => [...prev.slice(-10), ...logs]);
      }

      if (state.winner) {
        setWinnerSelected(true);
      }

      if (!state || !state?.players || state?.players?.length === 0) {
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
  }, [roomId, playerName, gameState, onNavigate, detectChanges]);

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
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-emerald-600 via-teal-500 to-cyan-500">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    );
  }

  // Calculate cell size
  const getCellSize = () => {
    if (gameState.cols <= 4) return "w-16 h-16 md:w-20 md:h-20";
    if (gameState.cols <= 6) return "w-12 h-12 md:w-16 md:h-16";
    if (gameState.cols <= 8) return "w-10 h-10 md:w-14 md:h-14";
    return "w-8 h-8 md:w-12 md:h-12";
  };

  const getCellCapacityLocal = (row: number, col: number): number => {
    const isTop = row === 0;
    const isBottom = row === gameState.rows - 1;
    const isLeft = col === 0;
    const isRight = col === gameState.cols - 1;
    const adjacentCount =
      (isTop ? 0 : 1) + (isBottom ? 0 : 1) + (isLeft ? 0 : 1) + (isRight ? 0 : 1);
    return adjacentCount - 1;
  };

  const getPlayerColor = (playerId: string): string => {
    return gameState.players.find((p) => p.id === playerId)?.color || "#6b7280";
  };

  const cellSizeClass = getCellSize();

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-emerald-600 via-teal-500 to-cyan-500">
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
      <div className="flex justify-center p-2 md:p-4 gap-2 md:gap-3 flex-wrap">
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
      <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-4">
        {/* Turn indicator */}
        {!winnerSelected && (
          <div className="mb-2 md:mb-4 text-white text-lg md:text-xl font-bold">
            {gameState.players[gameState.currentPlayerIndex]?.id === socket.id
              ? "Your"
              : `${gameState.players[gameState.currentPlayerIndex]?.name}'s`}{" "}
            turn
          </div>
        )}

        {/* Board */}
        <div className="mb-2 md:mb-4">
          <div className="flex flex-col items-center gap-0.5">
            {gameState.board.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-0.5">
                {row.map((cell, colIndex) => {
                  const capacity = getCellCapacityLocal(rowIndex, colIndex);
                  const ownerColor = cell.ownerId ? getPlayerColor(cell.ownerId) : null;
                  const cellKey = `${rowIndex}-${colIndex}`;
                  const isChanged = changedCells.has(cellKey);
                  const isClickable =
                    isCurrentPlayer &&
                    (cell.ownerId === null || cell.ownerId === socket.id);
                  const isAboutToExplode = cell.orbs >= capacity && cell.orbs > 0;

                  return (
                    <div
                      key={cellKey}
                      className={`relative ${cellSizeClass} border-2 rounded-lg flex items-center justify-center transition-all duration-150 ${
                        isClickable ? "cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95" : "cursor-default"
                      } ${isChanged ? "ring-2 ring-white animate-pulse" : ""} ${isAboutToExplode ? "ring-2 ring-yellow-300/60" : ""}`}
                      style={{
                        backgroundColor: ownerColor ? `${ownerColor}30` : "rgba(255, 255, 255, 0.1)",
                        borderColor: ownerColor ? `${ownerColor}60` : "rgba(255, 255, 255, 0.2)",
                      }}
                      onClick={isClickable ? () => handleCellClick(rowIndex, colIndex) : undefined}
                    >
                      {cell.orbs > 0 && (
                        <div className="relative w-full h-full">
                          {getOrbPositions(cell.orbs, capacity).map((pos, i) => (
                            <div
                              key={i}
                              className={`absolute w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${isChanged ? "scale-125" : ""}`}
                              style={{
                                backgroundColor: ownerColor || "#6b7280",
                                left: pos.x,
                                top: pos.y,
                                transform: "translate(-50%, -50%)",
                                boxShadow: isChanged
                                  ? `0 0 10px 3px ${ownerColor || "#6b7280"}80`
                                  : `0 1px 3px ${ownerColor || "#6b7280"}60`,
                                transition: "all 0.15s ease-out",
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Event log */}
        {eventLog.length > 0 && (
          <div className="w-full max-w-md mb-2 md:mb-4">
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 max-h-20 md:max-h-24 overflow-y-auto">
              {eventLog.slice(-5).map((log, i) => (
                <div key={i} className="text-white text-xs py-0.5 opacity-80">
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
      <div className="p-2 md:p-4 bg-black/20 backdrop-blur-sm">
        <div className="flex justify-center items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div
              className="w-4 h-4 md:w-5 md:h-5 rounded-full"
              style={{
                backgroundColor:
                  gameState.players.find((p) => p.id === socket.id)
                    ?.color || "#6b7280",
              }}
            />
            <span className="text-white font-bold text-sm md:text-base">
              {gameState.players.find((p) => p.id === socket.id)?.name ||
                "You"}
            </span>
          </div>
          <div className="text-white text-xs md:text-sm">
            Orbs:{" "}
            <span className="font-bold">
              {countPlayerOrbs(gameState.board, socket.id || "")}
            </span>
          </div>
          <div className="text-white text-xs md:text-sm">
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

function getOrbPositions(count: number, capacity: number): { x: string; y: string }[] {
  const positions: { x: string; y: string }[] = [];
  if (capacity === 1) {
    positions.push({ x: "50%", y: "50%" });
  } else if (capacity === 2) {
    if (count >= 1) positions.push({ x: "33%", y: "50%" });
    if (count >= 2) positions.push({ x: "67%", y: "50%" });
  } else {
    if (count >= 1) positions.push({ x: "50%", y: "30%" });
    if (count >= 2) positions.push({ x: "30%", y: "70%" });
    if (count >= 3) positions.push({ x: "70%", y: "70%" });
  }
  return positions;
}
