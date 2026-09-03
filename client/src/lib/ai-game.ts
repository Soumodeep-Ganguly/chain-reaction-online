import { Cell, GameState, Player, AnimationSequence, AnimationFrame, FlyingOrb, PLAYER_COLORS } from "@/types/game";

// Get the capacity of a cell based on its position
export const getCellCapacity = (
  row: number,
  col: number,
  rows: number,
  cols: number
): number => {
  const isTop = row === 0;
  const isBottom = row === rows - 1;
  const isLeft = col === 0;
  const isRight = col === cols - 1;

  const adjacentCount =
    (isTop ? 0 : 1) + (isBottom ? 0 : 1) + (isLeft ? 0 : 1) + (isRight ? 0 : 1);

  // Corner: 1, Edge: 2, Inner: 3
  return adjacentCount - 1;
};

// Create an empty board
export const createBoard = (rows: number, cols: number): Cell[][] => {
  const board: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ orbs: 0, ownerId: null });
    }
    board.push(row);
  }
  return board;
};

// Get orthogonal neighbors
const getNeighbors = (
  row: number,
  col: number,
  rows: number,
  cols: number
): [number, number][] => {
  const neighbors: [number, number][] = [];
  if (row > 0) neighbors.push([row - 1, col]);
  if (row < rows - 1) neighbors.push([row + 1, col]);
  if (col > 0) neighbors.push([row, col - 1]);
  if (col < cols - 1) neighbors.push([row, col + 1]);
  return neighbors;
};

// Deep clone a board
const cloneBoard = (board: Cell[][]): Cell[][] => {
  return board.map((row) => row.map((cell) => ({ ...cell })));
};

// Generate animation sequence for a move
export const generateAnimationSequence = (
  board: Cell[][],
  rows: number,
  cols: number,
  placeRow: number,
  placeCol: number,
  playerId: string,
  getPlayerColor: (id: string) => string
): AnimationSequence => {
  const frames: AnimationFrame[] = [];
  const workingBoard = cloneBoard(board);

  // Frame 1: Place the orb
  workingBoard[placeRow][placeCol].orbs += 1;
  workingBoard[placeRow][placeCol].ownerId = playerId;

  frames.push({
    explodingCells: [],
    flyingOrbs: [],
    arrivedCells: [{ row: placeRow, col: placeCol, playerId, orbCount: workingBoard[placeRow][placeCol].orbs }],
    capturedCells: [],
  });

  // Process chain reactions
  let step = 0;
  const maxSteps = rows * cols * 4;

  while (step < maxSteps) {
    // Find all cells that need to explode in this step
    const cellsToExplode: { row: number; col: number; playerId: string }[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = workingBoard[r][c];
        if (!cell.ownerId) continue;

        const capacity = getCellCapacity(r, c, rows, cols);
        if (cell.orbs > capacity) {
          cellsToExplode.push({ row: r, col: c, playerId: cell.ownerId });
        }
      }
    }

    if (cellsToExplode.length === 0) break;

    // Frame: Show cells exploding
    const flyingOrbs: FlyingOrb[] = [];
    const arrivedCells: { row: number; col: number; playerId: string; orbCount: number }[] = [];
    const capturedCells: { row: number; col: number; playerId: string }[] = [];

    for (const exploding of cellsToExplode) {
      const { row: r, col: c, playerId: explodingPlayer } = exploding;
      const color = getPlayerColor(explodingPlayer);

      // Remove orbs from exploding cell
      workingBoard[r][c].orbs = 0;
      workingBoard[r][c].ownerId = null;

      // Send orbs to neighbors
      const neighbors = getNeighbors(r, c, rows, cols);
      for (const [nr, nc] of neighbors) {
        const prevOwner = workingBoard[nr][nc].ownerId;

        // Add orb to neighbor
        workingBoard[nr][nc].orbs += 1;
        workingBoard[nr][nc].ownerId = explodingPlayer;

        // Track the flying orb
        flyingOrbs.push({
          id: `orb-${step}-${r}-${c}-${nr}-${nc}`,
          fromRow: r,
          fromCol: c,
          toRow: nr,
          toCol: nc,
          color,
        });

        // Track arrived cell
        arrivedCells.push({
          row: nr,
          col: nc,
          playerId: explodingPlayer,
          orbCount: workingBoard[nr][nc].orbs,
        });

        // Track capture if this was opponent's cell
        if (prevOwner && prevOwner !== explodingPlayer) {
          capturedCells.push({ row: nr, col: nc, playerId: explodingPlayer });
        }
      }
    }

    // Add frame for this explosion step
    frames.push({
      explodingCells: cellsToExplode,
      flyingOrbs,
      arrivedCells,
      capturedCells,
    });

    step++;
  }

  return {
    frames,
    finalBoard: workingBoard,
  };
};

// Count orbs for a player
export const countPlayerOrbs = (
  board: Cell[][],
  playerId: string
): number => {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.ownerId === playerId) {
        count += cell.orbs;
      }
    }
  }
  return count;
};

// Count cells for a player
export const countPlayerCells = (
  board: Cell[][],
  playerId: string
): number => {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.ownerId === playerId) {
        count++;
      }
    }
  }
  return count;
};

