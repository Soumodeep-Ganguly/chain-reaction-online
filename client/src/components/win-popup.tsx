import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trophy, UserPlus, X, Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { saveOfflineScore } from "@/lib/score-tracker";
import { saveScore } from "@/lib/api";
import { toast } from "sonner";

interface WinPopupProps {
  winnerName: string;
  isPlayerWin: boolean;
  boardSize: string;
  playerCount: number;
  mode: string;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function WinPopup({
  winnerName,
  isPlayerWin,
  boardSize,
  playerCount,
  mode,
  onPlayAgain,
  onExit,
}: WinPopupProps) {
  const { user, isAuthenticated, register, token } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const [name, setName] = useState("");
  const [gameName, setGameName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSaveScore = async () => {
    if (!isPlayerWin) return;

    if (isAuthenticated && token) {
      // Save directly to DB for authenticated users
      try {
        await saveScore(token, { boardSize, mode, won: true });
        toast.success("Score saved to your account!");
      } catch {
        // Fallback to localStorage if API fails
        saveOfflineScore({
          id: Date.now().toString(),
          winnerName: user?.gameName || "Player",
          boardSize,
          playerCount,
          mode,
          won: true,
          timestamp: Date.now(),
        });
        toast.success("Score saved locally!");
      }
    } else {
      // Guest: save to localStorage
      saveOfflineScore({
        id: Date.now().toString(),
        winnerName: user?.gameName || "Player",
        boardSize,
        playerCount,
        mode,
        won: true,
        timestamp: Date.now(),
      });
      toast.success("Score saved locally!");
    }
  };

  const handleSignup = async () => {
    if (!name.trim() || !gameName.trim() || !email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsRegistering(true);
    try {
      await register(name, gameName, email, password);
      toast.success("Account created! Your scores are now tracked.");
      setShowSignup(false);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm border-4 border-yellow-400 shadow-2xl">
        <CardHeader className="flex flex-col items-center p-4">
          <div className="text-5xl mb-2">
            {isPlayerWin ? "🏆" : "💀"}
          </div>
          <CardTitle className="text-xl md:text-2xl font-extrabold text-center">
            {isPlayerWin ? "You Won!" : `${winnerName} Won!`}
          </CardTitle>
          {isPlayerWin && (
            <div className="flex items-center gap-1 mt-1">
              {[...Array(3)].map((_, i) => (
                <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {/* Score saved info */}
          {isPlayerWin && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-sm text-yellow-800 font-medium">
                ⭐ Victory recorded!
              </p>
            </div>
          )}

          {/* Signup prompt for guests */}
          {isPlayerWin && !isAuthenticated && !showSignup && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-800 font-medium mb-2">
                Want to track your wins on the leaderboard?
              </p>
              <button
                className="w-full h-9 rounded-md inline-flex items-center justify-center gap-2 text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                onClick={() => setShowSignup(true)}
              >
                <UserPlus className="h-4 w-4" />
                Create Free Account
              </button>
            </div>
          )}

          {/* Signup form */}
          {showSignup && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-emerald-800">Create Account</p>
                <button onClick={() => setShowSignup(false)}>
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <Input
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-2 h-9 text-sm"
              />
              <Input
                placeholder="Game Name (what others see)"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="border-2 h-9 text-sm"
              />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2 h-9 text-sm"
              />
              <Input
                type="password"
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-2 h-9 text-sm"
              />
              <button
                className="w-full h-9 rounded-md inline-flex items-center justify-center gap-2 text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-50"
                onClick={handleSignup}
                disabled={isRegistering}
              >
                {isRegistering ? "Creating..." : "Create Account & Track Scores"}
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              className="flex-1 h-10 rounded-md inline-flex items-center justify-center gap-2 font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all transform hover:scale-105"
              onClick={() => {
                handleSaveScore();
                onPlayAgain();
              }}
            >
              <Trophy className="h-4 w-4" />
              Play Again
            </button>
            <button
              className="flex-1 h-10 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-100 transition-all"
              onClick={() => {
                handleSaveScore();
                onExit();
              }}
            >
              Exit
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
