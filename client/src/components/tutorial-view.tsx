import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChainReactionLogo } from "@/components/chain-reaction-logo";
import {
  ArrowLeft,
  Play,
  Zap,
  Target,
  Trophy,
  CheckCircle,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { Cell, Player, PLAYER_COLORS } from "@/types/game";
import { getCellCapacity } from "@/lib/game-helpers";
import { generateAnimationSequence } from "@/lib/ai-game";
import { playPlaceOrb, playExplosion, playChainReaction, playCapture, playVictory } from "@/lib/sounds";

interface TutorialViewProps {
  onNavigate: (view: "home" | "tutorial" | "offline-setup") => void;
  onStartGame: () => void;
}

// ─── Tutorial Game Engine ────────────────────────────────────────────────────

const TUTORIAL_PLAYER: Player = {
  id: "tutorial-player",
  name: "You",
  color: PLAYER_COLORS[0],
  active: true,
  hasMoved: false,
};

const TUTORIAL_OPPONENT: Player = {
  id: "tutorial-opponent",
  name: "CPU",
  color: PLAYER_COLORS[1],
  active: true,
  hasMoved: false,
};

function createTutorialBoard(
  rows: number,
  cols: number,
  setup?: { row: number; col: number; ownerId: string; orbs: number }[]
): Cell[][] {
  const board: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ orbs: 0, ownerId: null });
    }
    board.push(row);
  }
  if (setup) {
    for (const s of setup) {
      board[s.row][s.col] = { orbs: s.orbs, ownerId: s.ownerId };
    }
  }
  return board;
}

// ─── Lesson Definitions ──────────────────────────────────────────────────────

interface Lesson {
  id: string;
  title: string;
  icon: React.ReactNode;
  instruction: string;
  hint?: string;
  boardRows: number;
  boardCols: number;
  boardSetup?: { row: number; col: number; ownerId: string; orbs: number }[];
  targetCell: { row: number; col: number };
  opponentMoves?: boolean;
  opponentSequence?: { row: number; col: number }[];
  validate: (board: Cell[][], moveCount: number) => "continue" | "complete";
  successMessage: string;
  tips: string[];
}

