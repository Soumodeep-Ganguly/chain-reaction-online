import { Crown } from "lucide-react";

interface PlayerListProps {
  players: string[];
  host: string;
}

export function PlayerList({ players, host }: PlayerListProps) {
  return (
    <div className="border-2 rounded-md overflow-hidden">
      <div className="divide-y">
        {players.map((player, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 ${
              index % 2 === 0 ? "bg-gray-50" : "bg-white"
            }`}
          >
            <div className="flex items-center">
              <div
                className={`w-2 h-2 rounded-full mr-3 ${
                  index === 0 ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <span className="font-medium">{player}</span>
            </div>

            {player === host && <Crown className="h-5 w-5 text-yellow-500" />}
          </div>
        ))}
      </div>
    </div>
  );
}