// Create a new offline game
export const createOfflineGame = (
  rows: number,
  cols: number,
  playerCount: number,
  aiCount: number,
  playerName: string,
  playerNames?: string[]
): GameState => {
  const players: Player[] = [];

  // Add human player
  players.push({
    id: "human-0",
    name: playerName,
    color: PLAYER_COLORS[0],
    active: true,
    hasMoved: false,
  });

  // Add AI players
  for (let i = 0; i < aiCount; i++) {
    players.push({
      id: `ai-${i}`,
      name: `CPU ${i + 1}`,
      color: PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length],
      active: true,
      hasMoved: false,
    });
  }

  // Add other human players (for local multiplayer)
  for (let i = 1; i < playerCount - aiCount; i++) {
    const customName = playerNames?.[i];
    players.push({
      id: `human-${i}`,
      name: customName || `Player ${i + 1}`,
      color: PLAYER_COLORS[(aiCount + i) % PLAYER_COLORS.length],
      active: true,
      hasMoved: false,
    });
  }

  return {
    roomId: "offline",
    players,
    board: createBoard(rows, cols),
    rows,
    cols,
    currentPlayerIndex: 0,
    currentPlayer: players[0].id,
    maxPlayers: players.length,
    started: true,
    winner: undefined,
    turnEvents: [],
    roundNumber: 1,
  };
};

// Place an orb locally with animation sequence
export const placeOrbLocal = (
  game: GameState,
  playerId: string,
  row: number,
  col: number
): GameState | null => {
  if (!game.started) return null;

  const player = game.players.find((p) => p.id === playerId);
  if (!player || !player.active) return null;

  if (game.players[game.currentPlayerIndex].id !== playerId) return null;

  if (row < 0 || row >= game.rows || col < 0 || col >= game.cols) return null;

  const cell = game.board[row][col];

  if (cell.ownerId !== null && cell.ownerId !== playerId) return null;

  // Helper to get player color
  const getPlayerColor = (id: string): string => {
    return game.players.find((p) => p.id === id)?.color || "#6b7280";
  };

  // Generate animation sequence
  const animationSequence = generateAnimationSequence(
    game.board,
    game.rows,
    game.cols,
    row,
    col,
    playerId,
    getPlayerColor
  );

  // Use the final board from the animation
  const finalBoard = animationSequence.finalBoard;

  // Update players
  const newPlayers = game.players.map((p) => {
    if (p.id === playerId) {
      return { ...p, hasMoved: true };
    }
    return { ...p };
  });

  // Check for eliminations
  for (const p of newPlayers) {
    if (!p.active || !p.hasMoved) continue;
    const orbCount = countPlayerOrbs(finalBoard, p.id);
    if (orbCount === 0) {
      p.active = false;
    }
  }

  // Check for winner
  const activePlayers = newPlayers.filter((p) => p.active);
  let winner: Player | undefined;
  if (activePlayers.length === 1) {
    winner = activePlayers[0];
  }

  // Advance turn if no winner
  let newCurrentPlayerIndex = game.currentPlayerIndex;
  if (!winner) {
    let nextIndex = game.currentPlayerIndex;
    let attempts = 0;
    do {
      nextIndex = (nextIndex + 1) % newPlayers.length;
      attempts++;
    } while (!newPlayers[nextIndex].active && attempts < newPlayers.length);
    newCurrentPlayerIndex = nextIndex;
  }

  return {
    ...game,
    board: finalBoard,
    players: newPlayers,
    currentPlayerIndex: newCurrentPlayerIndex,
    currentPlayer: newPlayers[newCurrentPlayerIndex].id,
    turnEvents: [],
    animationSequence,
    winner,
  };
};

// AI Move Logic
type AIDifficulty = "easy" | "medium" | "hard";

const scoreMove = (
  game: GameState,
  playerId: string,
  row: number,
  col: number,
  difficulty: AIDifficulty
): number => {
  const cell = game.board[row][col];
  const capacity = getCellCapacity(row, col, game.rows, game.cols);

  if (cell.ownerId !== null && cell.ownerId !== playerId) return -1000;

  let score = 0;
  score += 10;

  if (cell.orbs === capacity - 1) score += 50;
  else if (cell.orbs === capacity - 2) score += 25;

  if (cell.ownerId === null) {
    const neighbors = getNeighbors(row, col, game.rows, game.cols);
    let opponentCells = 0;
    let ownCells = 0;
    for (const [nr, nc] of neighbors) {
      const neighborCell = game.board[nr][nc];
      if (neighborCell.ownerId && neighborCell.ownerId !== playerId) {
        opponentCells++;
      } else if (neighborCell.ownerId === playerId) {
        ownCells++;
      }
    }
    score += opponentCells * 30;
    score += ownCells * 10;
  }

  if (cell.ownerId === playerId && cell.orbs === capacity) score -= 20;
  if (capacity === 1) score += 15;
  if (capacity === 2) score += 8;

  if (difficulty === "easy") score += Math.random() * 40;
  else if (difficulty === "medium") score += Math.random() * 15;

  return score;
};

export const getAIMove = (
  game: GameState,
  playerId: string,
  difficulty: AIDifficulty = "medium"
): { row: number; col: number } | null => {
  const validMoves: { row: number; col: number; score: number }[] = [];

  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      const cell = game.board[r][c];
      if (cell.ownerId === null || cell.ownerId === playerId) {
        const score = scoreMove(game, playerId, r, c, difficulty);
        if (score > -1000) {
          validMoves.push({ row: r, col: c, score });
        }
      }
    }
  }

  if (validMoves.length === 0) return null;

  validMoves.sort((a, b) => b.score - a.score);

  if (difficulty === "easy" && Math.random() < 0.3) {
    const idx = Math.floor(Math.random() * validMoves.length);
    return { row: validMoves[idx].row, col: validMoves[idx].col };
  }

  if (difficulty === "medium" && Math.random() < 0.2) {
    const topMoves = validMoves.slice(0, Math.min(3, validMoves.length));
    const idx = Math.floor(Math.random() * topMoves.length);
    return { row: topMoves[idx].row, col: topMoves[idx].col };
  }

  return { row: validMoves[0].row, col: validMoves[0].col };
};

export const isAI = (playerId: string): boolean => {
  return playerId.startsWith("ai-");
};
