import { useState, useEffect, useRef, useCallback } from "react";
import { GameBoard } from "@/components/game-board";
import { PlayerIndicator } from "@/components/player-indicator";
import { GameControls } from "@/components/game-controls";
import { toast } from "sonner";
import {
  GameState,
  TurnEvent,
} from "@/types/game";
import { AskReplay } from "./ask-replay";
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
  const [animatingCells, setAnimatingCells] = useState<Map<string, string>>(
    new Map()
  );
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [aiThinking, setAiThinking] = useState(false);

  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animatingRef = useRef(false);

  const isVsCPU = config.mode === "vs-cpu";

  // Initialize game
  useEffect(() => {
    const game = createOfflineGame(
      config.rows,
      config.cols,
      config.humanPlayers,
      config.aiPlayers,
      config.playerName
    );
    setGameState(game);
    toast.success("Game started!");
  }, [config]);

  // Process turn events for animation
  const processTurnEvents = useCallback(
    (events: TurnEvent[]) => {
      if (!events || events.length === 0) return;

      const newAnimating = new Map<string, string>();
      const logs: string[] = [];

      events.forEach((event) => {
        if (
          event.type === "explosion" &&
          event.row !== undefined &&
          event.col !== undefined
        ) {
          const key = `${event.row}-${event.col}`;
          newAnimating.set(key, "explosion");
          logs.push(
            `💥 ${event.playerName || "Player"}'s cell exploded!`
          );
        } else if (
          event.type === "capture" &&
          event.row !== undefined &&
          event.col !== undefined
        ) {
          const key = `${event.row}-${event.col}`;
          newAnimating.set(key, "capture");
          logs.push(
            `⚡ ${event.playerName || "Player"} captured a cell!`
          );
        } else if (event.type === "elimination") {
          logs.push(
            `❌ ${event.playerName || "Player"} has been eliminated!`
          );
        } else if (event.type === "win") {
          logs.push(
            `🏆 ${event.playerName || "Player"} wins the game!`
          );
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

  // Handle AI moves
  useEffect(() => {
    if (!gameState || winnerSelected || animatingRef.current) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.active) return;

    // Check if it's AI's turn
    if (isAI(currentPlayer.id)) {
      setAiThinking(true);
      const difficulty = config.aiDifficulty;

      // Add delay for AI thinking
      aiTimeoutRef.current = setTimeout(() => {
        const move = getAIMove(gameState, currentPlayer.id, difficulty);

        if (move) {
          const newState = placeOrbLocal(
            gameState,
            currentPlayer.id,
            move.row,
            move.col
          );

          if (newState) {
            setGameState(newState);

            if (newState.turnEvents && newState.turnEvents.length > 0) {
              processTurnEvents(newState.turnEvents);
            }

            if (newState.winner) {
              toast.success(
                `${newState.winner.name} wins the game!`
              );
              setWinnerSelected(true);
            }
          }
        }

        setAiThinking(false);
      }, 500 + Math.random() * 500); // 500-1000ms delay
    } else {
      // Human player's turn
      setIsCurrentPlayerTurn(true);
    }

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [gameState, winnerSelected, config.aiDifficulty, processTurnEvents]);

  // Update current player turn status
  useEffect(() => {
    if (!gameState) {
      setIsCurrentPlayerTurn(false);
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    // Allow any human player to play their turn (not just human-0)
    setIsCurrentPlayerTurn(
      currentPlayer && !currentPlayer.id.startsWith("ai-") && !winnerSelected
    );
  }, [gameState, winnerSelected]);

  const handleCellClick = (row: number, col: number) => {
    if (!isCurrentPlayerTurn || !gameState || aiThinking) return;

    // Get the current player's ID (could be any human in local multiplayer)
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id.startsWith("ai-")) return;

    const newState = placeOrbLocal(gameState, currentPlayer.id, row, col);
    if (newState) {
      setGameState(newState);

      if (newState.turnEvents && newState.turnEvents.length > 0) {
        processTurnEvents(newState.turnEvents);
      }

      if (newState.winner) {
        toast.success(`${newState.winner.name} wins the game!`);
        setWinnerSelected(true);
      }
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
      config.playerName
    );
    setGameState(game);
    setWinnerSelected(false);
    setEventLog([]);
    setAnimatingCells(new Map());
    toast.success("New game started!");
  };

  const handleExit = () => {
    onNavigate("home");
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-600 via-teal-500 to-cyan-500">
        <div className="text-white text-2xl">Loading game...</div>
      </div>
    );
  }

  // Determine who is "you" (the first human player)
  const humanPlayers = gameState.players.filter(
    (p) => !p.id.startsWith("ai-")
  );
  const aiPlayers = gameState.players.filter((p) => p.id.startsWith("ai-"));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-600 via-teal-500 to-cyan-500">
      {/* Winner overlay */}
      {winnerSelected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <AskReplay
            confirmAction={replay}
            declineAction={handleExit}
            title={
              !gameState.winner?.id.startsWith("ai-")
                ? `${gameState.winner?.name} Won! 🎉`
                : `${gameState.winner?.name} Won!`
            }
            confirmText="Play Again"
            declineText="Exit"
          />
        </div>
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
      <div className="flex justify-center p-4 gap-3 flex-wrap">
        {/* In vs CPU mode, show the AI at top */}
        {isVsCPU &&
          aiPlayers.map((player) => (
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

        {/* In vs Humans mode, show other humans at top (not the current turn player) */}
        {!isVsCPU &&
          humanPlayers
            .filter(
              (p) =>
                p.id !== gameState.players[gameState.currentPlayerIndex]?.id
            )
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
            {aiThinking && (
              <span className="animate-pulse">
                🤖 AI is thinking...
              </span>
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
            {!aiThinking &&
              !isCurrentPlayerTurn &&
              gameState.players[gameState.currentPlayerIndex] && (
                <span>
                  {gameState.players[gameState.currentPlayerIndex].name}'s
                  turn
                </span>
              )}
          </div>
        )}

        {/* Board */}
        <div className="mb-4">
          <GameBoard
            board={gameState.board}
            rows={gameState.rows}
            cols={gameState.cols}
            isCurrentPlayerTurn={isCurrentPlayerTurn && !aiThinking}
            currentPlayerId={
              gameState.players[gameState.currentPlayerIndex]?.id || ""
            }
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
            isPlayerTurn={isCurrentPlayerTurn && !aiThinking}
            onExitGame={() => setExitGame(true)}
            muteControl={muteControl}
            isMuted={isMuted}
          />
        </div>
      </div>

      {/* Bottom section - your info */}
      <div className="p-4 bg-black/20 backdrop-blur-sm">
        <div className="flex justify-center items-center gap-4">
          {humanPlayers.map((player) => {
            const isCurrentTurn =
              player.id ===
              gameState.players[gameState.currentPlayerIndex]?.id;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-2 ${
                  isCurrentTurn
                    ? "ring-2 ring-white rounded-lg p-2"
                    : "opacity-70"
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full"
                  style={{
                    backgroundColor: player.color || "#6b7280",
                  }}
                />
                <span className="text-white font-bold">
                  {player.name}
                  {!isVsCPU && isCurrentTurn && (
                    <span className="text-yellow-300 text-xs ml-1">
                      ◀ YOUR TURN
                    </span>
                  )}
                  {isVsCPU && (
                    <span className="text-gray-300 text-xs ml-1">(You)</span>
                  )}
                </span>
                <div className="text-white text-sm">
                  Orbs:{" "}
                  <span className="font-bold">
                    {countPlayerOrbs(gameState.board, player.id)}
                  </span>
                </div>
                <div className="text-white text-sm">
                  Cells:{" "}
                  <span className="font-bold">
                    {countPlayerCells(gameState.board, player.id)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
