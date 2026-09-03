import { useState, useEffect, useRef } from "react";
import { AnimationFrame, FlyingOrb, Player } from "@/types/game";
import { getCellCapacity } from "@/lib/game-helpers";
import { playPlaceOrb, playExplosion, playChainReaction, playCapture } from "@/lib/sounds";

interface AnimationPlayerProps {
  frames: AnimationFrame[];
  rows: number;
  cols: number;
  players: Player[];
  // The board state BEFORE the animation starts
  initialBoard: { orbs: number; ownerId: string | null }[][];
  onAnimationComplete: () => void;
}

// Timing constants
const EXPLODE_DURATION = 300; // ms - cell glows
const FLY_DURATION = 400; // ms - orb flies from source to destination
const ARRIVE_DURATION = 200; // ms - orb appears in destination
const PAUSE_BETWEEN_STEPS = 150; // ms - pause before next explosion

export function AnimationPlayer({
  frames,
  rows,
  cols,
  players,
  initialBoard,
  onAnimationComplete,
}: AnimationPlayerProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [displayBoard, setDisplayBoard] = useState(initialBoard.map(r => r.map(c => ({ ...c }))));
  const [explodingCells, setExplodingCells] = useState<Set<string>>(new Set());
  const [flyingOrbs, setFlyingOrbs] = useState<FlyingOrb[]>([]);
  const [arrivingCells, setArrivingCells] = useState<Set<string>>(new Set());
  const [capturedCells, setCapturedCells] = useState<Set<string>>(new Set());

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(false);

  const getPlayerColor = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.color || "#6b7280";
  };

  // Process frames sequentially
  useEffect(() => {
    if (frames.length === 0) {
      onAnimationComplete();
      return;
    }

    if (mountedRef.current) return;
    mountedRef.current = true;

    let frameIndex = 0;

    const processFrame = () => {
      if (frameIndex >= frames.length) {
        // Animation complete
        setTimeout(() => {
          onAnimationComplete();
        }, 200);
        return;
      }

      const frame = frames[frameIndex];

      // Phase 1: Show exploding cells (glow effect)
      if (frame.explodingCells.length > 0) {
        // Play explosion sound
        if (frameIndex === 0) {
          playExplosion();
        } else {
          playChainReaction(frameIndex - 1);
        }
        if (frame.capturedCells.length > 0) {
          playCapture();
        }

        const explodeKeys = new Set(frame.explodingCells.map(c => `${c.row}-${c.col}`));
        setExplodingCells(explodeKeys);

        // Remove orbs from exploding cells on display board
        setDisplayBoard(prev => {
          const newBoard = prev.map(r => r.map(c => ({ ...c })));
          for (const cell of frame.explodingCells) {
            newBoard[cell.row][cell.col] = { orbs: 0, ownerId: null };
          }
          return newBoard;
        });

        // After explode duration, show flying orbs
        timeoutRef.current = setTimeout(() => {
          setExplodingCells(new Set());

          // Phase 2: Show orbs flying
          if (frame.flyingOrbs.length > 0) {
            setFlyingOrbs(frame.flyingOrbs);

            // After fly duration, show orbs arriving
            timeoutRef.current = setTimeout(() => {
              setFlyingOrbs([]);

              // Phase 3: Show orbs arrived in destination cells
              setDisplayBoard(prev => {
                const newBoard = prev.map(r => r.map(c => ({ ...c })));
                for (const arrived of frame.arrivedCells) {
                  newBoard[arrived.row][arrived.col] = {
                    orbs: arrived.orbCount,
                    ownerId: arrived.playerId,
                  };
                }
                return newBoard;
              });

              // Mark arriving cells
              const arriveKeys = new Set(frame.arrivedCells.map(c => `${c.row}-${c.col}`));
              setArrivingCells(arriveKeys);

              // Mark captured cells
              if (frame.capturedCells.length > 0) {
                const captureKeys = new Set(frame.capturedCells.map(c => `${c.row}-${c.col}`));
                setCapturedCells(captureKeys);
                setTimeout(() => setCapturedCells(new Set()), 400);
              }

              // Clear arriving animation
              setTimeout(() => {
                setArrivingCells(new Set());

                // Move to next frame
                frameIndex++;
                timeoutRef.current = setTimeout(processFrame, PAUSE_BETWEEN_STEPS);
              }, ARRIVE_DURATION);

            }, FLY_DURATION);
          } else {
            // No flying orbs, just move to next frame
            frameIndex++;
            timeoutRef.current = setTimeout(processFrame, PAUSE_BETWEEN_STEPS);
          }
        }, EXPLODE_DURATION);
      } else if (frame.arrivedCells.length > 0) {
        // First frame (just placing an orb) - no explosion
        playPlaceOrb();
        setDisplayBoard(prev => {
          const newBoard = prev.map(r => r.map(c => ({ ...c })));
          for (const arrived of frame.arrivedCells) {
            newBoard[arrived.row][arrived.col] = {
              orbs: arrived.orbCount,
              ownerId: arrived.playerId,
            };
          }
          return newBoard;
        });

        const arriveKeys = new Set(frame.arrivedCells.map(c => `${c.row}-${c.col}`));
        setArrivingCells(arriveKeys);

        setTimeout(() => {
          setArrivingCells(new Set());
          frameIndex++;
          timeoutRef.current = setTimeout(processFrame, PAUSE_BETWEEN_STEPS);
        }, ARRIVE_DURATION);
      } else {
        frameIndex++;
        timeoutRef.current = setTimeout(processFrame, 50);
      }
    };

    // Start processing
    timeoutRef.current = setTimeout(processFrame, 100);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [frames, onAnimationComplete]);

  // Reset when frames change
  useEffect(() => {
    mountedRef.current = false;
    setCurrentFrame(0);
    setDisplayBoard(initialBoard.map(r => r.map(c => ({ ...c }))));
    setExplodingCells(new Set());
    setFlyingOrbs([]);
    setArrivingCells(new Set());
    setCapturedCells(new Set());
  }, [frames, initialBoard]);

  // Calculate cell size
  const getCellSize = () => {
    if (cols <= 4) return { class: "w-16 h-16 md:w-20 md:h-20", px: 64 };
    if (cols <= 6) return { class: "w-12 h-12 md:w-16 md:h-16", px: 48 };
    if (cols <= 8) return { class: "w-10 h-10 md:w-14 md:h-14", px: 40 };
    return { class: "w-8 h-8 md:w-12 md:h-12", px: 32 };
  };

  const cellSize = getCellSize();
  const gap = 2; // gap-0.5 = 2px

  return (
    <div className="relative">
      {/* Board grid */}
      <div className="flex flex-col items-center gap-0.5">
        {displayBoard.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-0.5">
            {row.map((cell, colIndex) => {
              const capacity = getCellCapacity(rowIndex, colIndex, rows, cols);
              const cellKey = `${rowIndex}-${colIndex}`;
              const ownerColor = cell.ownerId ? getPlayerColor(cell.ownerId) : null;
              const isExploding = explodingCells.has(cellKey);
              const isArriving = arrivingCells.has(cellKey);
              const isCaptured = capturedCells.has(cellKey);
              const isAboutToExplode = cell.orbs >= capacity && cell.orbs > 0;

              return (
                <div
                  key={cellKey}
                  className={`
                    relative ${cellSize.class} border-2 rounded-lg
                    flex items-center justify-center
                    ${isExploding ? "ring-4 ring-white animate-pulse" : ""}
                    ${isArriving ? "ring-2 ring-yellow-300 scale-110" : ""}
                    ${isCaptured ? "ring-2 ring-red-400" : ""}
                    ${isAboutToExplode && !isExploding ? "ring-2 ring-yellow-200/60" : ""}
                  `}
                  style={{
                    backgroundColor: ownerColor
                      ? isExploding
                        ? `${ownerColor}60`
                        : `${ownerColor}30`
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
                          className={`absolute w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all duration-150 ${
                            isExploding ? "scale-0" : isArriving ? "scale-125" : ""
                          }`}
                          style={{
                            backgroundColor: ownerColor || "#6b7280",
                            left: pos.x,
                            top: pos.y,
                            transform: "translate(-50%, -50%)",
                            boxShadow: isExploding
                              ? `0 0 15px 5px ${ownerColor || "#6b7280"}80`
                              : isArriving
                              ? `0 0 10px 3px ${ownerColor || "#6b7280"}80`
                              : `0 1px 3px ${ownerColor || "#6b7280"}60`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Explosion flash */}
                  {isExploding && (
                    <div className="absolute inset-0 rounded-lg bg-white/60 animate-ping" />
                  )}

                  {/* Capture flash */}
                  {isCaptured && (
                    <div className="absolute inset-0 rounded-lg bg-red-400/40 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Flying orbs overlay */}
      {flyingOrbs.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {flyingOrbs.map((orb) => (
            <FlyingOrbElement
              key={orb.id}
              orb={orb}
              cellPx={cellSize.px}
              gap={gap}
              duration={FLY_DURATION}
            />
          ))}
        </div>
      )}

      {/* Frame progress */}
      {frames.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {frames.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i <= currentFrame ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Flying orb element that animates from source to destination
function FlyingOrbElement({
  orb,
  cellPx,
  gap,
  duration,
}: {
  orb: FlyingOrb;
  cellPx: number;
  gap: number;
  duration: number;
}) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);

      if (p < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [duration]);

  // Cubic ease-out for smooth deceleration
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const easedProgress = easeOut(progress);

  // Calculate pixel positions
  const startX = orb.fromCol * (cellPx + gap) + cellPx / 2;
  const startY = orb.fromRow * (cellPx + gap) + cellPx / 2;
  const endX = orb.toCol * (cellPx + gap) + cellPx / 2;
  const endY = orb.toRow * (cellPx + gap) + cellPx / 2;

  const currentX = startX + (endX - startX) * easedProgress;
  const currentY = startY + (endY - startY) * easedProgress;

  // Arc trajectory - orb rises up then comes down
  const arcHeight = -25;
  const arcY = arcHeight * Math.sin(easedProgress * Math.PI);

  // Scale: orb grows slightly at start, shrinks at end
  const scale = 1 + 0.3 * Math.sin(easedProgress * Math.PI);

  return (
    <div
      className="absolute rounded-full z-50"
      style={{
        width: 10,
        height: 10,
        backgroundColor: orb.color,
        left: currentX - 5,
        top: currentY - 5 + arcY,
        transform: `scale(${scale})`,
        boxShadow: `0 0 12px 4px ${orb.color}90`,
        transition: "none",
      }}
    />
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
