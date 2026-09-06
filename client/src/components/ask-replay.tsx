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
    <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
      <h3 className="text-lg font-bold text-white text-center mb-4">{title}</h3>
      <div className="flex gap-3">
        <button
          className="flex-1 h-10 px-4 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all active:scale-95"
          onClick={confirmAction}
        >
          {confirmText}
        </button>
        <button
          className="flex-1 h-10 px-4 rounded-lg bg-gray-600 text-white font-bold hover:bg-gray-500 transition-all active:scale-95"
          onClick={declineAction}
        >
          {declineText}
        </button>
      </div>
    </div>
  );
}
