import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerList } from "@/components/player-list";
import { ArrowLeft, Copy, AlertCircle, Users } from "lucide-react";
import { ChainReactionLogo } from "@/components/chain-reaction-logo";
import { toast } from "sonner";
import socket from "@/lib/socket";
import { GameState } from "@/types/game";
import { useAuth } from "@/lib/auth-context";

interface CreateRoomViewProps {
  onNavigate: (
    view: "home" | "create-room" | "join-room" | "game"
  ) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  maxPlayers: string;
  setMaxPlayers: (max: string) => void;
  boardRows: string;
  setBoardRows: (rows: string) => void;
  boardCols: string;
  setBoardCols: (cols: string) => void;
  roomId: string;
  setRoomId: (id: string) => void;
  players: string[];
  setPlayers: (players: string[]) => void;
}

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

export function CreateRoomView({
  onNavigate,
  playerName,
  setPlayerName,
  maxPlayers,
  setMaxPlayers,
  boardRows,
  setBoardRows,
  boardCols,
  setBoardCols,
  roomId,
  setRoomId,
  players,
  setPlayers,
}: CreateRoomViewProps) {
  const { user, uuid } = useAuth();
  const [roomCreated, setRoomCreated] = useState(false);
  const [canStartGame, setCanStartGame] = useState(false);

  useEffect(() => {
    if (user?.gameName) {
      setPlayerName(user.gameName);
    }
  }, []);

  useEffect(() => {
    if (!roomId) {
      const generatedId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      setRoomId(generatedId);
    }
  }, [roomId, setRoomId]);

  useEffect(() => {
    if (roomCreated) {
      socket.on("player-joined", (state: GameState) => {
        setPlayers(state.players.map((p) => p.name));
        // Can start when we have at least MIN_PLAYERS and haven't started yet
        if (state.players.length >= MIN_PLAYERS && !state.started) {
          setCanStartGame(true);
        } else {
          setCanStartGame(false);
        }
      });
      socket.on("player-left", () => {
        socket.emit("get-room-state", { roomId });
      });
      socket.on("room-state", (state: GameState) => {
        setPlayers(state.players.map((p) => p.name));
        // Can start when we have at least MIN_PLAYERS and room is full or host wants to start
        const playerCount = state.players.length;
        setCanStartGame(
          playerCount >= MIN_PLAYERS &&
            playerCount <= MAX_PLAYERS &&
            !state.started
        );
      });

      socket.emit("get-room-state", { roomId });
    }

    return () => {
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("room-state");
    };
  }, [roomCreated, roomId, setPlayers]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast("Room ID copied!", {
      description: "Share this with your friends to join the game.",
    });
  };

  const createNewRoom = () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setPlayers([playerName]);
    setRoomCreated(true);
    socket.emit("join-room", {
      roomId,
      playerName,
      maxPlayers,
      uuid,
      rows: parseInt(boardRows),
      cols: parseInt(boardCols),
    });
  };

  const startGame = () => {
    if (players.length < MIN_PLAYERS) {
      toast.error(`Need at least ${MIN_PLAYERS} players to start`);
      return;
    }
    if (players.length > MAX_PLAYERS) {
      toast.error(`Maximum ${MAX_PLAYERS} players allowed`);
      return;
    }
    socket.emit("start-game", { roomId });
    onNavigate("game");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2">
      <div className="w-full max-w-md">
        <Card className="border-4 border-emerald-400 shadow-2xl">
          <CardHeader className="flex flex-col items-center p-3 md:p-4">
            <ChainReactionLogo className="w-32 h-auto mb-2" />
            <CardTitle className="text-2xl font-extrabold">
              Create Room
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3 md:p-4">
            {!roomCreated && (
              <div className="space-y-2">
                <Label htmlFor="playerName">Your Name</Label>
                <Input
                  id="playerName"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.trim() || value === "") setPlayerName(value);
                  }}
                  className="border-2"
                  maxLength={20}
                />
              </div>
            )}

            {!roomCreated && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Number of Players ({MIN_PLAYERS}-{MAX_PLAYERS})
                </Label>
                <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                  <SelectTrigger
                    id="maxPlayers"
                    className="border-2 w-full bg-gray-700 text-white"
                  >
                    <SelectValue placeholder="Select max players" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Players (Minimum)</SelectItem>
                    <SelectItem value="3">3 Players</SelectItem>
                    <SelectItem value="4">4 Players</SelectItem>
                    <SelectItem value="5">5 Players</SelectItem>
                    <SelectItem value="6">6 Players (Maximum)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Game starts when all slots are filled or host clicks Start
                </p>
              </div>
            )}

            {!roomCreated && (
              <div className="space-y-2">
                <Label>Board Size</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="rows" className="text-xs text-gray-500">
                      Rows
                    </Label>
                    <Select value={boardRows} onValueChange={setBoardRows}>
                      <SelectTrigger
                        id="rows"
                        className="border-2 w-full bg-gray-700 text-white"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="8">8</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end pb-2 text-gray-500 font-bold">
                    ×
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="cols" className="text-xs text-gray-500">
                      Columns
                    </Label>
                    <Select value={boardCols} onValueChange={setBoardCols}>
                      <SelectTrigger
                        id="cols"
                        className="border-2 w-full bg-gray-700 text-white"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="8">8</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Room ID</Label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-3 bg-gray-100 rounded-md font-mono text-center text-lg font-bold">
                  {roomId}
                </div>
                <button
                  onClick={copyRoomId}
                  className="size-9 rounded-md inline-flex items-center justify-center border-2 bg-gray-700 text-white hover:bg-gray-600 transition-all"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!roomCreated && (
              <div className="space-y-2">
                <button
                  className="w-full h-10 px-6 rounded-md inline-flex items-center justify-center text-lg font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
                  onClick={createNewRoom}
                  disabled={!playerName.trim()}
                >
                  Create Room
                </button>
              </div>
            )}

            {roomCreated && (
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Players
                  </span>
                  <span className={`text-sm ${
                    players.length < MIN_PLAYERS
                      ? "text-red-500"
                      : "text-green-600"
                  }`}>
                    {players.length}/{maxPlayers}
                  </span>
                </Label>

                {/* Player count status */}
                <div className={`flex items-center gap-2 text-sm ${
                  players.length < MIN_PLAYERS
                    ? "text-orange-500"
                    : "text-green-600"
                }`}>
                  {players.length < MIN_PLAYERS ? (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      Waiting for {MIN_PLAYERS - players.length} more player{MIN_PLAYERS - players.length > 1 ? "s" : ""}
                    </>
                  ) : (
                    <>
                      ✓ Ready to start ({players.length} player{players.length > 1 ? "s" : ""})
                    </>
                  )}
                </div>

                <PlayerList players={players} host={playerName} />
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

              {roomCreated && (
                <button
                  disabled={!canStartGame}
                  className={`h-10 px-6 rounded-md inline-flex items-center justify-center font-bold bg-green-500 hover:bg-green-600 text-white transition-all ${
                    !canStartGame
                      ? "opacity-50 cursor-not-allowed"
                      : "transform hover:scale-105"
                  }`}
                  onClick={startGame}
                >
                  {players.length < MIN_PLAYERS
                    ? `Waiting for Players (${players.length}/${MIN_PLAYERS})`
                    : "Start Game"}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
