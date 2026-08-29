import { Cell, GameState, Player, TurnEvent, PLAYER_COLORS } from "@/types/game";

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
    (isTop ? 0 : 1) +
    (isBottom ? 0 : 1) +
    (isLeft ? 0 : 1) +
    (isRight ? 0 : 1);

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
export const getNeighbors = (
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

// Process explosions and chain reactions (returns new board and events)
const processExplosions = (
  board: Cell[][],
  rows: number,
  cols: number,
  events: TurnEvent[]
): { board: Cell[][]; events: TurnEvent[] } => {
  const newBoard = cloneBoard(board);
  const newEvents = [...events];
  let step = 0;
  const maxSteps = rows * cols * 4;

  while (step < maxSteps) {
    let foundExplosion = false;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = newBoard[r][c];
        if (!cell.ownerId) continue;

        const capacity = getCellCapacity(r, c, rows, cols);
        if (cell.orbs > capacity) {
          foundExplosion = true;
          const explodingPlayer = cell.ownerId;

          cell.orbs = 0;
          cell.ownerId = null;

          newEvents.push({
            type: "explosion",
            row: r,
            col: c,
            playerId: explodingPlayer,
            chainReactionStep: step,
          });

          const neighbors = getNeighbors(r, c, rows, cols);
          for (const [nr, nc] of neighbors) {
            const neighborCell = newBoard[nr][nc];
            const prevOwner = neighborCell.ownerId;

            neighborCell.orbs += 1;
            neighborCell.ownerId = explodingPlayer;

            if (prevOwner && prevOwner !== explodingPlayer) {
              newEvents.push({
                type: "capture",
                row: nr,
                col: nc,
                playerId: explodingPlayer,
                chainReactionStep: step,
              });
            }
          }
        }
      }
    }

    if (!foundExplosion) break;
    step++;
  }

  return { board: newBoard, events: newEvents };
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
    roundNumber: 1,
  };
};

// Place an orb locally
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

  // Clone the board for immutability
  const newBoard = cloneBoard(game.board);
  newBoard[row][col].orbs += 1;
  newBoard[row][col].ownerId = playerId;

  // Initialize events
  const events: TurnEvent[] = [
    { type: "place", row, col, playerId, playerName: player.name },
  ];

  // Process explosions
  const { board: finalBoard, events: allEvents } = processExplosions(
    newBoard,
    game.rows,
    game.cols,
    events
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
      allEvents.push({
        type: "elimination",
        playerId: p.id,
        playerName: p.name,
      });
    }
  }

  // Check for winner
  const activePlayers = newPlayers.filter((p) => p.active);
  let winner: Player | undefined;
  if (activePlayers.length === 1) {
    winner = activePlayers[0];
    allEvents.push({
      type: "win",
      playerId: winner.id,
      playerName: winner.name,
    });
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
    turnEvents: allEvents,
    winner,
  };
};

// AI Move Logic
// AI difficulty levels: easy, medium, hard
type AIDifficulty = "easy" | "medium" | "hard";

// Score a potential move for the AI
const scoreMove = (
  game: GameState,
  playerId: string,
  row: number,
  col: number,
  difficulty: AIDifficulty
): number => {
  const cell = game.board[row][col];
  const capacity = getCellCapacity(row, col, game.rows, game.cols);

  // Can't place here
  if (cell.ownerId !== null && cell.ownerId !== playerId) return -1000;

  let score = 0;

  // Base score for placing
  score += 10;

  // Score for being close to explosion
  if (cell.orbs === capacity - 1) {
    score += 50; // One away from explosion
  } else if (cell.orbs === capacity - 2) {
    score += 25; // Two away
  }

  // Score for capturing opponent cells
  if (cell.ownerId === null) {
    // Check if this move would capture opponent cells when it explodes
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

  // Penalty for placing in own cell that's close to explosion (risky)
  if (cell.ownerId === playerId && cell.orbs === capacity) {
    score -= 20; // Already at capacity, will explode
  }

  // Corner cells are easier to fill (capacity 1)
  if (capacity === 1) {
    score += 15; // Quick explosion
  }

  // Edge cells are second easiest (capacity 2)
  if (capacity === 2) {
    score += 8;
  }

  // Difficulty adjustments
  if (difficulty === "easy") {
    // Easy AI: add random factor
    score += Math.random() * 40;
  } else if (difficulty === "medium") {
    // Medium AI: slight randomness
    score += Math.random() * 15;
  }
  // Hard AI: no randomness, pure strategy

  return score;
};

// Get the best move for the AI
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

  // Sort by score (highest first)
  validMoves.sort((a, b) => b.score - a.score);

  // For easy difficulty, sometimes pick a random valid move
  if (difficulty === "easy" && Math.random() < 0.3) {
    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return { row: validMoves[randomIndex].row, col: validMoves[randomIndex].col };
  }

  // For medium, sometimes pick from top 3
  if (difficulty === "medium" && Math.random() < 0.2) {
    const topMoves = validMoves.slice(0, Math.min(3, validMoves.length));
    const randomIndex = Math.floor(Math.random() * topMoves.length);
    return { row: topMoves[randomIndex].row, col: topMoves[randomIndex].col };
  }

  // Pick the best move
  return { row: validMoves[0].row, col: validMoves[0].col };
};

// Check if a player is an AI
export const isAI = (playerId: string): boolean => {
  return playerId.startsWith("ai-");
};
