export interface OfflineScore {
  id: string;
  winnerName: string;
  boardSize: string;
  playerCount: number;
  mode: string; // "vs-cpu" or "vs-players"
  won: boolean;
  timestamp: number;
  synced?: boolean;
}

const SCORES_KEY = "chain_reaction_offline_scores";

export function saveOfflineScore(score: OfflineScore): void {
  try {
    const existing = getOfflineScores();
    existing.push(score);
    localStorage.setItem(SCORES_KEY, JSON.stringify(existing));
  } catch {
    // localStorage might be full
  }
}

export function getOfflineScores(): OfflineScore[] {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getUnsyncedScores(): OfflineScore[] {
  return getOfflineScores().filter((s) => !s.synced);
}

export function getScoreStats() {
  const scores = getOfflineScores();
  const gamesPlayed = scores.length;
  const gamesWon = scores.filter((s) => s.won).length;
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  return { gamesPlayed, gamesWon, winRate, scores };
}

export function markScoresSynced(timestamps: number[]): void {
  try {
    const scores = getOfflineScores();
    const synced = scores.map((s) =>
      timestamps.includes(s.timestamp) ? { ...s, synced: true } : s
    );
    localStorage.setItem(SCORES_KEY, JSON.stringify(synced));
  } catch {
    // ignore
  }
}
