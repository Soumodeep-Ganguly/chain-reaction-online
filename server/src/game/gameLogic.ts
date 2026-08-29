import { Cell, GameState, Player, PLAYER_COLORS } from "../types/gameType";
import { deleteGameRoom, getGameState, setGameState } from "../utils/game";

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

// Count all orbs belonging to a player
export const countPlayerOrbs = (
  game: GameState,
  playerId: string
): number => {
  let count = 0;
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      if (game.board[r][c].ownerId === playerId) {
        count += game.board[r][c].orbs;
      }
    }
  }
  return count;
};

// Count cells owned by a player
export const countPlayerCells = (
  game: GameState,
  playerId: string
): number => {
  let count = 0;
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      if (game.board[r][c].ownerId === playerId) {
        count++;
      }
    }
  }
  return count;
};

// Process explosions and chain reactions after a placement
// Returns the sequence of events that occurred
const processExplosions = (
  game: GameState,
  events: { type: string; row: number; col: number; playerId: string }[]
): { type: string; row: number; col: number; playerId: string }[] => {
  const newEvents = [...events];
  let step = 0;
  const maxSteps = game.rows * game.cols * 4; // Safety limit

  while (step < maxSteps) {
    let foundExplosion = false;

    for (let r = 0; r < game.rows; r++) {
      for (let c = 0; c < game.cols; c++) {
        const cell = game.board[r][c];
        if (!cell.ownerId) continue;

        const capacity = getCellCapacity(r, c, game.rows, game.cols);
        if (cell.orbs > capacity) {
          foundExplosion = true;
          const explodingPlayer = cell.ownerId;

          // Remove all orbs from this cell
          cell.orbs = 0;
          cell.ownerId = null;

          // Record explosion event
          newEvents.push({
            type: "explosion",
            row: r,
            col: c,
            playerId: explodingPlayer,
          });

          // Send one orb to each neighbor
          const neighbors = getNeighbors(r, c, game.rows, game.cols);
          for (const [nr, nc] of neighbors) {
            const neighborCell = game.board[nr][nc];
            const prevOwner = neighborCell.ownerId;

            neighborCell.orbs += 1;
            neighborCell.ownerId = explodingPlayer;

            // If this was an opponent's cell, record capture
            if (prevOwner && prevOwner !== explodingPlayer) {
              newEvents.push({
                type: "capture",
                row: nr,
                col: nc,
                playerId: explodingPlayer,
              });
            }
          }
        }
      }
    }

    if (!foundExplosion) break;
    step++;
  }

  return newEvents;
};

// Check for eliminated players and update active status
const checkEliminations = (game: GameState): string[] => {
  const eliminated: string[] = [];
  for (const player of game.players) {
    if (!player.active) continue;
    if (!player.hasMoved) continue; // Don't eliminate players who haven't moved yet

    const orbCount = countPlayerOrbs(game, player.id);
    if (orbCount === 0) {
      player.active = false;
      eliminated.push(player.id);
    }
  }
  return eliminated;
};

// Check if there's a winner (only one active player left)
const checkWinner = (game: GameState): Player | undefined => {
  const activePlayers = game.players.filter((p) => p.active);
  if (activePlayers.length === 1 && game.started) {
    return activePlayers[0];
  }
  return undefined;
};

// Join a game room
export const joinGameRoom = async (
  roomId: string,
  player: { id: string; uuid?: string; name: string },
  maxPlayers?: number,
  rows?: number,
  cols?: number
) => {
  let room = await getGameState(roomId);
  if (!room) {
    const boardRows = rows || 8;
    const boardCols = cols || 8;
    room = {
      roomId,
      players: [],
      board: createBoard(boardRows, boardCols),
      rows: boardRows,
      cols: boardCols,
      currentPlayerIndex: 0,
      currentPlayer: player.id,
      maxPlayers: maxPlayers ?? 4,
      started: false,
      turnEvents: [],
      roundNumber: 1,
    };
    await setGameState(roomId, room);
  }

  // Check if player already exists
  const existingPlayer = room.players.find((p) => p.id === player.id);
  if (existingPlayer) {
    return {
      ...room,
      started:
        room.started || room.players.length === room.maxPlayers,
    };
  }

  // Assign color based on player index
  const colorIndex = room.players.length % PLAYER_COLORS.length;

  room.players.push({
    id: player.id,
    uuid: player.uuid,
    name: player.name,
    color: PLAYER_COLORS[colorIndex],
    active: true,
    hasMoved: false,
  });

  if (!maxPlayers) setGameState(roomId, room);

  return {
    ...room,
    started: room.started || room.players.length === room.maxPlayers,
  };
};

// Start a new game
export const createGame = async (roomId: string) => {
  const game = await getGameState(roomId);
  if (!game) throw new Error("Room not found");
  if (game.players.length < 2)
    throw new Error("Need at least 2 players to start");
  if (game.started) return game;

  // Reset all players
  game.players.forEach((p, i) => {
    p.active = true;
    p.hasMoved = false;
    p.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
  });

  // Clear the board
  game.board = createBoard(game.rows, game.cols);
  game.currentPlayerIndex = 0;
  game.currentPlayer = game.players[0].id;
  game.started = true;
  game.winner = undefined;
  game.turnEvents = [];

  setGameState(roomId, game);
  return game;
};