const LESSONS: Lesson[] = [
  {
    id: "place-orb",
    title: "Place Your First Orb",
    icon: <Target className="h-5 w-5 text-emerald-500" />,
    instruction:
      "Tap the glowing cell to place your first orb. Every turn starts this way!",
    hint: "Watch for the bouncing arrow — it shows you exactly where to tap.",
    boardRows: 3,
    boardCols: 3,
    targetCell: { row: 1, col: 1 },
    validate: (board) => {
      for (const row of board) {
        for (const cell of row) {
          if (cell.ownerId === "tutorial-player" && cell.orbs >= 1)
            return "complete";
        }
      }
      return "continue";
    },
    successMessage:
      "🎉 You placed your first orb! On your turn, tap any empty cell or a cell you already own.",
    tips: [
      "Tap empty cells to claim them",
      "One orb per turn",
      "You can also tap your own cells",
    ],
  },
  {
    id: "build-up",
    title: "Build Up Orbs",
    icon: <Target className="h-5 w-5 text-blue-500" />,
    instruction:
      "The glowing center cell already has 1 orb. Tap it two more times to stack it to 3 orbs.",
    hint: "Keep tapping the glowing cell until it's full with 3 orbs.",
    boardRows: 3,
    boardCols: 3,
    boardSetup: [{ row: 1, col: 1, ownerId: "tutorial-player", orbs: 1 }],
    targetCell: { row: 1, col: 1 },
    validate: (board) => {
      const cell = board[1][1];
      if (cell.ownerId === "tutorial-player" && cell.orbs >= 3) return "complete";
      return "continue";
    },
    successMessage:
      "🎉 The center cell is now full with 3 orbs! Inner cells hold the most orbs.",
    tips: [
      "Center cells hold 3 orbs (most)",
      "Edge cells hold 2 orbs",
      "Corner cells hold only 1 orb",
    ],
  },
  {
    id: "see-capacity",
    title: "Cell Capacity",
    icon: <Target className="h-5 w-5 text-purple-500" />,
    instruction:
      "The glowing corner cell already has 1 orb (its max). Tap it to add one more — it will explode!",
    hint: "Corner cells can only hold 1 orb. Adding one more makes it burst!",
    boardRows: 3,
    boardCols: 3,
    // Corner at capacity (1 orb, cap 1) → click → 2 > 1 → explodes
    boardSetup: [{ row: 0, col: 0, ownerId: "tutorial-player", orbs: 1 }],
    targetCell: { row: 0, col: 0 },
    validate: (_board, moveCount) => {
      if (moveCount >= 1) return "complete";
      return "continue";
    },
    successMessage:
      "💥 The corner cell exploded! It could only hold 1 orb. Notice the small dots in cells hint at their capacity.",
    tips: [
      "Corner = 1 orb capacity (1 dot)",
      "Edge = 2 orb capacity (2 dots)",
      "Center = 3 orb capacity (3 dots)",
    ],
  },
  {
    id: "trigger-explosion",
    title: "Trigger an Explosion!",
    icon: <Zap className="h-5 w-5 text-orange-500" />,
    instruction:
      "The glowing center cell is full with 3 orbs. Tap it to add one more — it explodes and sends orbs to all neighbors!",
    hint: "A full cell explodes when you add one more orb to it!",
    boardRows: 3,
    boardCols: 3,
    // Center at capacity (3 orbs, cap 3) → click → 4 > 3 → explodes
    boardSetup: [{ row: 1, col: 1, ownerId: "tutorial-player", orbs: 3 }],
    targetCell: { row: 1, col: 1 },
    validate: (_board, moveCount) => {
      if (moveCount >= 1) return "complete";
      return "continue";
    },
    successMessage:
      "💥 The cell exploded and sent orbs to all its neighbors! Full cells burst and distribute orbs outward.",
    tips: [
      "Full cells explode when you add one more orb",
      "Orbs fly to every adjacent cell",
      "The exploding cell empties itself",
    ],
  },
  {
    id: "chain-reaction",
    title: "Chain Reaction!",
    icon: <Zap className="h-5 w-5 text-red-500" />,
    instruction:
      "The glowing corner is full (1 orb). Tap it — the orb flies to the edge cell next door, overloads it, and THAT explodes too!",
    hint:
      "Corner explodes → orb flies to edge → edge overloads → chain reaction!",
    boardRows: 3,
    boardCols: 3,
    // Corner at capacity (1 orb, cap 1), edge at capacity (2 orbs, cap 2)
    // Click corner → 2 > 1 → explodes → sends 1 to edge → edge: 2+1=3 > 2 → explodes!
    boardSetup: [
      { row: 0, col: 0, ownerId: "tutorial-player", orbs: 1 },
      { row: 0, col: 1, ownerId: "tutorial-player", orbs: 2 },
    ],
    targetCell: { row: 0, col: 0 },
    validate: (_board, moveCount) => {
      if (moveCount >= 1) return "complete";
      return "continue";
    },
    successMessage:
      "🌊 Chain reaction! Corner exploded → orb flew to edge → edge overloaded → edge exploded too! This is the core mechanic!",
    tips: [
      "Plan chain reactions by building up cells",
      "Explosions cascade across the board",
      "Chain reactions can capture many cells at once",
    ],
  },
  {
    id: "capture-opp",
    title: "Capture a Cell!",
    icon: <Target className="h-5 w-5 text-red-500" />,
    instruction:
      "The CPU (blue) owns the top edge cell with 1 orb. The glowing center is full — tap it to explode and capture the CPU's cell!",
    hint:
      "Your explosion will send an orb into the CPU's cell, outnumbering them and taking it over!",
    boardRows: 3,
    boardCols: 3,
    // Center at capacity (3 orbs, cap 3), opponent's edge at 1 orb (cap 2)
    boardSetup: [
      { row: 0, col: 1, ownerId: "tutorial-opponent", orbs: 1 },
      { row: 1, col: 1, ownerId: "tutorial-player", orbs: 3 },
    ],
    targetCell: { row: 1, col: 1 },
    validate: (_board, moveCount) => {
      if (moveCount >= 1) return "complete";
      return "continue";
    },
    successMessage:
      "🎯 Cell captured! When your explosion sends an orb to an opponent's cell and outnumbers theirs, it becomes yours!",
    tips: [
      "Explosions can capture opponent cells",
      "You need more orbs than them in the cell",
      "Chain reactions can capture many cells at once!",
    ],
  },
  {
    id: "free-play",
    title: "Free Play vs CPU",
    icon: <Trophy className="h-5 w-5 text-yellow-500" />,
    instruction:
      "You're ready! Beat the CPU on this 3×3 board. Tap the glowing center to start, build it up, then trigger chain reactions to capture all CPU cells!",
    hint:
      "Start by claiming the center, fill it to 3 orbs, then explode outward to capture the CPU's corner.",
    boardRows: 3,
    boardCols: 3,
    boardSetup: [{ row: 2, col: 2, ownerId: "tutorial-opponent", orbs: 1 }],
    targetCell: { row: 1, col: 1 },
    opponentMoves: true,
    opponentSequence: [
      { row: 2, col: 1 },
      { row: 2, col: 0 },
      { row: 1, col: 2 },
      { row: 0, col: 2 },
      { row: 0, col: 0 },
    ],
    validate: (board) => {
      let opponentCells = 0;
      for (const row of board) {
        for (const cell of row) {
          if (cell.ownerId === "tutorial-opponent") opponentCells++;
        }
      }
      if (opponentCells === 0) return "complete";
      return "continue";
    },
    successMessage:
      "🏆 You won! You now understand how Chain Reaction works. Ready for a real game?",
    tips: [
      "Build up before attacking",
      "Use chain reactions to capture multiple cells",
      "Control the center for the best position",
    ],
  },
];

