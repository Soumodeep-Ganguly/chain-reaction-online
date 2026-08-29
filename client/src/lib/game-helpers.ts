// Get the capacity of a cell based on its position on the board
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

// Count all orbs belonging to a player
export const countPlayerOrbs = (
  board: { orbs: number; ownerId: string | null }[][],
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

// Count cells owned by a player
export const countPlayerCells = (
  board: { orbs: number; ownerId: string | null }[][],
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
