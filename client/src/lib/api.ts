const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8081/api";

interface AuthUser {
  id: string;
  uuid: string;
  name: string;
  gameName: string;
  email: string;
  isGuest: boolean;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface ProfileResponse {
  user: AuthUser;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
  };
  recentGames: any[];
}

interface HistoryResponse {
  games: any[];
}

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function registerAccount(data: {
  uuid: string;
  name: string;
  gameName: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Registration failed");
  }
  return res.json();
}

export async function loginAccount(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Login failed");
  }
  return res.json();
}

export async function checkUuid(uuid: string): Promise<{
  exists: boolean;
  token?: string;
  user?: AuthUser;
}> {
  const res = await fetch(`${API_URL}/auth/check/${uuid}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to check UUID");
  return res.json();
}

export async function getProfile(token: string): Promise<ProfileResponse> {
  const res = await fetch(`${API_URL}/auth/profile`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to get profile");
  return res.json();
}

export async function getHistory(token: string): Promise<HistoryResponse> {
  const res = await fetch(`${API_URL}/auth/history`, {
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to get history");
  return res.json();
}

export async function upgradeGuest(
  token: string,
  data: {
    name: string;
    gameName: string;
    email: string;
    password: string;
  }
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/upgrade-guest`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Upgrade failed");
  }
  return res.json();
}

export interface ScoreboardEntry {
  uuid: string;
  gameName: string;
  wins: number;
  gamesPlayed: number;
  winRate: number;
}

export async function getScoreboard(): Promise<ScoreboardEntry[]> {
  const res = await fetch(`${API_URL}/auth/scoreboard`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to get scoreboard");
  const data = await res.json();
  return data.scoreboard;
}

export async function syncScores(
  token: string,
  scores: { id: string; won: boolean; boardSize: string; timestamp: number }[]
): Promise<number[]> {
  const res = await fetch(`${API_URL}/auth/sync-scores`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({ scores }),
  });
  if (!res.ok) throw new Error("Failed to sync scores");
  const data = await res.json();
  return data.synced;
}

export async function saveScore(
  token: string,
  data: { boardSize: string; mode: string; won: boolean }
): Promise<void> {
  const res = await fetch(`${API_URL}/auth/save-score`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save score");
}