// Place an orb
export const placeOrb = async (
  roomId: string,
  playerId: string,
  row: number,
  col: number
) => {
  const game = await getGameState(roomId);
  if (!game) return null;
  if (!game.started) return null;

  // Validate player
  const player = game.players.find((p) => p.id === playerId);
  if (!player || !player.active) return null;

  // Validate it's the player's turn
  if (game.players[game.currentPlayerIndex].id !== playerId) return null;

  // Validate cell coordinates
  if (row < 0 || row >= game.rows || col < 0 || col >= game.cols) return null;

  const cell = game.board[row][col];

  // Player can only place in empty cell or their own cell
  if (cell.ownerId !== null && cell.ownerId !== playerId) return null;

  // Place the orb
  cell.orbs += 1;
  cell.ownerId = playerId;
  player.hasMoved = true;

  // Initialize events for this turn
  const events: { type: string; row: number; col: number; playerId: string }[] = [
    { type: "place", row, col, playerId },
  ];

  // Process any explosions and chain reactions
  const allEvents = processExplosions(game, events);

  // Store turn events for animation
  game.turnEvents = allEvents.map((e, index) => ({
    type: e.type as any,
    row: e.row,
    col: e.col,
    playerId: e.playerId,
    playerName: game.players.find((p) => p.id === e.playerId)?.name,
    chainReactionStep: index,
  }));

  // Check for eliminations
  const eliminated = checkEliminations(game);
  for (const pid of eliminated) {
    game.turnEvents.push({
      type: "elimination",
      playerId: pid,
      playerName: game.players.find((p) => p.id === pid)?.name,
    });
  }

  // Check for winner
  const winner = checkWinner(game);
  if (winner) {
    game.winner = winner;
    game.turnEvents.push({
      type: "win",
      playerId: winner.id,
      playerName: winner.name,
    });
  } else {
    // Advance to next active player
    advanceTurn(game);
  }

  setGameState(roomId, game);
  return game;
};

// Advance to the next active player
const advanceTurn = (game: GameState) => {
  if (game.players.length === 0) return;

  let nextIndex = game.currentPlayerIndex;
  let attempts = 0;

  do {
    nextIndex = (nextIndex + 1) % game.players.length;
    attempts++;
  } while (
    !game.players[nextIndex].active &&
    attempts < game.players.length
  );

  game.currentPlayerIndex = nextIndex;
  game.currentPlayer = game.players[nextIndex].id;
};

// Remove a player
export const removePlayer = async (roomId: string, playerId: string) => {
  const game = await getGameState(roomId);
  if (!game) return;

  const playerIndex = game.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return;

  const wasCurrentPlayer = game.currentPlayerIndex === playerIndex;

  // Remove orbs belonging to this player
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      if (game.board[r][c].ownerId === playerId) {
        game.board[r][c].orbs = 0;
        game.board[r][c].ownerId = null;
      }
    }
  }

  // Deactivate the player
  game.players[playerIndex].active = false;

  game.players.splice(playerIndex, 1);

  if (game.players.length === 0) {
    await deleteGameRoom(roomId);
    return;
  }

  // Adjust current player index if needed
  if (wasCurrentPlayer) {
    game.currentPlayerIndex =
      (game.currentPlayerIndex + game.players.length) %
      game.players.length;
  } else if (game.currentPlayerIndex > playerIndex) {
    game.currentPlayerIndex--;
  }

  // Find next active player
  let nextActive = game.currentPlayerIndex;
  let attempts = 0;
  while (
    !game.players[nextActive].active &&
    attempts < game.players.length
  ) {
    nextActive = (nextActive + 1) % game.players.length;
    attempts++;
  }
  game.currentPlayerIndex = nextActive;
  game.currentPlayer = game.players[nextActive].id;

  // Check if only 1 player remains
  if (game.players.filter((p) => p.active).length <= 1 && game.started) {
    const remaining = game.players.find((p) => p.active);
    if (remaining) {
      game.winner = remaining;
    }
    await setGameState(roomId, game);
    return;
  }

  await setGameState(roomId, game);
};

// Replay (start a new round)
export const replay = async (roomId: string) => {
  const game = await getGameState(roomId);
  if (!game) return null;

  // Reset the board
  game.board = createBoard(game.rows, game.cols);

  // Reset all players
  game.players.forEach((p, i) => {
    p.active = true;
    p.hasMoved = false;
    p.color = PLAYER_COLORS[i % PLAYER_COLORS.length];
  });

  game.roundNumber = (game.roundNumber ?? 1) + 1;
  game.currentPlayerIndex = (game.roundNumber - 1) % game.players.length;
  game.currentPlayer = game.players[game.currentPlayerIndex].id;
  game.started = true;
  game.winner = undefined;
  game.turnEvents = [];

  await setGameState(roomId, game);
  return game;
};