// ─── Flying Orb Animation ────────────────────────────────────────────────────

function FlyingOrb({
  fromRow,
  fromCol,
  toRow,
  toCol,
  color,
  cellPx,
  gap,
  duration,
  onComplete,
}: {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  color: string;
  cellPx: number;
  gap: number;
  duration: number;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    };
    completedRef.current = false;
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [duration, onComplete]);

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const eased = easeOut(progress);

  const startX = fromCol * (cellPx + gap) + cellPx / 2;
  const startY = fromRow * (cellPx + gap) + cellPx / 2;
  const endX = toCol * (cellPx + gap) + cellPx / 2;
  const endY = toRow * (cellPx + gap) + cellPx / 2;

  const currentX = startX + (endX - startX) * eased;
  const currentY = startY + (endY - startY) * eased;
  const arcY = -25 * Math.sin(eased * Math.PI);
  const scale = 1 + 0.5 * Math.sin(eased * Math.PI);

  return (
    <div
      className="absolute rounded-full z-50 pointer-events-none"
      style={{
        width: 12,
        height: 12,
        backgroundColor: color,
        left: currentX - 6,
        top: currentY - 6 + arcY,
        transform: `scale(${scale})`,
        boxShadow: `0 0 14px 5px ${color}90`,
      }}
    />
  );
}

// ─── Interactive Board Component ─────────────────────────────────────────────

