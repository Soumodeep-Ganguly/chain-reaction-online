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

// A single orb flying from one cell to another
export interface FlyingOrb {
  id: string;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  color: string;
}

// One frame in the chain reaction animation
export interface AnimationFrame {
  // Cells that are exploding (glowing)
  explodingCells: { row: number; col: number; playerId: string }[];
  // Orbs that are flying from source to destination
  flyingOrbs: FlyingOrb[];
  // Cells that just received orbs (to show them appearing)
  arrivedCells: { row: number; col: number; playerId: string; orbCount: number }[];
  // Cells being captured
  capturedCells: { row: number; col: number; playerId: string }[];
}

// Complete animation sequence for a move
export interface AnimationSequence {
  frames: AnimationFrame[];
  // Final board state after all reactions
  finalBoard: Cell[][];
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
  animationSequence?: AnimationSequence;
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
