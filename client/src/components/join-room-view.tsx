import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users, AlertCircle, CheckCircle } from "lucide-react";
import { ChainReactionLogo } from "@/components/chain-reaction-logo";
import { toast } from "sonner";
import socket from "@/lib/socket";
import { GameState } from "@/types/game";
import { PlayerList } from "./player-list";
import { useAuth } from "@/lib/auth-context";

interface JoinRoomViewProps {
  onNavigate: (
    view: "home" | "create-room" | "join-room" | "game"
  ) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  roomId: string;
  setRoomId: (id: string) => void;
}

export function JoinRoomView({
  onNavigate,
  playerName,
  setPlayerName,
  roomId,
  setRoomId,
}: JoinRoomViewProps) {
  const { user, uuid } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.gameName) {
      setPlayerName(user.gameName);
    }
  }, []);

  useEffect(() => {
    socket.on("room-state", (state: GameState) => {
      setGameState(state);
      setError(null);
      if (state.started) {
        onNavigate("game");
      }
    });
    socket.on("error-joining", ({ message }: { message: string }) => {
      setIsJoining(false);
      setError(message);
      toast.error("Error joining room", {
        description: message,
      });
    });

    return () => {
      socket.off("room-state");
      socket.off("error-joining");
    };
  }, [onNavigate]);

  const handleJoin = () => {
    if (!roomId || !playerName.trim()) {
      toast.error("Error", {
        description: "Please enter both room ID and your name",
      });
      return;
    }

    setError(null);
    setIsJoining(true);
    socket.emit("join-room", { roomId, playerName, uuid });
  };

  const isRoomFull = gameState
    ? gameState.players.length >= gameState.maxPlayers
    : false;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-4 border-cyan-400 shadow-2xl">
          <CardHeader className="flex flex-col items-center">
            <ChainReactionLogo className="w-32 h-auto mb-2" />
            <CardTitle className="text-2xl font-extrabold">
              Join Room
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="roomId">Room ID</Label>
              <Input
                id="roomId"
                placeholder="Enter 6-character room ID"
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value.toUpperCase());
                  setError(null);
                }}
                maxLength={6}
                className="border-2 font-mono text-center text-lg uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playerName">Your Name</Label>
              <Input
                id="playerName"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.trim() || value === "") {
                    setPlayerName(value);
                  }
                }}
                className="border-2"
                maxLength={20}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-2 rounded">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Room info when found */}
            {gameState && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Players
                  </Label>
                  <span className={`text-sm font-bold ${
                    isRoomFull ? "text-red-500" : "text-green-600"
                  }`}>
                    {gameState.players.length}/{gameState.maxPlayers}
                  </span>
                </div>

                {/* Room status */}
                {isRoomFull && (
                  <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-2 rounded">
                    <AlertCircle className="h-4 w-4" />
                    Room is full
                  </div>
                )}

                {!isRoomFull && gameState.started && (
                  <div className="flex items-center gap-2 text-sm text-orange-500 bg-orange-50 p-2 rounded">
                    <AlertCircle className="h-4 w-4" />
                    Game already in progress
                  </div>
                )}

                {!isRoomFull && !gameState.started && gameState.players.length < 2 && (
                  <div className="flex items-center gap-2 text-sm text-blue-500 bg-blue-50 p-2 rounded">
                    <AlertCircle className="h-4 w-4" />
                    Waiting for {2 - gameState.players.length} more player{2 - gameState.players.length > 1 ? "s" : ""} to start
                  </div>
                )}

                {!isRoomFull && !gameState.started && gameState.players.length >= 2 && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                    <CheckCircle className="h-4 w-4" />
                    Ready to start!
                  </div>
                )}

                <PlayerList
                  players={gameState.players.map((p) => p.name)}
                  host={gameState.players[0]?.name}
                />

                {/* Board size info */}
                <div className="text-xs text-gray-500 text-center">
                  Board: {gameState.rows}×{gameState.cols}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                className="h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-100 transition-all"
                onClick={() => onNavigate("home")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                onClick={handleJoin}
                disabled={
                  isJoining ||
                  !playerName.trim() ||
                  !roomId ||
                  isRoomFull ||
                  (gameState?.started ?? false)
                }
                className={`h-10 px-6 rounded-md inline-flex items-center justify-center gap-2 font-bold transition-all ${
                  isRoomFull || (gameState?.started ?? false)
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-cyan-600 text-white hover:bg-cyan-700 transform hover:scale-105"
                } disabled:opacity-50 disabled:pointer-events-none`}
              >
                {isJoining
                  ? gameState
                    ? "Joined Game"
                    : "Joining..."
                  : isRoomFull
                  ? "Room Full"
                  : gameState?.started
                  ? "In Progress"
                  : "Join Game"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
