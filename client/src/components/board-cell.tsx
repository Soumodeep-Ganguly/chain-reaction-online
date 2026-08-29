import { Cell, Player } from "@/types/game";

interface BoardCellProps {
  cell: Cell;
  row: number;
  col: number;
  capacity: number;
  isCurrentPlayerTurn: boolean;
  currentPlayerId: string;
  players: Player[];
  onClick: () => void;
  isAnimating: boolean;
  animationType?: string;
}

// Get player color from the players list
function getPlayerColor(playerId: string, players: Player[]): string {
  const player = players.find((p) => p.id === playerId);
  return player?.color || "#6b7280";
}

// Render orbs based on count
function OrbDisplay({
  count,
  color,
  capacity,
}: {
  count: number;
  color: string;
  capacity: number;
}) {
  if (count === 0) return null;

  const isAboutToExplode = count >= capacity;

  // Orb positions based on count and capacity (corner=1, edge=2, inner=3)
  const orbPositions = getOrbPositions(count, capacity);

  return (
    <div className="relative w-full h-full">
      {orbPositions.map((pos, i) => (
        <div
          key={i}
          className={`absolute w-3 h-3 rounded-full transition-all duration-300 ${
            isAboutToExplode ? "animate-pulse" : ""
          }`}
          style={{
            backgroundColor: color,
            left: pos.x,
            top: pos.y,
            transform: "translate(-50%, -50%)",
            boxShadow: isAboutToExplode
              ? `0 0 8px 2px ${color}80`
              : `0 1px 3px ${color}60`,
          }}
        />
      ))}
    </div>
  );
}

// Calculate orb positions within a cell
function getOrbPositions(
  count: number,
  capacity: number
): { x: string; y: string }[] {
  const positions: { x: string; y: string }[] = [];

  if (capacity === 1) {
    // Corner cell - center
    positions.push({ x: "50%", y: "50%" });
  } else if (capacity === 2) {
    // Edge cell - two orbs
    if (count >= 1) positions.push({ x: "33%", y: "50%" });
    if (count >= 2) positions.push({ x: "67%", y: "50%" });
  } else {
    // Inner cell - three orbs (triangle pattern)
    if (count >= 1) positions.push({ x: "50%", y: "30%" });
    if (count >= 2) positions.push({ x: "30%", y: "70%" });
    if (count >= 3) positions.push({ x: "70%", y: "70%" });
  }

  return positions;
}

export function BoardCell({
  cell,
  capacity,
  isCurrentPlayerTurn,
  currentPlayerId,
  players,
  onClick,
  isAnimating,
  animationType,
}: BoardCellProps) {
  const ownerColor = cell.ownerId
    ? getPlayerColor(cell.ownerId, players)
    : null;
  const isClickable =
    isCurrentPlayerTurn &&
    (cell.ownerId === null || cell.ownerId === currentPlayerId);
  const isAboutToExplode = cell.orbs >= capacity && cell.orbs > 0;

  return (
    <div
      className={`
        relative w-14 h-14 md:w-16 md:h-16 border-2 rounded-lg
        transition-all duration-200 cursor-pointer
        flex items-center justify-center
        ${isClickable ? "hover:scale-105 hover:shadow-lg" : "cursor-default"}
        ${isAboutToExplode ? "ring-2 ring-white/80 shadow-lg" : ""}
        ${isAnimating && animationType === "explosion" ? "animate-ping" : ""}
        ${isAnimating && animationType === "capture" ? "animate-bounce" : ""}
      `}
      style={{
        backgroundColor: ownerColor
          ? `${ownerColor}30`
          : "rgba(255, 255, 255, 0.1)",
        borderColor: ownerColor
          ? `${ownerColor}60`
          : "rgba(255, 255, 255, 0.2)",
      }}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Capacity indicator dots */}
      <div className="absolute inset-0 p-1">
        {capacity === 1 && (
          <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-white/20" />
        )}
        {capacity === 2 && (
          <>
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-white/20" />
          </>
        )}
        {capacity === 3 && (
          <>
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/20" />
          </>
        )}
      </div>

      {/* Orbs */}
      <OrbDisplay
        count={cell.orbs}
        color={ownerColor || "#6b7280"}
        capacity={capacity}
      />

      {/* Explosion effect */}
      {isAnimating && animationType === "explosion" && (
        <div className="absolute inset-0 rounded-lg bg-white/30 animate-ping" />
      )}
    </div>
  );
}
