import { BoardCell } from "./board-cell";
import { Cell, Player } from "@/types/game";
import { getCellCapacity } from "@/lib/game-helpers";

interface GameBoardProps {
  board: Cell[][];
  rows: number;
  cols: number;
  isCurrentPlayerTurn: boolean;
  currentPlayerId: string;
  players: Player[];
  onCellClick: (row: number, col: number) => void;
  animatingCells: Map<string, string>;
}

export function GameBoard({
  board,
  rows,
  cols,
  isCurrentPlayerTurn,
  currentPlayerId,
  players,
  onCellClick,
  animatingCells,
}: GameBoardProps) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-0.5">
          {row.map((cell, colIndex) => {
            const capacity = getCellCapacity(rowIndex, colIndex, rows, cols);
            const cellKey = `${rowIndex}-${colIndex}`;
            const animating = animatingCells.has(cellKey);
            const animationType = animatingCells.get(cellKey);

            return (
              <BoardCell
                key={cellKey}
                cell={cell}
                row={rowIndex}
                col={colIndex}
                capacity={capacity}
                isCurrentPlayerTurn={isCurrentPlayerTurn}
                currentPlayerId={currentPlayerId}
                players={players}
                onClick={() => onCellClick(rowIndex, colIndex)}
                isAnimating={animating}
                animationType={animationType}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
