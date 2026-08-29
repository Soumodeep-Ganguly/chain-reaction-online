import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChainReactionLogo } from "@/components/chain-reaction-logo";
import { useAuth } from "@/lib/auth-context";
import { User, LogIn, Wifi, WifiOff, Users, Gamepad2 } from "lucide-react";

interface HomeViewProps {
  onNavigate: (
    view:
      | "home"
      | "create-room"
      | "join-room"
      | "game"
      | "profile"
      | "auth"
      | "offline-setup"
  ) => void;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-3 md:p-4">
      <div className="w-full max-w-md">
        <Card className="border-2 md:border-4 border-emerald-400 shadow-2xl">
          <CardHeader className="flex flex-col items-center p-4 md:p-6">
            <ChainReactionLogo className="w-32 md:w-48 h-auto mb-2 md:mb-4" />
            <CardTitle className="text-2xl md:text-3xl font-extrabold text-center">
              Chain Reaction
            </CardTitle>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              Multiplayer Strategy Game
            </p>
            {!isLoading && user && (
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                Playing as{" "}
                <span className="font-bold">{user.gameName}</span>
                {user.isGuest && " (Guest)"}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
            {/* Game Features Banner */}
            <div className="bg-gradient-to-r from-emerald-100 to-cyan-100 rounded-lg p-2 md:p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-xs md:text-sm font-bold text-emerald-700">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                2-6 Players • Explosive Chain Reactions!
              </div>
            </div>

            {/* Online Section */}
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-600">
                <Wifi className="h-3 w-3 md:h-4 md:w-4 text-emerald-500" />
                Play Online
              </div>

              <button
                className="w-full min-h-[44px] px-4 md:px-6 rounded-md inline-flex items-center justify-center gap-2 text-base md:text-lg font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                onClick={() => onNavigate("create-room")}
              >
                <Users className="h-4 w-4 md:h-5 md:w-5" />
                Create Room
              </button>

              <button
                className="w-full min-h-[44px] px-4 md:px-6 rounded-md inline-flex items-center justify-center gap-2 text-base md:text-lg font-bold transition-all bg-cyan-600 text-white hover:bg-cyan-700 active:scale-95"
                onClick={() => onNavigate("join-room")}
              >
                <Gamepad2 className="h-4 w-4 md:h-5 md:w-5" />
                Join Room
              </button>

              <p className="text-[10px] md:text-xs text-gray-500 text-center">
                Create a room and share the code with friends, or join an existing room
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs md:text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Offline Section */}
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-600">
                <WifiOff className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
                Play Offline
              </div>

              <button
                className="w-full min-h-[44px] px-4 md:px-6 rounded-md inline-flex items-center justify-center gap-2 text-base md:text-lg font-bold transition-all bg-orange-500 text-white hover:bg-orange-600 active:scale-95"
                onClick={() => onNavigate("offline-setup")}
              >
                <WifiOff className="h-4 w-4 md:h-5 md:w-5" />
                Play Offline
              </button>

              <p className="text-[10px] md:text-xs text-gray-500 text-center">
                vs Computer or local multiplayer • 2-6 players on same device
              </p>
            </div>

            {/* Account Section */}
            <div className="flex gap-2 md:gap-3 pt-2">
              <button
                className="flex-1 min-h-[44px] px-3 md:px-4 rounded-md inline-flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm font-bold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-100 transition-all"
                onClick={() => onNavigate("profile")}
              >
                <User className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Profile
              </button>
              {!isAuthenticated && !isLoading && (
                <button
                  className="flex-1 min-h-[44px] px-3 md:px-4 rounded-md inline-flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm font-bold border-2 border-green-500 bg-white text-green-700 hover:bg-green-50 transition-all"
                  onClick={() => onNavigate("auth")}
                >
                  <LogIn className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Login
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
