import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Medal, Crown, BarChart3 } from "lucide-react";
import { ChainReactionLogo } from "@/components/chain-reaction-logo";
import { getScoreboard, ScoreboardEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getScoreStats } from "@/lib/score-tracker";

interface ScoreboardViewProps {
  onNavigate: (view: "home") => void;
}

export function ScoreboardView({ onNavigate }: ScoreboardViewProps) {
  const { token, isAuthenticated, user } = useAuth();
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const localStats = getScoreStats();

  useEffect(() => {
    loadScoreboard();
  }, []);

  const loadScoreboard = async () => {
    try {
      const data = await getScoreboard();
      setScoreboard(data);
    } catch {
      setError("Could not load leaderboard");
    } finally {
      setIsLoading(false);
    }
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-gray-400 w-5 text-center">{index + 1}</span>;
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-2">
      <div className="w-full max-w-md">
        <Card className="border-2 md:border-4 border-yellow-400 shadow-2xl">
          <CardHeader className="flex flex-col items-center p-3 md:p-4">
            <ChainReactionLogo className="w-24 md:w-32 h-auto mb-1" />
            <CardTitle className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3 md:p-4">
            {/* Local stats (always shown) */}
            {localStats.gamesPlayed > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                  Your Offline Stats
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">{localStats.gamesPlayed}</div>
                    <div className="text-[10px] text-gray-500">Played</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{localStats.gamesWon}</div>
                    <div className="text-[10px] text-gray-500">Won</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">{localStats.winRate}%</div>
                    <div className="text-[10px] text-gray-500">Win Rate</div>
                  </div>
                </div>
              </div>
            )}

            {/* Online leaderboard */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Online Leaderboard
              </h3>

              {isLoading && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Loading leaderboard...
                </div>
              )}

              {error && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {error}
                </div>
              )}

              {!isLoading && !error && scoreboard.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No games recorded yet. Be the first to win!
                </div>
              )}

              {!isLoading && scoreboard.length > 0 && (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {scoreboard.map((entry, i) => {
                    const isMe = user && entry.uuid === user.uuid;
                    return (
                      <div
                        key={entry.uuid}
                        className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                          isMe
                            ? "bg-emerald-50 border-2 border-emerald-300"
                            : i < 3
                            ? "bg-yellow-50 border border-yellow-200"
                            : "bg-gray-50 border border-gray-100"
                        }`}
                      >
                        <div className="flex-shrink-0 w-7 flex justify-center">
                          {getMedalIcon(i)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold truncate ${
                              isMe ? "text-emerald-700" : ""
                            }`}>
                              {entry.gameName}
                            </span>
                            {isMe && (
                              <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {entry.gamesPlayed} games played
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-yellow-600">
                            {entry.wins} {entry.wins === 1 ? "win" : "wins"}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {entry.winRate}% rate
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Back button */}
            <button
              className="w-full h-10 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-100 transition-all"
              onClick={() => onNavigate("home")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
