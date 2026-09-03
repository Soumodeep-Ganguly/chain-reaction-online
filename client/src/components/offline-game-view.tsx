import { useState, useEffect, useRef, useCallback } from "react";
import { AnimationPlayer } from "@/components/animation-player";
import { PlayerIndicator } from "@/components/player-indicator";
import { GameControls } from "@/components/game-controls";
import { toast } from "sonner";
import { GameState, AnimationFrame } from "@/types/game";
import { AskReplay } from "./ask-replay";
import { WinPopup } from "./win-popup";
import { OfflineGameConfig } from "./offline-setup-view";
import {
  createOfflineGame,
  placeOrbLocal,
  getAIMove,
  isAI,
  countPlayerOrbs,
  countPlayerCells,
} from "@/lib/ai-game";

interface OfflineGameViewProps {
  onNavigate: (view: "home") => void;
  config: OfflineGameConfig;
}

export function OfflineGameView({ onNavigate, config }: OfflineGameViewProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCurrentPlayerTurn, setIsCurrentPlayerTurn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [winnerSelected, setWinnerSelected] = useState(false);
  const [exitGame, setExitGame] = useState(false);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationFrames, setAnimationFrames] = useState<AnimationFrame[]>([]);
  const [preAnimationBoard, setPreAnimationBoard] = useState<{ orbs: number; ownerId: string | null }[][]>([]);

  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStateRef = useRef<GameState | null>(null);
  const initializedRef = useRef(false);

  const isVsCPU = config.mode === "vs-cpu";

  // Initialize game (only once)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const game = createOfflineGame(
      config.rows,
      config.cols,
      config.humanPlayers,
      config.aiPlayers,
      config.playerName,
      config.playerNames
    );
    setGameState(game);
    toast.success("Game started!");
  }, []);

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
    setAnimationFrames([]);

    if (pendingStateRef.current) {
      const finalState = pendingStateRef.current;
      setGameState(finalState);
      pendingStateRef.current = null;

      // Check for winner — if found, stop everything immediately
      if (finalState.winner) {
        toast.success(`${finalState.winner.name} wins the game!`);
        setWinnerSelected(true);
        return;
      }
    }
  }, []);

  // Start animation for a move
  const startAnimation = useCallback(
    (newState: GameState, preMoveState: GameState) => {
      if (
        newState.animationSequence &&
        newState.animationSequence.frames.length > 1
      ) {
        // Has chain reactions - animate them
        pendingStateRef.current = newState;
        setPreAnimationBoard(preMoveState.board);
        setAnimationFrames(newState.animationSequence.frames);
        setIsAnimating(true);
      } else {
        // No chain reactions - just apply the state directly
        setGameState(newState);
        if (newState.winner) {
          toast.success(`${newState.winner.name} wins the game!`);
          setWinnerSelected(true);
        }
      }
    },
    []
  );

  // Handle AI moves
  useEffect(() => {
    if (!gameState || winnerSelected || isAnimating) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.active) return;

    // If only one active player remains, game is over
    const activePlayers = gameState.players.filter(p => p.active);
    if (activePlayers.length <= 1) {
      if (activePlayers.length === 1 && !gameState.winner) {
        toast.success(`${activePlayers[0].name} wins the game!`);
        setGameState(prev => prev ? { ...prev, winner: activePlayers[0] } : prev);
        setWinnerSelected(true);
      }
      return;
    }

    if (isAI(currentPlayer.id)) {
      setAiThinking(true);
      const difficulty = config.aiDifficulty;

      aiTimeoutRef.current = setTimeout(() => {
        // Re-check conditions before executing the move
        if (winnerSelected || isAnimating) {
          setAiThinking(false);
          return;
        }

        const move = getAIMove(gameState, currentPlayer.id, difficulty);

        if (move) {
          const newState = placeOrbLocal(
            gameState,
            currentPlayer.id,
            move.row,
            move.col
          );

          if (newState) {
            startAnimation(newState, gameState);
          }
        }

        setAiThinking(false);
      }, 500 + Math.random() * 500);
    } else {
      setIsCurrentPlayerTurn(true);
    }

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [gameState, winnerSelected, isAnimating, config.aiDifficulty, startAnimation]);

  // Update current player turn status
  useEffect(() => {
    if (!gameState) {
      setIsCurrentPlayerTurn(false);
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    setIsCurrentPlayerTurn(
      currentPlayer && !currentPlayer.id.startsWith("ai-") && !winnerSelected && !isAnimating
    );
  }, [gameState, winnerSelected, isAnimating]);

  const handleCellClick = (row: number, col: number) => {
    if (!isCurrentPlayerTurn || !gameState || aiThinking || isAnimating) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id.startsWith("ai-")) return;

    const newState = placeOrbLocal(gameState, currentPlayer.id, row, col);
    if (newState) {
      startAnimation(newState, gameState);
    } else {
      toast.error("Invalid move!");
    }
  };

  const muteControl = () => setIsMuted((prev) => !prev);

  const replay = () => {
    const game = createOfflineGame(
      config.rows,
      config.cols,
      config.humanPlayers,
      config.aiPlayers,
      config.playerName,
      config.playerNames
    );
    setGameState(game);
    setWinnerSelected(false);
    setEventLog([]);
    setIsAnimating(false);
    setAnimationFrames([]);
    toast.success("New game started!");
  };

  const handleExit = () => {
    onNavigate("home");
  };

  if (!gameState) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-emerald-600 via-teal-500 to-cyan-500">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    );
  }

  const humanPlayers = gameState.players.filter((p) => !p.id.startsWith("ai-"));
  const aiPlayers = gameState.players.filter((p) => p.id.startsWith("ai-"));

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-emerald-600 via-teal-500 to-cyan-500">
      {/* Winner overlay */}
      {winnerSelected && gameState?.winner && (
        <WinPopup
          winnerName={gameState.winner.name}
          isPlayerWin={!gameState.winner.id.startsWith("ai-")}
          boardSize={`${config.rows}x${config.cols}`}
          playerCount={config.humanPlayers + config.aiPlayers}
          mode={config.mode}
          onPlayAgain={replay}
          onExit={handleExit}
        />
      )}

      {/* Exit game overlay */}
      {exitGame && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <AskReplay
            confirmAction={handleExit}
            declineAction={() => setExitGame(false)}
            title="Exit this game?"
            confirmText="Yes"
            declineText="No"
          />
        </div>
      )}

      {/* Top section - opponents */}
      <div className="flex justify-center p-2 md:p-4 gap-2 md:gap-3 flex-wrap">
        {isVsCPU &&
          aiPlayers.map((player) => (
            <PlayerIndicator
              key={player.id}
              player={player}
              orbCount={countPlayerOrbs(gameState.board, player.id)}
              cellCount={countPlayerCells(gameState.board, player.id)}
              isActive={
                player.id === gameState.players[gameState.currentPlayerIndex]?.id
              }
            />
          ))}

        {!isVsCPU &&
          humanPlayers
            .filter((p) => p.id !== gameState.players[gameState.currentPlayerIndex]?.id)
            .map((player) => (
              <PlayerIndicator
                key={player.id}
                player={player}
                orbCount={countPlayerOrbs(gameState.board, player.id)}
                cellCount={countPlayerCells(gameState.board, player.id)}
                isActive={
                  player.id === gameState.players[gameState.currentPlayerIndex]?.id
                }
              />
            ))}
      </div>

      {/* Middle section - board */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-4">
        {/* Turn indicator */}
        {!winnerSelected && (
          <div className="mb-2 md:mb-4 text-white text-lg md:text-xl font-bold">
            {aiThinking && (
              <span className="animate-pulse">🤖 AI is thinking...</span>
            )}
            {!aiThinking && isCurrentPlayerTurn && isVsCPU && (
              <span>Your Turn - Place an Orb!</span>
            )}
            {!aiThinking && isCurrentPlayerTurn && !isVsCPU && (
              <span>
                {gameState.players[gameState.currentPlayerIndex]?.name}'s
                Turn - Place an Orb!
              </span>
            )}
            {!aiThinking && !isCurrentPlayerTurn && gameState.players[gameState.currentPlayerIndex] && (
              <span>
                {gameState.players[gameState.currentPlayerIndex].name}'s turn
              </span>
            )}
          </div>
        )}

        {/* Board with animation */}
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
            <StaticBoard
              board={gameState.board}
              rows={gameState.rows}
              cols={gameState.cols}
              players={gameState.players}
              currentPlayerId={gameState.players[gameState.currentPlayerIndex]?.id}
              onCellClick={handleCellClick}
              isCurrentPlayerTurn={isCurrentPlayerTurn && !aiThinking && !isAnimating}
            />
          )}
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
            isPlayerTurn={isCurrentPlayerTurn && !aiThinking && !isAnimating}
            onExitGame={() => setExitGame(true)}
            muteControl={muteControl}
            isMuted={isMuted}
          />
        </div>
      </div>

      {/* Bottom section - your info */}
      <div className="p-2 md:p-4 bg-black/20 backdrop-blur-sm">
        <div className="flex justify-center items-center gap-2 md:gap-4 flex-wrap">
          {humanPlayers.map((player) => {
            const isCurrentTurn =
              player.id === gameState.players[gameState.currentPlayerIndex]?.id;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-1.5 md:gap-2 text-xs md:text-sm ${
                  isCurrentTurn ? "ring-2 ring-white rounded-lg p-1.5 md:p-2" : "opacity-70"
                }`}
              >
                <div
                  className="w-4 h-4 md:w-5 md:h-5 rounded-full"
                  style={{ backgroundColor: player.color || "#6b7280" }}
                />
                <span className="text-white font-bold">
                  {player.name}
                  {isVsCPU && <span className="text-gray-300 ml-1">(You)</span>}
                </span>
                <div className="text-white">
                  Orbs: <span className="font-bold">{countPlayerOrbs(gameState.board, player.id)}</span>
                </div>
                <div className="text-white">
                  Cells: <span className="font-bold">{countPlayerCells(gameState.board, player.id)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Static board component (no animation)
function StaticBoard({
  board,
  rows,
  cols,
  players,
  currentPlayerId,
  onCellClick,
  isCurrentPlayerTurn,
}: {
  board: any[][];
  rows: number;
  cols: number;
  players: any[];
  currentPlayerId?: string;
  onCellClick: (row: number, col: number) => void;
  isCurrentPlayerTurn: boolean;
}) {
  const getCellCapacityLocal = (row: number, col: number): number => {
    const isTop = row === 0;
    const isBottom = row === rows - 1;
    const isLeft = col === 0;
    const isRight = col === cols - 1;
    const adjacentCount =
      (isTop ? 0 : 1) + (isBottom ? 0 : 1) + (isLeft ? 0 : 1) + (isRight ? 0 : 1);
    return adjacentCount - 1;
  };

  const getPlayerColor = (playerId: string): string => {
    return players.find((p: any) => p.id === playerId)?.color || "#6b7280";
  };

  const getCellSize = () => {
    if (cols <= 4) return "w-16 h-16 md:w-20 md:h-20";
    if (cols <= 6) return "w-12 h-12 md:w-16 md:h-16";
    if (cols <= 8) return "w-10 h-10 md:w-14 md:h-14";
    return "w-8 h-8 md:w-12 md:h-12";
  };

  const cellSizeClass = getCellSize();

  return (
    <div className="flex flex-col items-center gap-0.5">
      {board.map((row: any[], rowIndex: number) => (
        <div key={rowIndex} className="flex gap-0.5">
          {row.map((cell: any, colIndex: number) => {
            const capacity = getCellCapacityLocal(rowIndex, colIndex);
            const ownerColor = cell.ownerId ? getPlayerColor(cell.ownerId) : null;
            const isClickable =
              isCurrentPlayerTurn &&
              (cell.ownerId === null || cell.ownerId === currentPlayerId);
            const isAboutToExplode = cell.orbs >= capacity && cell.orbs > 0;

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`relative ${cellSizeClass} border-2 rounded-lg flex items-center justify-center transition-all duration-150 ${
                  isClickable ? "cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95" : "cursor-default"
                } ${isAboutToExplode ? "ring-2 ring-white/60" : ""}`}
                style={{
                  backgroundColor: ownerColor ? `${ownerColor}30` : "rgba(255, 255, 255, 0.1)",
                  borderColor: ownerColor ? `${ownerColor}60` : "rgba(255, 255, 255, 0.2)",
                }}
                onClick={isClickable ? () => onCellClick(rowIndex, colIndex) : undefined}
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
