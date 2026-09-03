import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { ChainReactionLogo } from "@/components/chain-reaction-logo";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface AuthViewProps {
  onNavigate: (
    view: "home" | "create-room" | "join-room" | "game" | "profile"
  ) => void;
}

export function AuthView({ onNavigate }: AuthViewProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [gameName, setGameName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (mode === "register") {
      if (!name.trim() || !gameName.trim()) {
        toast.error("Please fill in all fields");
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("Logged in successfully!");
      } else {
        await register(name, gameName, email, password);
        toast.success("Account created successfully!");
      }
      onNavigate("home");
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2">
      <div className="w-full max-w-md">
        <Card className="border-4 border-emerald-400 shadow-2xl">
          <CardHeader className="flex flex-col items-center p-3 md:p-4">
            <ChainReactionLogo className="w-32 h-auto mb-2" />
            <CardTitle className="text-2xl font-extrabold">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3 md:p-4">
            {/* Mode tabs */}
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${
                  mode === "login"
                    ? "bg-gray-700 text-white"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setMode("login")}
              >
                Login
              </button>
              <button
                className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all ${
                  mode === "register"
                    ? "bg-gray-700 text-white"
                    : "text-gray-600 hover:text-gray-800"
                }`}
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </div>

            {mode === "register" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-2"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gameName">Game Name</Label>
                  <Input
                    id="gameName"
                    placeholder="What other players see you as"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    className="border-2"
                    maxLength={20}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={
                  mode === "register"
                    ? "At least 6 characters"
                    : "Enter your password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-2"
              />
            </div>

            <button
              className="w-full h-10 px-6 rounded-md inline-flex items-center justify-center text-lg font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading
                ? mode === "login"
                  ? "Logging in..."
                  : "Creating account..."
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </button>

            <div className="flex justify-center pt-2">
              <button
                className="h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
                onClick={() => onNavigate("home")}
              >
                Continue as Guest
              </button>
            </div>

            <div className="flex justify-start pt-2">
              <button
                className="h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-100 transition-all"
                onClick={() => onNavigate("home")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
