export interface Cell {
  orbs: number;
  ownerId: string | null;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  active: boolean;
  hasMoved: boolean;
}

export interface TurnEvent {
  type: "place" | "explosion" | "capture" | "elimination" | "win";
  row?: number;
  col?: number;
  playerId?: string;
  playerName?: string;
  chainReactionStep?: number;
}

// Snapshot of a single cell for animation playback
export interface CellSnapshot {
  orbs: number;
  ownerId: string | null;
  animating?: "explode" | "capture" | "arrive" | "place";
}

// A board snapshot at a point in the chain reaction
export interface BoardSnapshot {
  board: CellSnapshot[][];
  changedCells: string[]; // "row-col" keys of cells that changed
}

export interface GameState {
  roomId: string;
  players: Player[];
  board: Cell[][];
  rows: number;
  cols: number;
  currentPlayerIndex: number;
  currentPlayer: string;
  maxPlayers: number;
  started: boolean;
  winner?: Player;
  turnEvents: TurnEvent[];
  boardSnapshots?: BoardSnapshot[];
  roundNumber: number;
}

export const PLAYER_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber/yellow
  "#a855f7", // purple
  "#ec4899", // pink
];
