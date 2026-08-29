import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trophy, Gamepad2, BarChart3, LogOut, UserPlus } from "lucide-react";
import { ChainReactionLogo } from "@/components/chain-reaction-logo";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface ProfileViewProps {
  onNavigate: (
    view: "home" | "create-room" | "join-room" | "game" | "profile" | "auth"
  ) => void;
}

export function ProfileView({ onNavigate }: ProfileViewProps) {
  const {
    user,
    stats,
    recentGames,
    refreshProfile,
    logout,
    upgradeGuestAccount,
    uuid,
  } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeName, setUpgradeName] = useState(user?.name || "");
  const [upgradeGameName, setUpgradeGameName] = useState(
    user?.gameName || ""
  );
  const [upgradeEmail, setUpgradeEmail] = useState("");
  const [upgradePassword, setUpgradePassword] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    refreshProfile();
  }, []);

  const handleUpgrade = async () => {
    if (
      !upgradeName.trim() ||
      !upgradeGameName.trim() ||
      !upgradeEmail.trim() ||
      !upgradePassword.trim()
    ) {
      toast.error("Please fill in all fields");
      return;
    }
    if (upgradePassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsUpgrading(true);
    try {
      await upgradeGuestAccount(
        upgradeName,
        upgradeGameName,
        upgradeEmail,
        upgradePassword
      );
      toast.success("Account created! You're no longer a guest.");
      setShowUpgrade(false);
    } catch (err: any) {
      toast.error(err.message || "Upgrade failed");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    onNavigate("home");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-4 border-emerald-400 shadow-2xl">
          <CardHeader className="flex flex-col items-center">
            <ChainReactionLogo className="w-32 h-auto mb-2" />
            <CardTitle className="text-2xl font-extrabold">
              {user?.gameName || user?.name || "Guest"}
            </CardTitle>
            {user?.isGuest && (
              <p className="text-sm text-gray-500 mt-1">Guest Account</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Info */}
            <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Game Name</span>
                <span className="font-bold">{user?.gameName}</span>
              </div>
              {!user?.isGuest && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email</span>
                  <span>{user?.email}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">UUID</span>
                <span className="font-mono text-xs">
                  {uuid.slice(0, 12)}...
                </span>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <Gamepad2
                    className="mx-auto mb-1 text-blue-500"
                    size={20}
                  />
                  <div className="text-2xl font-bold">
                    {stats.gamesPlayed}
                  </div>
                  <div className="text-xs text-gray-500">Played</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <Trophy
                    className="mx-auto mb-1 text-green-500"
                    size={20}
                  />
                  <div className="text-2xl font-bold">{stats.gamesWon}</div>
                  <div className="text-xs text-gray-500">Won</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <BarChart3
                    className="mx-auto mb-1 text-purple-500"
                    size={20}
                  />
                  <div className="text-2xl font-bold">
                    {stats.winRate}%
                  </div>
                  <div className="text-xs text-gray-500">Win Rate</div>
                </div>
              </div>
            )}

            {/* Recent Games */}
            {recentGames && recentGames.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-gray-600">
                  Recent Games
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {recentGames.map((game: any, i: number) => (
                    <div
                      key={game._id || i}
                      className="bg-gray-50 p-2 rounded-lg text-sm flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold">
                          {game.winnerGameName}
                        </span>
                        <span className="text-gray-500 ml-1">won</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(game.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upgrade to Account */}
            {user?.isGuest && !showUpgrade && (
              <button
                className="w-full h-10 px-6 rounded-md inline-flex items-center justify-center gap-2 font-bold bg-green-600 hover:bg-green-700 text-white transition-all"
                onClick={() => setShowUpgrade(true)}
              >
                <UserPlus className="h-4 w-4" />
                Create Account
              </button>
            )}

            {showUpgrade && (
              <div className="space-y-3 bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-sm font-bold text-green-700">
                  Upgrade to a full account
                </p>
                <div className="space-y-2">
                  <Input
                    placeholder="Your Name"
                    value={upgradeName}
                    onChange={(e) => setUpgradeName(e.target.value)}
                    className="border-2"
                  />
                  <Input
                    placeholder="Game Name (what others see)"
                    value={upgradeGameName}
                    onChange={(e) => setUpgradeGameName(e.target.value)}
                    className="border-2"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={upgradeEmail}
                    onChange={(e) => setUpgradeEmail(e.target.value)}
                    className="border-2"
                  />
                  <Input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={upgradePassword}
                    onChange={(e) => setUpgradePassword(e.target.value)}
                    className="border-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-bold bg-green-600 hover:bg-green-700 text-white transition-all"
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? "Creating..." : "Create Account"}
                  </button>
                  <button
                    className="flex-1 h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-100 transition-all"
                    onClick={() => setShowUpgrade(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                className="h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-100 transition-all"
                onClick={() => onNavigate("home")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              {!user?.isGuest ? (
                <button
                  className="h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-red-300 bg-white text-red-600 hover:bg-red-50 transition-all"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              ) : (
                <button
                  className="h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-green-500 bg-white text-green-700 hover:bg-green-50 transition-all"
                  onClick={() => onNavigate("auth")}
                >
                  Login / Register
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
