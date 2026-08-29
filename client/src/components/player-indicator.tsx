import { Card } from "@/components/ui/card";
import { Player } from "@/types/game";

interface PlayerIndicatorProps {
  player: Player;
  orbCount: number;
  cellCount: number;
  isActive: boolean;
}

export function PlayerIndicator({
  player,
  orbCount,
  cellCount,
  isActive,
}: PlayerIndicatorProps) {
  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        isActive ? "scale-110" : ""
      } ${!player.active ? "opacity-40" : ""}`}
    >
      <Card
        className={`w-28 p-2 text-center ${
          isActive
            ? "border-2 border-yellow-400 shadow-yellow-400/20 shadow-lg"
            : ""
        }`}
      >
        <div
          className="w-4 h-4 rounded-full mx-auto mb-1"
          style={{ backgroundColor: player.color }}
        />
        <div className="font-bold truncate text-sm">{player.name}</div>
        <div className="text-xs text-gray-500 mt-1">
          {orbCount} orbs · {cellCount} cells
        </div>
        {!player.active && (
          <div className="text-xs text-red-500 font-bold mt-1">
            ELIMINATED
          </div>
        )}
        {isActive && (
          <div className="text-xs text-yellow-600 font-bold mt-1">
            PLAYING
          </div>
        )}
      </Card>
    </div>
  );
}
