import { useState, useEffect, useRef, useCallback } from "react";
import { AnimationPlayer } from "@/components/animation-player";
import { PlayerIndicator } from "@/components/player-indicator";
import { GameControls } from "@/components/game-controls";
import { toast } from "sonner";
import socket from "@/lib/socket";
import { GameState, Player, AnimationFrame } from "@/types/game";
import { AskReplay } from "./ask-replay";
import { useAuth } from "@/lib/auth-context";
import { countPlayerOrbs, countPlayerCells } from "@/lib/game-helpers";
import { generateAnimationSequence } from "@/lib/ai-game";

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
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationFrames, setAnimationFrames] = useState<AnimationFrame[]>([]);
  const [preAnimationBoard, setPreAnimationBoard] = useState<{ orbs: number; ownerId: string | null }[][]>([]);

  const { uuid } = useAuth();
  const joinedRef = useRef(false);
  const firstConnectRef = useRef(true);
  const prevBoardRef = useRef<{ orbs: number; ownerId: string | null }[][] | null>(null);
  const pendingQueueRef = useRef<GameState[]>([]);
  const pendingWinnerRef = useRef<Player | null>(null);
  // Refs to allow stable socket effect (deps [roomId,playerName] only) while reading latest values
  const isAnimatingRef = useRef(false);
  const gameStateRef = useRef<GameState | null>(null);

  // Keep refs in sync with state
  useEffect(() => { isAnimatingRef.current = isAnimating; }, [isAnimating]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Handle animation completion - drain FIFO queue kept via refs
  // winnerSelected is deferred until animation fully completes (fixes popup before animation)
  const handleAnimationComplete = useCallback(() => {
    setAnimationFrames([]);

    if (pendingQueueRef.current.length > 0) {
      const finalState = pendingQueueRef.current.shift()!;
      prevBoardRef.current = finalState.board.map(r => r.map(c => ({ ...c })));
      setGameState(finalState);

      if (finalState.turnEvents && finalState.turnEvents.length > 0) {
        const logs: string[] = [];
        finalState.turnEvents.forEach((event) => {
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

      // Defer winner popup until queue fully drained - do not set yet if more pending
      const hasMorePending = pendingQueueRef.current.length > 0;

      if (!hasMorePending && (finalState.winner || pendingWinnerRef.current)) {
        setWinnerSelected(true);
        pendingWinnerRef.current = null;
      }

      // If more states queued while we were animating, start next animation immediately
      if (pendingQueueRef.current.length > 0) {
        const nextState = pendingQueueRef.current[0];
        const beforeBoard = prevBoardRef.current;
        if (beforeBoard && nextState.board && nextState.turnEvents) {
          const placeEvent = nextState.turnEvents.find((e: any) => e.type === "place");
          if (placeEvent && placeEvent.row !== undefined) {
            const getPlayerColor = (id: string) => nextState.players.find((p) => p.id === id)?.color || "#6b7280";
            const sequence = generateAnimationSequence(
              beforeBoard,
              nextState.rows,
              nextState.cols,
              placeEvent.row,
              placeEvent.col,
              placeEvent.playerId || "",
              getPlayerColor
            );
            if (sequence.frames.length > 1) {
              setPreAnimationBoard(beforeBoard);
              setAnimationFrames(sequence.frames);
              // keep isAnimating true, isAnimatingRef already true
              return;
            }
          }
        }
        // No animation needed for next - flush it now
        const immediateNext = pendingQueueRef.current.shift()!;
        prevBoardRef.current = immediateNext.board.map(r => r.map(c => ({ ...c })));
        setGameState(immediateNext);
        if (immediateNext.winner || pendingWinnerRef.current) {
          // if this was the last queued and it has a winner, show popup now
          if (pendingQueueRef.current.length === 0) {
            setWinnerSelected(true);
            pendingWinnerRef.current = null;
          }
        }
      }
      // No more pending - end animating (popup already handled above)
      if (pendingQueueRef.current.length === 0) {
        setIsAnimating(false);
        isAnimatingRef.current = false;
        // If winner was queued via game-over (not via finalState.winner) ensure popup shows
        if (pendingWinnerRef.current) {
          setWinnerSelected(true);
          pendingWinnerRef.current = null;
        }
      }
    } else {
      setIsAnimating(false);
      isAnimatingRef.current = false;
      if (pendingWinnerRef.current) {
        setWinnerSelected(true);
        pendingWinnerRef.current = null;
      }
    }
  }, []);

  // Simulate chain reaction locally to get animation frames
  const simulateChainReaction = useCallback((
    beforeBoard: { orbs: number; ownerId: string | null }[][],
    rows: number,
    cols: number,
    players: { id: string; color: string }[],
    turnEvents: any[]
  ): { frames: AnimationFrame[]; preBoard: { orbs: number; ownerId: string | null }[][] } | null => {
    // Find the placed cell from turnEvents (the server sends this info)
    const placeEvent = turnEvents.find((e: any) => e.type === "place");
    if (!placeEvent || placeEvent.row === undefined || placeEvent.col === undefined) return null;

    const placedRow = placeEvent.row;
    const placedCol = placeEvent.col;
    const placedPlayerId = placeEvent.playerId || "";

    const getPlayerColor = (id: string): string => {
      return players.find((p) => p.id === id)?.color || "#6b7280";
    };

    // Run the same animation sequence logic as offline
    const sequence = generateAnimationSequence(
      beforeBoard,
      rows,
      cols,
      placedRow,
      placedCol,
      placedPlayerId,
      getPlayerColor
    );

    return {
      frames: sequence.frames,
      preBoard: beforeBoard,
    };
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

    const handleRoomState = (state: GameState) => {
      // room-state is emitted on join/leave/disconnect - use as source of truth if not animating
      if (isAnimatingRef.current) {
        pendingQueueRef.current.push(state);
        return;
      }
      // Before game started, just update players/lobby info
      // During game, board/currentPlayer matters - sync fully
      prevBoardRef.current = state.board.map(r => r.map(c => ({ ...c })));
      setGameState(state);
      if (!state.started) setEventLog([]);
    };

    socket.on("game-started", (state: GameState) => {
      // Clear any pending from lobby
      pendingQueueRef.current = [];
      pendingWinnerRef.current = null;
      setWinnerSelected(false);
      setIsAnimating(false);
      isAnimatingRef.current = false;
      setAnimationFrames([]);
      setGameState(state);
      setEventLog([]);
      prevBoardRef.current = state.board.map(r => r.map(c => ({ ...c })));
      toast.success("Game started!");
    });

    socket.on("game-updated", (state: GameState) => {
      // Use ref to avoid stale closure - keep animation via refs
      if (isAnimatingRef.current) {
        pendingQueueRef.current.push(state);
        return;
      }

      // Simulate chain reaction locally to generate animation frames
      if (state.board && prevBoardRef.current && state.players && state.turnEvents) {
        const result = simulateChainReaction(
          prevBoardRef.current,
          state.rows,
          state.cols,
          state.players.map(p => ({ id: p.id, color: p.color })),
          state.turnEvents
        );

        if (result && result.frames.length > 1) {
          pendingQueueRef.current = [state];
          setPreAnimationBoard(result.preBoard);
          setAnimationFrames(result.frames);
          setIsAnimating(true);
          isAnimatingRef.current = true;
          return;
        }
      }

      // No animation needed, just update state
      prevBoardRef.current = state.board.map(r => r.map(c => ({ ...c })));
      setGameState(state);

      if (!state.winner) setWinnerSelected(false);

      if (!state || !state?.players || state?.players?.length === 0) {
        setTimeout(() => {
          onNavigate("home");
        }, 1000);
      }
    });

    socket.on("room-state", handleRoomState);

    socket.on("player-joined", (state: GameState) => {
      // Keep lobby sync - if game not started, update via room-state path, but also handle if not animating
      if (isAnimatingRef.current) return;
      const cur = gameStateRef.current;
      if (cur && cur.started) {
        // In-game joins shouldn't happen (maxPlayers), ignore or merge players only to not clobber board
        setGameState((prev) => (prev ? { ...prev, players: state.players } : state));
      } else {
        setGameState((prev) => (prev ? { ...prev, players: state.players, maxPlayers: state.maxPlayers, rows: state.rows, cols: state.cols } : state));
      }
      if (!state.started) {
        toast.info("Waiting for more players to join...");
      }
    });

    socket.on("player-left", (playerId: string) => {
      if (playerId === socket.id) {
        onNavigate("home");
        return;
      }
      const cur = gameStateRef.current;
      const player = cur?.players.find((p) => p.id === playerId);
      if (player) {
        toast.info(`${player.name} left the game`);
      }
      const remaining = cur?.players.filter((p) => p.id !== playerId) || [];
      if (remaining.length <= 1 && cur?.started) {
        toast.info("Not enough players. Returning to home...");
        setTimeout(() => onNavigate("home"), 1500);
      }
    });

    socket.on("invalid-move", ({ message, reason }: { message: string; reason?: string }) => {
      // reason helps debug ghost turn vs cell_owned
      if (reason === "not_your_turn") toast.error("Not your turn yet - board is syncing...");
      else toast.error(message);
    });

    socket.on("game-over", ({ winner }: { winner: Player }) => {
      toast.success(
        `${winner.id === socket.id ? "You" : winner.name} won the game!`
      );
      // Defer popup until animation completes (fixes popup before animation)
      if (isAnimatingRef.current || pendingQueueRef.current.length > 0) {
        pendingWinnerRef.current = winner;
      } else {
        setWinnerSelected(true);
      }
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("game-started");
      socket.off("game-updated");
      socket.off("room-state", handleRoomState);
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("invalid-move");
      socket.off("game-over");
    };
  }, [roomId, playerName]);

  useEffect(() => {
    if (gameState) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      setIsCurrentPlayer(currentPlayer?.id === socket.id);
    }
  }, [gameState]);

  const handleCellClick = (row: number, col: number) => {
    if (!isCurrentPlayer || !gameState || isAnimatingRef.current) return;
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

  const cellSizeClass = getCellSize();

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-emerald-600 via-teal-500 to-cyan-500">
      {gameState?.players.length > 1 &&
        gameState?.players[0].id === socket.id &&
        winnerSelected &&
        !isAnimating && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <AskReplay
              confirmAction={replay}
              declineAction={destroyRoom}
              title="Do you want to re-play?"
              confirmText="Play Again"
              declineText="Destroy Room"
            />
          </div>
        )}

      {exitGame && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
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

      <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-4">
        {!winnerSelected && (
          <div className="mb-2 md:mb-4 text-white text-lg md:text-xl font-bold">
            {isAnimating && <span className="animate-pulse">⚡ Chain reaction...</span>}
            {!isAnimating && gameState.players[gameState.currentPlayerIndex]?.id === socket.id
              ? "Your"
              : !isAnimating ? `${gameState.players[gameState.currentPlayerIndex]?.name}'s` : ""}{" "}
            {!isAnimating && "turn"}
          </div>
        )}

        <div className="mb-2 md:mb-4">
          {isAnimating && animationFrames.length > 0 ? (
            <AnimationPlayer
              frames={animationFrames}
              rows={gameState.rows}
              cols={gameState.cols}
              players={gameState.players}
              initialBoard={preAnimationBoard}
              onAnimationComplete={handleAnimationComplete}
            />
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              {gameState.board.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-0.5">
                  {row.map((cell, colIndex) => {
                    const capacity = getCellCapacityLocal(rowIndex, colIndex);
                    const ownerColor = cell.ownerId ? (gameState.players.find((p) => p.id === cell.ownerId)?.color || "#6b7280") : null;
                    const cellKey = `${rowIndex}-${colIndex}`;
                    const isClickable =
                      isCurrentPlayer &&
                      (cell.ownerId === null || cell.ownerId === socket.id);
                    const isAboutToExplode = cell.orbs >= capacity && cell.orbs > 0;

                    return (
                      <div
                        key={cellKey}
                        className={`relative ${cellSizeClass} border-2 rounded-lg flex items-center justify-center transition-all duration-150 ${
                          isClickable ? "cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95" : "cursor-default"
                        } ${isAboutToExplode ? "ring-2 ring-white/60" : ""}`}
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
                                className="absolute w-2.5 h-2.5 md:w-3 md:h-3 rounded-full"
                                style={{
                                  backgroundColor: ownerColor || "#6b7280",
                                  left: pos.x,
                                  top: pos.y,
                                  transform: "translate(-50%, -50%)",
                                  boxShadow: `0 1px 3px ${ownerColor || "#6b7280"}60`,
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
          )}
        </div>

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

        <div className="w-full max-w-md mx-auto">
          <GameControls
            isPlayerTurn={isCurrentPlayer && !isAnimating}
            onExitGame={() => setExitGame(true)}
            muteControl={muteControl}
            isMuted={isMuted}
          />
        </div>
      </div>

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