function InteractiveBoard({
  board,
  rows,
  cols,
  players,
  targetCell,
  onCellClick,
  animating,
  flyingOrbs,
  onOrbArrived,
  explodingCells,
  arrivedCells,
}: {
  board: Cell[][];
  rows: number;
  cols: number;
  players: Player[];
  targetCell: { row: number; col: number };
  onCellClick: (row: number, col: number) => void;
  animating: boolean;
  flyingOrbs: {
    id: string;
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    color: string;
  }[];
  onOrbArrived: () => void;
  explodingCells: Set<string>;
  arrivedCells: Set<string>;
}) {
  const getPlayerColor = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.color || "#6b7280";
  };

  const getCellSize = () => {
    if (cols <= 4) return { cls: "w-16 h-16 md:w-20 md:h-20", px: 64 };
    if (cols <= 6) return { cls: "w-12 h-12 md:w-16 md:h-16", px: 48 };
    return { cls: "w-10 h-10 md:w-14 md:h-14", px: 40 };
  };

  const cellSize = getCellSize();
  const gap = 2;

  const isTarget = (row: number, col: number) => {
    return targetCell.row === row && targetCell.col === col;
  };

  const getOrbPositions = (
    count: number,
    capacity: number
  ): { x: string; y: string }[] => {
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
  };

  return (
    <div className="relative">
      <div className="flex flex-col gap-0.5">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-0.5">
            {row.map((cell, colIndex) => {
              const capacity = getCellCapacity(rowIndex, colIndex, rows, cols);
              const cellKey = `${rowIndex}-${colIndex}`;
              const ownerColor = cell.ownerId
                ? getPlayerColor(cell.ownerId)
                : null;
              const target = isTarget(rowIndex, colIndex);
              const isExploding = explodingCells.has(cellKey);
              const isArriving = arrivedCells.has(cellKey);

              return (
                <div
                  key={cellKey}
                  className={`relative ${cellSize.cls} border-2 rounded-lg flex items-center justify-center transition-all duration-200
                    ${target && !animating ? "cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95 ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/40 animate-pulse" : "cursor-not-allowed opacity-70"}
                    ${isExploding ? "ring-4 ring-white animate-pulse" : ""}
                    ${isArriving ? "ring-2 ring-yellow-300 scale-110" : ""}
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
                  }}
                  onClick={
                    target && !animating
                      ? () => onCellClick(rowIndex, colIndex)
                      : undefined
                  }
                >
                  {/* Target arrow — only on the allowed cell */}
                  {target && !animating && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce z-50">
                      <div className="text-yellow-400 text-lg drop-shadow-lg">
                        ▼
                      </div>
                    </div>
                  )}

                  {/* Capacity dots */}
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
                  {cell.orbs > 0 && (
                    <div className="relative w-full h-full">
                      {getOrbPositions(cell.orbs, capacity).map((pos, i) => (
                        <div
                          key={i}
                          className={`absolute w-3 h-3 rounded-full transition-all duration-200
                            ${isExploding ? "scale-0" : isArriving ? "scale-125" : ""}
                          `}
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
            <FlyingOrb
              key={orb.id}
              fromRow={orb.fromRow}
              fromCol={orb.fromCol}
              toRow={orb.toRow}
              toCol={orb.toCol}
              color={orb.color}
              cellPx={cellSize.px}
              gap={gap}
              duration={350}
              onComplete={onOrbArrived}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Tutorial Component ─────────────────────────────────────────────────

export function TutorialView({ onNavigate, onStartGame }: TutorialViewProps) {
  const [currentLesson, setCurrentLesson] = useState(0);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(
    new Array(LESSONS.length).fill(false)
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [explodingCells, setExplodingCells] = useState<Set<string>>(new Set());
  const [arrivedCells, setArrivedCells] = useState<Set<string>>(new Set());
  const [flyingOrbs, setFlyingOrbs] = useState<
    {
      id: string;
      fromRow: number;
      fromCol: number;
      toRow: number;
      toCol: number;
      color: string;
    }[]
  >([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiMoveIndex, setAiMoveIndex] = useState(0);

  // Track ALL timeouts for proper cleanup
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());
  const lessonIdRef = useRef(0);

  const lesson = LESSONS[currentLesson];
  const isLast = currentLesson === LESSONS.length - 1;

  // Safe timeout that tracks all timeouts for cleanup
  const safeTimeout = useCallback(
    (fn: () => void, ms: number): NodeJS.Timeout => {
      const id = setTimeout(() => {
        timeoutRefs.current.delete(id);
        fn();
      }, ms);
      timeoutRefs.current.add(id);
      return id;
    },
    []
  );

  // Clear all tracked timeouts
  const clearAllTimeouts = useCallback(() => {
    for (const id of timeoutRefs.current) {
      clearTimeout(id);
    }
    timeoutRefs.current.clear();
  }, []);

  // Initialize board when lesson changes
  useEffect(() => {
    lessonIdRef.current++;
    clearAllTimeouts();

    const newBoard = createTutorialBoard(
      lesson.boardRows,
      lesson.boardCols,
      lesson.boardSetup
    );
    setBoard(newBoard);
    setMoveCount(0);
    setShowSuccess(false);
    setAnimating(false);
    setExplodingCells(new Set());
    setArrivedCells(new Set());
    setFlyingOrbs([]);
    setAiThinking(false);
    setAiMoveIndex(0);

    return () => {
      clearAllTimeouts();
    };
  }, [currentLesson, clearAllTimeouts]);

  // Process a full move with flying orb animations
  const processMove = useCallback(
    (
      boardBefore: Cell[][],
      row: number,
      col: number,
      playerId: string
    ): Promise<Cell[][]> => {
      const currentLessonId = lessonIdRef.current;

      return new Promise((resolve) => {
        const seq = generateAnimationSequence(
          boardBefore,
          lesson.boardRows,
          lesson.boardCols,
          row,
          col,
          playerId,
          (id) =>
            id === "tutorial-player"
              ? TUTORIAL_PLAYER.color
              : TUTORIAL_OPPONENT.color
        );

        // No chain reactions — just place orb
        if (seq.frames.length <= 1) {
          playPlaceOrb();
          const finalBoard = boardBefore.map((r) =>
            r.map((c) => ({ ...c }))
          );
          finalBoard[row][col].orbs += 1;
          finalBoard[row][col].ownerId = playerId;
          resolve(finalBoard);
          return;
        }

        setAnimating(true);
        let frameIndex = 0;
        let currentWorkingBoard = boardBefore.map((r) =>
          r.map((c) => ({ ...c }))
        );

        // Safety: force-resolve after max time to prevent infinite loops
        const MAX_ANIMATION_MS = 15000;
        const safetyTimeout = setTimeout(() => {
          clearAllTimeouts();
          setAnimating(false);
          setExplodingCells(new Set());
          setArrivedCells(new Set());
          setFlyingOrbs([]);
          // Use the final board from the sequence
          resolve(seq.finalBoard);
        }, MAX_ANIMATION_MS);

        const processFrame = () => {
          // Safety: check if lesson changed or safety timeout fired
          if (lessonIdRef.current !== currentLessonId) {
            clearTimeout(safetyTimeout);
            resolve(currentWorkingBoard);
            return;
          }

          if (frameIndex >= seq.frames.length) {
            clearTimeout(safetyTimeout);
            setAnimating(false);
            setExplodingCells(new Set());
            setArrivedCells(new Set());
            setFlyingOrbs([]);
            resolve(currentWorkingBoard);
            return;
          }

          const frame = seq.frames[frameIndex];

          // Phase 1: Show exploding cells
          if (frame.explodingCells.length > 0) {
            // Play explosion or chain reaction sound
            if (frameIndex === 0) {
              playExplosion();
            } else {
              playChainReaction(frameIndex - 1);
            }
            if (frame.capturedCells.length > 0) {
              playCapture();
            }

            const explodeKeys = new Set(
              frame.explodingCells.map((c) => `${c.row}-${c.col}`)
            );
            setExplodingCells(explodeKeys);

            // Remove orbs from exploding cells
            const afterExplode = currentWorkingBoard.map((r) =>
              r.map((c) => ({ ...c }))
            );
            for (const ec of frame.explodingCells) {
              afterExplode[ec.row][ec.col] = { orbs: 0, ownerId: null };
            }
            currentWorkingBoard = afterExplode;

            // After explode glow, show flying orbs
            safeTimeout(() => {
              setExplodingCells(new Set());

              if (frame.flyingOrbs.length > 0) {
                setFlyingOrbs(frame.flyingOrbs);

                // Wait for all orbs to fly, then update board
                safeTimeout(() => {
                  setFlyingOrbs([]);

                  const afterArrive = currentWorkingBoard.map((r) =>
                    r.map((c) => ({ ...c }))
                  );
                  for (const arrived of frame.arrivedCells) {
                    afterArrive[arrived.row][arrived.col] = {
                      orbs: arrived.orbCount,
                      ownerId: arrived.playerId,
                    };
                  }
                  currentWorkingBoard = afterArrive;
                  setBoard(
                    afterArrive.map((r) => r.map((c) => ({ ...c })))
                  );

                  const arriveKeys = new Set(
                    frame.arrivedCells.map((c) => `${c.row}-${c.col}`)
                  );
                  setArrivedCells(arriveKeys);

                  safeTimeout(() => {
                    setArrivedCells(new Set());
                    frameIndex++;
                    safeTimeout(processFrame, 50);
                  }, 200);
                }, 400);
              } else {
                frameIndex++;
                safeTimeout(processFrame, 50);
              }
            }, 300);
          } else if (frame.arrivedCells.length > 0) {
            // First frame (just placing an orb)
            const afterArrive = currentWorkingBoard.map((r) =>
              r.map((c) => ({ ...c }))
            );
            for (const arrived of frame.arrivedCells) {
              afterArrive[arrived.row][arrived.col] = {
                orbs: arrived.orbCount,
                ownerId: arrived.playerId,
              };
            }
            currentWorkingBoard = afterArrive;
            setBoard(afterArrive.map((r) => r.map((c) => ({ ...c }))));

            const arriveKeys = new Set(
              frame.arrivedCells.map((c) => `${c.row}-${c.col}`)
            );
            setArrivedCells(arriveKeys);

            safeTimeout(() => {
              setArrivedCells(new Set());
              frameIndex++;
              safeTimeout(processFrame, 50);
            }, 200);
          } else {
            frameIndex++;
            safeTimeout(processFrame, 50);
          }
        };

        processFrame();
      });
    },
    [lesson.boardRows, lesson.boardCols, safeTimeout, clearAllTimeouts]
  );

  // AI opponent logic with predestined sequence
  const doAIMove = useCallback(
    (currentBoard: Cell[][]): Cell[][] => {
      const seq = lesson.opponentSequence;
      if (!seq || aiMoveIndex >= seq.length) {
        // Fallback: find any valid move
        for (let r = 0; r < lesson.boardRows; r++) {
          for (let c = 0; c < lesson.boardCols; c++) {
            const cell = currentBoard[r][c];
            if (
              cell.ownerId === null ||
              cell.ownerId === "tutorial-opponent"
            ) {
              const newBoard = currentBoard.map((row) =>
                row.map((cell) => ({ ...cell }))
              );
              newBoard[r][c].orbs += 1;
              newBoard[r][c].ownerId = "tutorial-opponent";
              return newBoard;
            }
          }
        }
        return currentBoard;
      }

      const move = seq[aiMoveIndex];
      const newBoard = currentBoard.map((row) =>
        row.map((cell) => ({ ...cell }))
      );
      const cell = newBoard[move.row][move.col];

      // Can't place on player's cells in tutorial, skip to next valid
      if (cell.ownerId === "tutorial-player") {
        for (let r = 0; r < lesson.boardRows; r++) {
          for (let c = 0; c < lesson.boardCols; c++) {
            const mc = newBoard[r][c];
            if (
              mc.ownerId === null ||
              mc.ownerId === "tutorial-opponent"
            ) {
              mc.orbs += 1;
              mc.ownerId = "tutorial-opponent";
              setAiMoveIndex((prev) => prev + 1);
              return newBoard;
            }
          }
        }
        return currentBoard;
      }

      cell.orbs += 1;
      cell.ownerId = "tutorial-opponent";
      setAiMoveIndex((prev) => prev + 1);
      return newBoard;
    },
    [lesson, aiMoveIndex]
  );

  // STRICT: Only allow clicking the target cell
  const handleCellClick = async (row: number, col: number) => {
    if (animating || showSuccess || aiThinking) return;

    // STRICT LOCK: Only the target cell is clickable
    if (row !== lesson.targetCell.row || col !== lesson.targetCell.col) return;

    const cell = board[row][col];

    // Can only click empty cells or cells the player owns
    if (cell.ownerId !== null && cell.ownerId !== "tutorial-player") return;

    const boardBefore = board.map((r) => r.map((c) => ({ ...c })));

    // Process the move with full animation
    const finalBoard = await processMove(
      boardBefore,
      row,
      col,
      "tutorial-player"
    );

    setBoard(finalBoard);
    const newMoveCount = moveCount + 1;
    setMoveCount(newMoveCount);

    // Check if lesson is complete
    const result = lesson.validate(finalBoard, newMoveCount);
    if (result === "complete") {
      playVictory();
      setCompleted((prev) => {
        const next = [...prev];
        next[currentLesson] = true;
        return next;
      });
      setShowSuccess(true);
      return;
    }

    // AI opponent moves
    if (lesson.opponentMoves) {
      setAiThinking(true);
      safeTimeout(() => {
        const aiBoard = doAIMove(finalBoard);
        setBoard(aiBoard);

        const aiResult = lesson.validate(aiBoard, newMoveCount);
        if (aiResult === "complete") {
          setCompleted((prev) => {
            const next = [...prev];
            next[currentLesson] = true;
            return next;
          });
          setShowSuccess(true);
        }
        setAiThinking(false);
      }, 600 + Math.random() * 400);
    }
  };

  const handleOrbArrived = useCallback(() => {
    // Handled in processMove timeout
  }, []);

  const resetLesson = () => {
    clearAllTimeouts();
    const newBoard = createTutorialBoard(
      lesson.boardRows,
      lesson.boardCols,
      lesson.boardSetup
    );
    setBoard(newBoard);
    setMoveCount(0);
    setShowSuccess(false);
    setAnimating(false);
    setExplodingCells(new Set());
    setArrivedCells(new Set());
    setFlyingOrbs([]);
    setAiThinking(false);
    setAiMoveIndex(0);
  };

  const nextLesson = () => {
    if (!isLast) {
      setCurrentLesson((prev) => prev + 1);
    }
  };

  const goToLesson = (index: number) => {
    if (index <= currentLesson || completed[index]) {
      setCurrentLesson(index);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3 md:p-4">
      <div className="w-full max-w-md">
        <Card className="border-2 md:border-4 border-emerald-400 shadow-2xl">
          <CardHeader className="flex flex-col items-center p-4 md:p-6">
            <ChainReactionLogo className="w-24 md:w-36 h-auto mb-2" />
            <div className="flex items-center gap-2">
              {lesson.icon}
              <CardTitle className="text-lg md:text-xl font-extrabold text-center">
                {lesson.title}
              </CardTitle>
            </div>

            {/* Lesson progress */}
            <div className="flex gap-1.5 mt-3">
              {LESSONS.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => goToLesson(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentLesson
                      ? "w-6 bg-emerald-500"
                      : completed[i]
                      ? "w-2 bg-emerald-300"
                      : "w-2 bg-gray-300"
                  } ${
                    i <= currentLesson || completed[i]
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50"
                  }`}
                />
              ))}
            </div>

            {/* Player indicator */}
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: TUTORIAL_PLAYER.color }}
              />
              <span className="font-bold">You</span>
              {lesson.opponentMoves && (
                <>
                  <span>vs</span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: TUTORIAL_OPPONENT.color }}
                  />
                  <span className="font-bold">{TUTORIAL_OPPONENT.name}</span>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-4 md:p-6">
            {/* Instruction */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-800 font-medium leading-relaxed">
                📋 {lesson.instruction}
              </p>
              {lesson.hint && (
                <p className="text-xs text-emerald-600 mt-2 flex items-start gap-1">
                  <span>💡</span>
                  <span>{lesson.hint}</span>
                </p>
              )}
            </div>

            {/* Game Board */}
            <div className="bg-gray-900 rounded-xl p-4 flex justify-center">
              <InteractiveBoard
                board={board}
                rows={lesson.boardRows}
                cols={lesson.boardCols}
                players={[TUTORIAL_PLAYER, TUTORIAL_OPPONENT]}
                targetCell={lesson.targetCell}
                onCellClick={handleCellClick}
                animating={animating || showSuccess || aiThinking}
                flyingOrbs={flyingOrbs}
                onOrbArrived={handleOrbArrived}
                explodingCells={explodingCells}
                arrivedCells={arrivedCells}
              />
            </div>

            {/* Status messages */}
            {aiThinking && (
              <div className="text-center">
                <span className="text-sm text-blue-600 animate-pulse">
                  🤖 CPU is thinking...
                </span>
              </div>
            )}

            {showSuccess && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 space-y-3">
                <p className="text-sm text-emerald-800 font-medium">
                  {lesson.successMessage}
                </p>

                {/* Tips */}
                <div className="space-y-1">
                  {lesson.tips.map((tip, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>

                {/* Next button */}
                {!isLast ? (
                  <button
                    className="w-full h-10 rounded-md inline-flex items-center justify-center gap-2 font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all transform hover:scale-105"
                    onClick={nextLesson}
                  >
                    Next Lesson
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    className="w-full h-10 rounded-md inline-flex items-center justify-center gap-2 font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all transform hover:scale-105"
                    onClick={onStartGame}
                  >
                    <Play className="h-4 w-4" />
                    Play a Real Game!
                  </button>
                )}
              </div>
            )}

            {/* Reset button */}
            {!showSuccess && (
              <button
                className="w-full h-9 rounded-md inline-flex items-center justify-center gap-2 text-sm font-bold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all"
                onClick={resetLesson}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Lesson
              </button>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-1">
              <button
                className="h-10 px-4 rounded-md inline-flex items-center justify-center gap-2 font-bold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => setCurrentLesson((prev) => prev - 1)}
                disabled={currentLesson === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                className="h-10 px-6 rounded-md inline-flex items-center justify-center font-bold border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-100 transition-all"
                onClick={onStartGame}
              >
                Skip to Game
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="mt-3 text-center">
          <button
            onClick={() => onNavigate("home")}
            className="text-sm text-white/70 hover:text-white transition-all"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
