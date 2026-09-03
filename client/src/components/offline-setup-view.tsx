import { useState, useEffect } from "react";
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
import { ArrowLeft, Bot, Users, Grid3X3 } from "lucide-react";
import { ChainReactionLogo } from "@/components/chain-reaction-logo";
import { useAuth } from "@/lib/auth-context";

interface OfflineSetupViewProps {
  onNavigate: (
    view: "home" | "offline-setup" | "offline-game"
  ) => void;
  onStartGame: (config: OfflineGameConfig) => void;
}

export interface OfflineGameConfig {
  rows: number;
  cols: number;
  humanPlayers: number;
  aiPlayers: number;
  aiDifficulty: "easy" | "medium" | "hard";
  playerName: string;
  playerNames?: string[];
  mode: "vs-cpu" | "vs-humans";
}

export function OfflineSetupView({
  onNavigate,
  onStartGame,
}: OfflineSetupViewProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"vs-cpu" | "vs-humans">("vs-cpu");
  const [playerName, setPlayerName] = useState("");
  const [boardRows, setBoardRows] = useState("6");
  const [boardCols, setBoardCols] = useState("6");
  const [humanCount, setHumanCount] = useState("2"); // For vs-humans mode
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [playerNames, setPlayerNames] = useState<string[]>(["", "", "", "", "", ""]);

  useEffect(() => {
    if (user?.gameName) {
      setPlayerName(user.gameName);
    }
  }, []);

  const handleStart = () => {
    if (!playerName.trim()) return;

    if (mode === "vs-cpu") {
      onStartGame({
        rows: parseInt(boardRows),
        cols: parseInt(boardCols),
        humanPlayers: 1,
        aiPlayers: 1,
        aiDifficulty,
        playerName: playerName.trim(),
        mode: "vs-cpu",
      });
    } else {
      const count = parseInt(humanCount);
      const names = [playerName.trim()];
      for (let i = 1; i < count; i++) {
        names.push(playerNames[i]?.trim() || `Player ${i + 1}`);
      }
      onStartGame({
        rows: parseInt(boardRows),
        cols: parseInt(boardCols),
        humanPlayers: count,
        aiPlayers: 0,
        aiDifficulty: "medium",
        playerName: playerName.trim(),
        playerNames: names,
        mode: "vs-humans",
      });
    }
  };

  const canStart = playerName.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2">
      <div className="w-full max-w-md">
        <Card className="border-4 border-orange-400 shadow-2xl">
          <CardHeader className="flex flex-col items-center p-3 md:p-4">
            <ChainReactionLogo className="w-32 h-auto mb-2" />
            <CardTitle className="text-2xl font-extrabold">
              Offline Game Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3 md:p-4">
            {/* Player Name */}
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

            {/* Mode Toggle */}
            <div className="space-y-2">
              <Label>Game Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode("vs-cpu")}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    mode === "vs-cpu"
                      ? "border-orange-500 bg-orange-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <Bot className={`h-8 w-8 mx-auto mb-2 ${mode === "vs-cpu" ? "text-orange-500" : "text-gray-400"}`} />
                  <p className={`font-bold ${mode === "vs-cpu" ? "text-orange-700" : "text-gray-700"}`}>
                    vs Computer
                  </p>
                  <p className="text-xs text-gray-500 mt-1">1 Human vs 1 AI</p>
                </button>
                <button
                  onClick={() => setMode("vs-humans")}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    mode === "vs-humans"
                      ? "border-orange-500 bg-orange-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <Users className={`h-8 w-8 mx-auto mb-2 ${mode === "vs-humans" ? "text-orange-500" : "text-gray-400"}`} />
                  <p className={`font-bold ${mode === "vs-humans" ? "text-orange-700" : "text-gray-700"}`}>
                    vs Humans
                  </p>
                  <p className="text-xs text-gray-500 mt-1">2-6 players, same device</p>
                </button>
              </div>
            </div>

            {/* Board Size */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4" />
                Board Size
              </Label>
              <div className="flex gap-2 items-center">
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
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="10">10</SelectItem>
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
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Mode-specific options */}
            {mode === "vs-cpu" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Difficulty
                </Label>
                <Select
                  value={aiDifficulty}
                  onValueChange={(v) => setAiDifficulty(v as "easy" | "medium" | "hard")}
                >
                  <SelectTrigger className="border-2 w-full bg-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">
                      😊 Easy - Relaxed gameplay
                    </SelectItem>
                    <SelectItem value="medium">
                      🤔 Medium - Balanced challenge
                    </SelectItem>
                    <SelectItem value="hard">
                      🔥 Hard - Strategic opponent
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "vs-humans" && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Number of Players
                </Label>
                <Select value={humanCount} onValueChange={setHumanCount}>
                  <SelectTrigger className="border-2 w-full bg-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Players</SelectItem>
                    <SelectItem value="3">3 Players</SelectItem>
                    <SelectItem value="4">4 Players</SelectItem>
                    <SelectItem value="5">5 Players</SelectItem>
                    <SelectItem value="6">6 Players</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Players take turns on the same device
                </p>

                {/* Player name inputs */}
                <div className="space-y-2">
                  <Label>Player Names</Label>
                  {Array.from({ length: parseInt(humanCount) }, (_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: [
                            "#ef4444", "#3b82f6", "#22c55e",
                            "#f59e0b", "#a855f7", "#ec4899",
                          ][i],
                        }}
                      />
                      {i === 0 ? (
                        <Input
                          placeholder="Your name"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          className="border-2 flex-1"
                          maxLength={20}
                        />
                      ) : (
                        <Input
                          placeholder={`Player ${i + 1} name`}
                          value={playerNames[i] || ""}
                          onChange={(e) => {
                            const newNames = [...playerNames];
                            newNames[i] = e.target.value;
                            setPlayerNames(newNames);
                          }}
                          className="border-2 flex-1"
                          maxLength={20}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Game Preview */}
            <div className="bg-gray-100 rounded-lg p-3 text-sm">
              <p className="font-bold text-gray-700 mb-1">Game Preview</p>
              <p className="text-gray-600">
                Board: {boardRows}×{boardCols} |{" "}
                {mode === "vs-cpu"
                  ? "You vs CPU"
                  : `${humanCount} Players (local)`}
              </p>
              {mode === "vs-cpu" && (
                <p className="text-gray-600">
                  Difficulty: {aiDifficulty}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-2">
              <button
                className="h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-100 transition-all"
                onClick={() => onNavigate("home")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                disabled={!canStart}
                className={`h-10 px-6 rounded-md inline-flex items-center justify-center font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all ${
                  !canStart
                    ? "opacity-50 cursor-not-allowed"
                    : "transform hover:scale-105"
                }`}
                onClick={handleStart}
              >
                Start Game
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
