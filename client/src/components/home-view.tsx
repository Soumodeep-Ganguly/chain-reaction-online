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
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-4 border-emerald-400 shadow-2xl">
          <CardHeader className="flex flex-col items-center">
            <ChainReactionLogo className="w-48 h-auto mb-4" />
            <CardTitle className="text-3xl font-extrabold text-center">
              Chain Reaction
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Multiplayer Strategy Game
            </p>
            {!isLoading && user && (
              <p className="text-sm text-gray-500 mt-1">
                Playing as{" "}
                <span className="font-bold">{user.gameName}</span>
                {user.isGuest && " (Guest)"}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Game Features Banner */}
            <div className="bg-gradient-to-r from-emerald-100 to-cyan-100 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-700">
                <Users className="h-4 w-4" />
                2-6 Players • Explosive Chain Reactions!
              </div>
            </div>

            {/* Online Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                <Wifi className="h-4 w-4 text-emerald-500" />
                Play Online
              </div>

              <button
                className="w-full h-10 px-6 rounded-md inline-flex items-center justify-center gap-2 text-lg font-bold transition-all bg-emerald-600 text-white hover:bg-emerald-700 transform hover:scale-105"
                onClick={() => onNavigate("create-room")}
              >
                <Users className="h-5 w-5" />
                Create Room
              </button>

              <button
                className="w-full h-10 px-6 rounded-md inline-flex items-center justify-center gap-2 text-lg font-bold transition-all bg-cyan-600 text-white hover:bg-cyan-700 transform hover:scale-105"
                onClick={() => onNavigate("join-room")}
              >
                <Gamepad2 className="h-5 w-5" />
                Join Room
              </button>

              <p className="text-xs text-gray-500 text-center">
                Create a room and share the code with friends, or join an existing room
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Offline Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                <WifiOff className="h-4 w-4 text-orange-500" />
                Play Offline
              </div>

              <button
                className="w-full h-10 px-6 rounded-md inline-flex items-center justify-center gap-2 text-lg font-bold transition-all bg-orange-500 text-white hover:bg-orange-600 transform hover:scale-105"
                onClick={() => onNavigate("offline-setup")}
              >
                <WifiOff className="h-5 w-5" />
                Play vs Computer
              </button>

              <p className="text-xs text-gray-500 text-center">
                Local multiplayer with AI opponents • 2-6 players on same device
              </p>
            </div>

            {/* Account Section */}
            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-100 transition-all"
                onClick={() => onNavigate("profile")}
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              {!isAuthenticated && !isLoading && (
                <button
                  className="flex-1 h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-green-500 bg-white text-green-700 hover:bg-green-50 transition-all"
                  onClick={() => onNavigate("auth")}
                >
                  <LogIn className="h-4 w-4" />
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
