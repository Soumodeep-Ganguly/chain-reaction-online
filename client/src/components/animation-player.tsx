import { useState, useEffect, useRef } from "react";
import { BoardSnapshot, Player } from "@/types/game";
import { getCellCapacity } from "@/lib/game-helpers";

interface AnimationPlayerProps {
  boardSnapshots: BoardSnapshot[];
  rows: number;
  cols: number;
  players: Player[];
  onSnapshotComplete: () => void;
}

const STEP_DELAY = 400; // ms between chain reaction steps

export function AnimationPlayer({
  boardSnapshots,
  rows,
  cols,
  players,
  onSnapshotComplete,
}: AnimationPlayerProps) {
  const [currentSnapshot, setCurrentSnapshot] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(false);

  // Get player color
  const getPlayerColor = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.color || "#6b7280";
  };

  // Process snapshots one by one
  useEffect(() => {
    if (boardSnapshots.length === 0) {
      onSnapshotComplete();
      return;
    }

    // Only start if not already animating
    if (mountedRef.current) return;
    mountedRef.current = true;

    setCurrentSnapshot(0);
    let snapshotIndex = 0;

    const advance = () => {
      snapshotIndex++;

      if (snapshotIndex >= boardSnapshots.length) {
        // Animation complete
        setTimeout(() => {
          onSnapshotComplete();
        }, 200);
        return;
      }

      setCurrentSnapshot(snapshotIndex);
      timeoutRef.current = setTimeout(advance, STEP_DELAY);
    };

    timeoutRef.current = setTimeout(advance, STEP_DELAY);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [boardSnapshots, onSnapshotComplete]);

  // Reset when snapshots change
  useEffect(() => {
    mountedRef.current = false;
    setCurrentSnapshot(0);
  }, [boardSnapshots]);

  const snapshot = boardSnapshots[currentSnapshot];
  if (!snapshot) return null;

  // Calculate cell size based on grid dimensions
  const getCellSize = () => {
    if (cols <= 4) return "w-16 h-16 md:w-20 md:h-20";
    if (cols <= 6) return "w-12 h-12 md:w-16 md:h-16";
    if (cols <= 8) return "w-10 h-10 md:w-14 md:h-14";
    return "w-8 h-8 md:w-12 md:h-12";
  };

  const cellSizeClass = getCellSize();

  return (
    <div className="relative">
      <div className="flex flex-col items-center gap-0.5">
        {snapshot.board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-0.5">
            {row.map((cell, colIndex) => {
              const capacity = getCellCapacity(rowIndex, colIndex, rows, cols);
              const cellKey = `${rowIndex}-${colIndex}`;
              const ownerColor = cell.ownerId
                ? getPlayerColor(cell.ownerId)
                : null;
              const isChanged = snapshot.changedCells.includes(cellKey);
              const isAboutToExplode =
                cell.orbs >= capacity && cell.orbs > 0 && cell.orbs === capacity;

              return (
                <div
                  key={cellKey}
                  className={`
                    relative ${cellSizeClass} border-2 rounded-lg
                    flex items-center justify-center
                    ${isChanged ? "ring-2 ring-white animate-pulse" : ""}
                    ${isAboutToExplode ? "ring-2 ring-yellow-300/60" : ""}
                  `}
                  style={{
                    backgroundColor: ownerColor
                      ? `${ownerColor}30`
                      : "rgba(255, 255, 255, 0.1)",
                    borderColor: ownerColor
                      ? `${ownerColor}60`
                      : "rgba(255, 255, 255, 0.2)",
                    transition: "all 0.15s ease-out",
                  }}
                >
                  {/* Capacity dots */}
                  <div className="absolute inset-0 p-0.5">
                    {capacity === 1 && (
                      <div className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-white/20" />
                    )}
                    {capacity === 2 && (
                      <>
                        <div className="absolute bottom-0.5 left-0.5 w-1 h-1 rounded-full bg-white/20" />
                        <div className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-white/20" />
                      </>
                    )}
                    {capacity === 3 && (
                      <>
                        <div className="absolute bottom-0.5 left-0.5 w-1 h-1 rounded-full bg-white/20" />
                        <div className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-white/20" />
                        <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-white/20" />
                      </>
                    )}
                  </div>

                  {/* Orbs */}
                  {cell.orbs > 0 && (
                    <div className="relative w-full h-full">
                      {getOrbPositions(cell.orbs, capacity).map((pos, i) => (
                        <div
                          key={i}
                          className={`absolute w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${
                            isChanged ? "scale-125" : ""
                          }`}
                          style={{
                            backgroundColor: ownerColor || "#6b7280",
                            left: pos.x,
                            top: pos.y,
                            transform: "translate(-50%, -50%)",
                            boxShadow: isChanged
                              ? `0 0 10px 3px ${ownerColor || "#6b7280"}80`
                              : `0 1px 3px ${ownerColor || "#6b7280"}60`,
                            transition: "all 0.15s ease-out",
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Explosion flash */}
                  {isChanged && cell.orbs === 0 && cell.ownerId === null && (
                    <div className="absolute inset-0 rounded-lg bg-white/50 animate-ping" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      {boardSnapshots.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {boardSnapshots.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i <= currentSnapshot ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getOrbPositions(
  count: number,
  capacity: number
): { x: string; y: string }[] {
  const positions: { x: string; y: string }[] = [];

  if (capacity === 1) {
    positions.push({ x: "50%", y: "50%" });
  } else if (capacity === 2) {
    if (count >= 1) positions.push({ x: "33%", y: "50%" });
    if (count >= 2) positions.push({ x: "67%", y: "50%" });
  } else {
    if (count >= 1) positions.push({ x: "50%", y: "30%" });
    if (count >= 2) positions.push({ x: "30%", y: "70%" });
    if (count >= 3) positions.push({ x: "70%", y: "70%" });
  }

  return positions;
}
