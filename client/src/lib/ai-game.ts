import { Cell, GameState, Player, BoardSnapshot, CellSnapshot, PLAYER_COLORS } from "@/types/game";

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

// Create a board snapshot from a board state
const createSnapshot = (
  board: Cell[][],
  changedCells: string[] = []
): CellSnapshot[][] => {
  return board.map((row, r) =>
    row.map((cell, c) => {
      const key = `${r}-${c}`;
      const isChanged = changedCells.includes(key);
      return {
        orbs: cell.orbs,
        ownerId: cell.ownerId,
        animating: isChanged ? undefined : undefined, // Will be set by caller
      };
    })
  );
};

// Generate board snapshots for chain reaction animation
const generateSnapshots = (
  board: Cell[][],
  rows: number,
  cols: number,
  placeRow: number,
  placeCol: number,
  playerId: string
): BoardSnapshot[] => {
  const snapshots: BoardSnapshot[] = [];
  const workingBoard = cloneBoard(board);

  // Snapshot 1: Before place (empty cell or existing orbs)
  snapshots.push({
    board: createSnapshot(workingBoard, []),
    changedCells: [],
  });

  // Place the orb
  workingBoard[placeRow][placeCol].orbs += 1;
  workingBoard[placeRow][placeCol].ownerId = playerId;

  // Snapshot 2: After placing orb
  snapshots.push({
    board: createSnapshot(workingBoard, [`${placeRow}-${placeCol}`]),
    changedCells: [`${placeRow}-${placeCol}`],
  });

  // Process chain reactions, capturing snapshots at each step
  let step = 0;
  const maxSteps = rows * cols * 4;

  while (step < maxSteps) {
    let foundExplosion = false;
    const changedInStep: string[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = workingBoard[r][c];
        if (!cell.ownerId) continue;

        const capacity = getCellCapacity(r, c, rows, cols);
        if (cell.orbs > capacity) {
          foundExplosion = true;
          const explodingPlayer = cell.ownerId;

          // Mark explosion
          changedInStep.push(`${r}-${c}`);

          // Clear the exploding cell
          cell.orbs = 0;
          cell.ownerId = null;

          // Send orbs to neighbors
          const neighbors = getNeighbors(r, c, rows, cols);
          for (const [nr, nc] of neighbors) {
            workingBoard[nr][nc].orbs += 1;
            workingBoard[nr][nc].ownerId = explodingPlayer;
            changedInStep.push(`${nr}-${nc}`);
          }
        }
      }
    }

    if (!foundExplosion) break;

    // Snapshot for this chain reaction step
    snapshots.push({
      board: createSnapshot(workingBoard, changedInStep),
      changedCells: [...changedInStep],
    });

    step++;
  }

  return snapshots;
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
  playerName: string
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
    players.push({
      id: `human-${i}`,
      name: `Player ${i + 1}`,
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
    boardSnapshots: [],
    roundNumber: 1,
  };
};

// Place an orb locally - returns new state with boardSnapshots for animation
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

  // Generate board snapshots for animation
  const boardSnapshots = generateSnapshots(
    game.board,
    game.rows,
    game.cols,
    row,
    col,
    playerId
  );

  // Get the final board state from the last snapshot
  const lastSnapshot = boardSnapshots[boardSnapshots.length - 1];
  const finalBoard: Cell[][] = lastSnapshot.board.map((snapRow) =>
    snapRow.map((snap) => ({
      orbs: snap.orbs,
      ownerId: snap.ownerId,
    }))
  );

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

  // Generate turn events from the final state
  const turnEvents: any[] = [];
  if (boardSnapshots.length > 2) {
    // There were chain reactions
    for (let i = 2; i < boardSnapshots.length; i++) {
      const snapshot = boardSnapshots[i];
      for (const cellKey of snapshot.changedCells) {
        const [r, c] = cellKey.split("-").map(Number);
        const cell = snapshot.board[r][c];
        if (cell.ownerId !== playerId) {
          turnEvents.push({ type: "capture", row: r, col: c, playerId, playerName: player.name });
        }
      }
    }
  }

  return {
    ...game,
    board: finalBoard,
    players: newPlayers,
    currentPlayerIndex: newCurrentPlayerIndex,
    currentPlayer: newPlayers[newCurrentPlayerIndex].id,
    turnEvents,
    boardSnapshots,
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

  if (cell.orbs === capacity - 1) {
    score += 50;
  } else if (cell.orbs === capacity - 2) {
    score += 25;
  }

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

  if (cell.ownerId === playerId && cell.orbs === capacity) {
    score -= 20;
  }

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
