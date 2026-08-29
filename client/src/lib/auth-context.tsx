import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getPlayerUuid } from "./uuid";
import {
  checkUuid,
  loginAccount,
  registerAccount,
  getProfile,
  upgradeGuest,
} from "./api";

export interface AuthUser {
  id: string;
  uuid: string;
  name: string;
  gameName: string;
  email: string;
  isGuest: boolean;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  stats: UserStats | null;
  recentGames: any[];
  isLoading: boolean;
  isAuthenticated: boolean;
  uuid: string;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    gameName: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  upgradeGuestAccount: (
    name: string,
    gameName: string,
    email: string,
    password: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "chain_reaction_auth_token";
const USER_KEY = "chain_reaction_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uuid] = useState(() => getPlayerUuid());

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }

    const autoLogin = async () => {
      try {
        const result = await checkUuid(uuid);
        if (result.exists && result.token && result.user) {
          setToken(result.token);
          setUser(result.user);
          localStorage.setItem(TOKEN_KEY, result.token);
          localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        } else if (!storedToken) {
          const guestUser: AuthUser = {
            id: uuid,
            uuid,
            name: `Guest_${uuid.slice(0, 6)}`,
            gameName: `Guest_${uuid.slice(0, 6)}`,
            email: "",
            isGuest: true,
          };
          setUser(guestUser);
          localStorage.setItem(USER_KEY, JSON.stringify(guestUser));
        }
      } catch {
        if (!storedUser) {
          const guestUser: AuthUser = {
            id: uuid,
            uuid,
            name: `Guest_${uuid.slice(0, 6)}`,
            gameName: `Guest_${uuid.slice(0, 6)}`,
            email: "",
            isGuest: true,
          };
          setUser(guestUser);
          localStorage.setItem(USER_KEY, JSON.stringify(guestUser));
        }
      } finally {
        setIsLoading(false);
      }
    };

    autoLogin();
  }, [uuid]);

  const login = async (email: string, password: string) => {
    const result = await loginAccount({ email, password });
    setToken(result.token);
    setUser(result.user);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
  };

  const register = async (
    name: string,
    gameName: string,
    email: string,
    password: string
  ) => {
    const result = await registerAccount({
      uuid,
      name,
      gameName,
      email,
      password,
    });
    setToken(result.token);
    setUser(result.user);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setStats(null);
    setRecentGames([]);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const profile = await getProfile(token);
      setUser(profile.user);
      setStats(profile.stats);
      setRecentGames(profile.recentGames);
      localStorage.setItem(USER_KEY, JSON.stringify(profile.user));
    } catch {
      // Token might be expired
    }
  };

  const upgradeGuestAccount = async (
    name: string,
    gameName: string,
    email: string,
    password: string
  ) => {
    if (!token) return;
    const result = await upgradeGuest(token, {
      name,
      gameName,
      email,
      password,
    });
    setToken(result.token);
    setUser(result.user);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        stats,
        recentGames,
        isLoading,
        isAuthenticated: !!user && !user.isGuest,
        uuid,
        login,
        register,
        logout,
        refreshProfile,
        upgradeGuestAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
