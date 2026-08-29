export function ChainReactionLogo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`${className} font-extrabold text-center`}>
      <div className="bg-emerald-600 text-white p-2 rounded-lg transform -rotate-6 inline-block">
        <span className="text-4xl tracking-tighter">CHAIN</span>
      </div>
      <div className="bg-red-600 text-white p-2 rounded-lg transform rotate-3 inline-block -ml-2 mt-1">
        <span className="text-4xl tracking-tighter">REACTION</span>
      </div>
    </div>
  );
}
