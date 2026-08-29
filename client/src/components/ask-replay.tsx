import { Card } from "@/components/ui/card";

interface AskReplayProps {
  confirmAction: () => void;
  declineAction: () => void;
  title: string;
  confirmText: string;
  declineText: string;
}

export function AskReplay({
  confirmAction,
  declineAction,
  title,
  confirmText,
  declineText,
}: AskReplayProps) {
  return (
    <Card className="p-4 bg-black/20 backdrop-blur-sm">
      <div className="text-white text-center mb-4 font-bold">{title}</div>
      <div className="grid grid-cols-2 gap-4">
        <div
          className="bg-green-500 hover:bg-green-600 p-2 font-bold text-white border rounded flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
          onClick={() => confirmAction()}
        >
          {confirmText}
        </div>
        <div
          className="bg-red-500 hover:bg-red-600 p-2 font-bold text-white border rounded flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
          onClick={() => declineAction()}
        >
          {declineText}
        </div>
      </div>
    </Card>
  );
}
