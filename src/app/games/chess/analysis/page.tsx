// src/app/games/chess/analysis/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Chess, Square } from "chess.js";
import Link from "next/link";
import AdBanner from "@/components/AdBanner";

const PIECES_UNICODE: { [key: string]: string } = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

export type MoveBadgeType = "brilliant" | "best" | "good" | "inaccuracy" | "blunder" | null;

interface MoveRecord {
  san: string;
  from: string;
  to: string;
  badge: MoveBadgeType;
  playerColor: "w" | "b";
  isSacrifice: boolean;
  evalBefore: number;
  evalAfter?: number;
}

export default function ChessAnalysisPage() {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [bestMoveCoords, setBestMoveCoords] = useState<{ from: string; to: string } | null>(null);
  const [searchDepth, setSearchDepth] = useState<number>(0);
  const [targetDepth, setTargetDepth] = useState<number>(12);
  const [evaluation, setEvaluation] = useState<number>(0);
  const [mateIn, setMateIn] = useState<number | null>(null);
  
  const [moveRecords, setMoveRecords] = useState<MoveRecord[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const [showFenModal, setShowFenModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [fenInput, setFenInput] = useState("");

  const engineRef = useRef<Worker | null>(null);
  const currentEvalRef = useRef<number>(0);
  const bestMoveBeforeMoveRef = useRef<{ from: string; to: string } | null>(null);

  const moveSoundRef = useRef<HTMLAudioElement | null>(null);
  const captureSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    currentEvalRef.current = evaluation;
  }, [evaluation]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      moveSoundRef.current = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3");
      captureSoundRef.current = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3");
      
      const worker = new Worker("/stockfish.js");
      worker.postMessage("uci");
      worker.postMessage("setoption name Hash value 64");
      worker.postMessage("isready");

      engineRef.current = worker;
    }

    return () => {
      if (engineRef.current) engineRef.current.terminate();
    };
  }, []);

  const playMoveSound = (isCapture: boolean) => {
    if (isCapture) {
      captureSoundRef.current?.play().catch(() => {});
    } else {
      moveSoundRef.current?.play().catch(() => {});
    }
  };

  // Fungsi Klasifikasi Langkah Berdasarkan Selisih Evaluasi Riil
  const calculateBadge = (
    from: string,
    to: string,
    playerColor: "w" | "b",
    isSacrifice: boolean,
    prevEval: number,
    nextEval: number,
    wasBestMove: boolean
  ): MoveBadgeType => {
    // Menghitung selisih keuntungan langkah bagi pemain yang baru saja melangkah
    const evalLoss = playerColor === "w" ? prevEval - nextEval : nextEval - prevEval;

    if (isSacrifice && (evalLoss <= 0.2 || wasBestMove)) return "brilliant";
    if (wasBestMove || evalLoss <= 0.15) return "best";
    if (evalLoss <= 0.6) return "good";
    if (evalLoss <= 1.8) return "inaccuracy";
    return "blunder";
  };

  // Stockfish Evaluator Engine
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || game.isGameOver()) {
      setBestMoveCoords(null);
      setSearchDepth(0);
      return;
    }

    setBestMoveCoords(null);
    setSearchDepth(0);
    
    engine.postMessage("stop");
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage(`go depth ${targetDepth} movetime 2500`);

    engine.onmessage = (event) => {
      const message = event.data;
      if (typeof message === "string") {
        if (message.includes("depth ")) {
          const match = message.match(/depth\s+(\d+)/);
          if (match) setSearchDepth(parseInt(match[1], 10));
        }

        let parsedEval: number | null = null;

        if (message.includes("score cp ")) {
          const match = message.match(/score cp (-?\d+)/);
          if (match) {
            let cp = parseInt(match[1], 10) / 100;
            if (game.turn() === "b") cp = -cp;
            setEvaluation(cp);
            setMateIn(null);
            parsedEval = cp;
          }
        } else if (message.includes("score mate ")) {
          const match = message.match(/score mate (-?\d+)/);
          if (match) {
            let mate = parseInt(match[1], 10);
            if (game.turn() === "b") mate = -mate;
            setMateIn(mate);
            parsedEval = mate > 0 ? 10 : -10;
          }
        }

        // UPDATE BADGE SETELAH EVALUASI POSISI BARU DIDAPATKAN
        if (parsedEval !== null && moveRecords.length > 0 && currentStep === moveRecords.length) {
          const lastIdx = moveRecords.length - 1;
          const targetRecord = moveRecords[lastIdx];

          if (targetRecord.evalAfter === undefined) {
            const wasBest = bestMoveBeforeMoveRef.current?.from === targetRecord.from && 
                            bestMoveBeforeMoveRef.current?.to === targetRecord.to;

            const finalBadge = calculateBadge(
              targetRecord.from,
              targetRecord.to,
              targetRecord.playerColor,
              targetRecord.isSacrifice,
              targetRecord.evalBefore,
              parsedEval,
              wasBest
            );

            setMoveRecords((prev) => {
              const copy = [...prev];
              copy[lastIdx] = {
                ...copy[lastIdx],
                evalAfter: parsedEval as number,
                badge: finalBadge,
              };
              return copy;
            });
          }
        }

        if (message.startsWith("bestmove")) {
          const bestMove = message.split(" ")[1];
          if (bestMove && bestMove !== "(none)") {
            const from = bestMove.substring(0, 2);
            const to = bestMove.substring(2, 4);
            setBestMoveCoords({ from, to });
          } else {
            setBestMoveCoords(null);
          }
        }
      }
    };
  }, [game, targetDepth]);

  const handleSquareClick = (square: string) => {
    if (game.isGameOver()) return;

    const clickedPiece = game.get(square as Square);

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      if (legalMoves.includes(square)) {
        try {
          const gameCopy = new Chess(game.fen());
          const targetPiece = gameCopy.get(square as Square);
          const movingPiece = gameCopy.get(selectedSquare as Square);
          const isCapture = !!targetPiece;
          const playerColor = gameCopy.turn();

          const isSacrifice = movingPiece && ["q", "r", "b", "n"].includes(movingPiece.type) && !targetPiece;

          // Simpan langkah rekomendasi sebelum bidak digeser
          bestMoveBeforeMoveRef.current = bestMoveCoords;

          const move = gameCopy.move({
            from: selectedSquare,
            to: square,
            promotion: "q",
          });

          if (move) {
            const prevEval = currentEvalRef.current;

            const newRecord: MoveRecord = {
              san: move.san,
              from: selectedSquare,
              to: square,
              badge: null, // Menunggu evaluasi engine posisi baru
              playerColor,
              isSacrifice: !!isSacrifice,
              evalBefore: prevEval,
            };

            const updatedHistory = moveRecords.slice(0, currentStep);
            updatedHistory.push(newRecord);

            setMoveRecords(updatedHistory);
            setCurrentStep(updatedHistory.length);
            setGame(gameCopy);
            setSelectedSquare(null);
            setLegalMoves([]);
            playMoveSound(isCapture);
            return;
          }
        } catch {
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
      }

      if (clickedPiece && clickedPiece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square: square as Square, verbose: true });
        setLegalMoves(moves.map((m) => m.to));
        return;
      }

      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (clickedPiece && clickedPiece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square: square as Square, verbose: true });
      setLegalMoves(moves.map((m) => m.to));
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex < 0 || stepIndex > moveRecords.length) return;
    
    const replayGame = new Chess();
    for (let i = 0; i < stepIndex; i++) {
      replayGame.move(moveRecords[i].san);
    }

    setGame(replayGame);
    setCurrentStep(stepIndex);
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const handleImportFen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fenInput.trim()) return;

    try {
      const newGame = new Chess(fenInput.trim());
      setGame(newGame);
      setMoveRecords([]);
      setCurrentStep(0);
      setShowFenModal(false);
      setFenInput("");
    } catch {
      alert("Format FEN tidak valid!");
    }
  };

  const getSvgCoordinates = (square: string) => {
    const file = square.charCodeAt(0) - 97; 
    const rank = parseInt(square[1], 10) - 1;   

    const xFile = isFlipped ? 7 - file : file;
    const yRank = isFlipped ? rank : 7 - rank;

    const cx = (xFile + 0.5) * 12.5;
    const cy = (yRank + 0.5) * 12.5;

    return { x: cx, y: cy };
  };

  type PieceType = "p" | "n" | "b" | "r" | "q";
  const getCapturedPieces = () => {
    const board = game.board();
    const counts: Record<"w" | "b", Record<PieceType, number>> = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };
    
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let wScore = 0; 
    let bScore = 0;

    board.forEach(row => row.forEach(piece => {
      if (piece) {
        if (piece.type !== "k") {
           counts[piece.color][piece.type as PieceType]++;
        }
        if (piece.color === "w") wScore += values[piece.type];
        if (piece.color === "b") bScore += values[piece.type];
      }
    }));

    const maxPieces: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const capturedByWhite: string[] = []; 
    const capturedByBlack: string[] = []; 

    (Object.keys(maxPieces) as PieceType[]).forEach(type => {
      const bLost = maxPieces[type] - counts.b[type];
      for(let i = 0; i < bLost; i++) capturedByWhite.push("b" + type.toUpperCase());

      const wLost = maxPieces[type] - counts.w[type];
      for(let i = 0; i < wLost; i++) capturedByBlack.push("w" + type.toUpperCase());
    });

    return { 
      capturedByWhite, 
      capturedByBlack, 
      whiteAdvantage: wScore > bScore ? wScore - bScore : 0,
      blackAdvantage: bScore > wScore ? bScore - wScore : 0
    };
  };

  const { capturedByWhite, capturedByBlack, whiteAdvantage, blackAdvantage } = getCapturedPieces();

  const handleReset = () => {
    setGame(new Chess());
    setSelectedSquare(null);
    setLegalMoves([]);
    setBestMoveCoords(null);
    setSearchDepth(0);
    setEvaluation(0);
    setMateIn(null);
    setMoveRecords([]);
    setCurrentStep(0);
  };

  const board = game.board();
  const displayRows = isFlipped ? [...board].reverse() : board;
  const displayCols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const files = isFlipped ? ["h", "g", "f", "e", "d", "c", "b", "a"] : ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = isFlipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];

  const historyVerbose = game.history({ verbose: true });
  const lastMove = historyVerbose.length > 0 ? historyVerbose[historyVerbose.length - 1] : null;
  const lastRecord = moveRecords.length > 0 && currentStep > 0 ? moveRecords[currentStep - 1] : null;
  const turn = game.turn() === "w" ? "Putih" : "Hitam";

  const topPlayer = isFlipped 
    ? { name: "Putih", active: game.turn() === "w", captured: capturedByWhite, adv: whiteAdvantage } 
    : { name: "Hitam", active: game.turn() === "b", captured: capturedByBlack, adv: blackAdvantage };
    
  const bottomPlayer = isFlipped 
    ? { name: "Hitam", active: game.turn() === "b", captured: capturedByBlack, adv: blackAdvantage } 
    : { name: "Putih", active: game.turn() === "w", captured: capturedByWhite, adv: whiteAdvantage };

  const calculateWhiteBarPercent = () => {
    if (mateIn !== null) {
      return mateIn > 0 ? 100 : 0;
    }
    const winChance = 1 / (1 + Math.pow(10, -evaluation / 4));
    return Math.min(Math.max(winChance * 100, 5), 95);
  };

  const whitePercent = calculateWhiteBarPercent();
  const evalDisplay = mateIn !== null ? `#M${Math.abs(mateIn)}` : `${evaluation > 0 ? "+" : ""}${evaluation.toFixed(1)}`;

  const renderBadgeIcon = (badge: MoveBadgeType) => {
    switch (badge) {
      case "brilliant":
        return <span className="text-cyan-400 font-bold flex items-center gap-1">💎 Brilliant</span>;
      case "best":
        return <span className="text-emerald-400 font-bold flex items-center gap-1">⭐ Best Move</span>;
      case "good":
        return <span className="text-blue-400 font-bold flex items-center gap-1">👍 Good</span>;
      case "inaccuracy":
        return <span className="text-amber-400 font-bold flex items-center gap-1">⚠️ Inaccuracy</span>;
      case "blunder":
        return <span className="text-rose-500 font-bold flex items-center gap-1">❌ Blunder</span>;
      default:
        return <span className="text-gray-500 text-xs italic animate-pulse">Menilai langkah...</span>;
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <style>{`
        @keyframes dropIn {
          0% { transform: scale(1.4) translateY(-10px); filter: drop-shadow(0 10px 10px rgba(0,0,0,0.5)); }
          100% { transform: scale(1) translateY(0); filter: drop-shadow(0 0px 0px rgba(0,0,0,0)); }
        }
        .animate-drop {
          animation: dropIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      <div className="flex flex-col items-center w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-1">Chess Analysis Board</h1>
        
        {/* STOCKFISH DEPTH & EVAL HEADER */}
        <div className="w-[85vw] max-w-125 flex items-center justify-between bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl mb-3 shadow-md text-xs font-mono">
          <span className="text-amber-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Stockfish
          </span>
          <span className="text-gray-400">
            Eval: <strong className="text-white bg-gray-800 px-2 py-0.5 rounded border border-gray-700">{evalDisplay}</strong>
          </span>
          <span className="text-gray-400">
            Depth: <strong className="text-white">{searchDepth} / {targetDepth}</strong>
          </span>
        </div>

        {/* MOVE CLASSIFICATION BADGE BANNER */}
        {lastRecord && (
          <div className="w-[85vw] max-w-125 flex items-center justify-between bg-gray-900/80 border border-gray-800 px-4 py-1.5 rounded-lg mb-2 shadow-sm text-xs">
            <span className="text-gray-400">Langkah: <strong className="text-white font-mono">{lastRecord.san}</strong></span>
            {renderBadgeIcon(lastRecord.badge)}
          </div>
        )}

        {/* UI TOP PLAYER */}
        <div className="flex flex-col w-[85vw] max-w-125 mb-2 px-1">
          <div className="flex justify-between w-full items-start">
            <div className="flex flex-col">
              <span className={`font-bold text-lg leading-none ${topPlayer.active ? "text-amber-400 font-extrabold" : "text-gray-400"}`}>
                {topPlayer.name} {topPlayer.active && "•"}
              </span>
              <div className="flex items-center text-lg mt-1.5 min-h-6">
                {topPlayer.captured.map((c, i) => (
                  <span key={i} className="text-gray-400 -ml-1 drop-shadow-md">{PIECES_UNICODE[c]}</span>
                ))}
                {topPlayer.adv > 0 && (
                  <span className="ml-2 text-sm text-green-400 font-bold bg-green-900/30 px-1.5 rounded">+{topPlayer.adv}</span>
                )}
              </div>
            </div>
            <div className="text-xs text-blue-400 font-semibold bg-gray-900 px-2 py-1 rounded border border-gray-800">
              Giliran: <span className="text-white font-bold">{turn}</span>
            </div>
          </div>
        </div>

        {/* PAPAN CATUR + EVALUATION BAR */}
        <div className="flex w-full max-w-[95vw] md:max-w-none justify-center gap-2">
          
          <div className="w-4 sm:w-5 bg-gray-900 border-2 border-gray-800 rounded-md overflow-hidden flex flex-col justify-end relative shadow-lg">
            <div 
              className="w-full bg-slate-200 transition-all duration-300 ease-out" 
              style={{ height: `${isFlipped ? 100 - whitePercent : whitePercent}%` }}
            />
          </div>

          <div className="flex">
            <div className="flex flex-col justify-around py-[2%] mr-1">
              {ranks.map((r) => <div key={r} className="text-xs text-gray-500 font-bold flex items-center justify-center h-[10%]">{r}</div>)}
            </div>

            <div className="flex flex-col relative">
              {bestMoveCoords && (() => {
                const start = getSvgCoordinates(bestMoveCoords.from);
                const end = getSvgCoordinates(bestMoveCoords.to);
                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                    <defs>
                      <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="#f59e0b" />
                      </marker>
                    </defs>
                    <line
                      x1={`${start.x}%`} y1={`${start.y}%`}
                      x2={`${end.x}%`} y2={`${end.y}%`}
                      stroke="#f59e0b" strokeWidth="4" strokeOpacity="0.85" strokeLinecap="round"
                      markerEnd="url(#arrowhead)"
                    />
                  </svg>
                );
              })()}

              <div className="grid grid-cols-8 grid-rows-8 w-[80vw] sm:w-[85vw] max-w-125 aspect-square rounded-lg overflow-hidden shadow-2xl border-2 border-gray-800 relative">
                {displayRows.map((row, rowIndex) =>
                  displayCols.map((colIndex) => {
                    const actualRow = isFlipped ? 7 - rowIndex : rowIndex;
                    const actualCol = isFlipped ? 7 - colIndex : colIndex;
                    const square = `${files[colIndex]}${ranks[rowIndex]}`;
                    
                    const isLight = (actualRow + actualCol) % 2 === 0;
                    const isSelected = selectedSquare === square;
                    const isLegal = legalMoves.includes(square);
                    const piece = board[actualRow][actualCol];

                    const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
                    const isJustLanded = lastMove && lastMove.to === square;

                    return (
                      <div
                        key={square} onClick={() => handleSquareClick(square)}
                        className={`flex items-center justify-center cursor-pointer relative w-full h-full overflow-hidden transition-colors
                          ${isLight ? "bg-slate-300" : "bg-slate-700"}
                          ${isLastMove ? (isLight ? "bg-yellow-200!" : "bg-yellow-600/80!") : ""}
                          ${isSelected ? "bg-blue-400!" : ""} 
                        `}
                      >
                        {rowIndex === 7 && <span className={`absolute bottom-0 right-0.5 text-[10px] font-bold ${isLight && !isLastMove ? "text-slate-700" : "text-white mix-blend-difference"}`}>{files[colIndex]}</span>}
                        {colIndex === 0 && <span className={`absolute top-0 left-0.5 text-[10px] font-bold ${isLight && !isLastMove ? "text-slate-700" : "text-white mix-blend-difference"}`}>{ranks[rowIndex]}</span>}
                        {isLegal && !piece && <div className="w-1/3 h-1/3 bg-black/30 rounded-full"></div>}
                        {isLegal && piece && <div className="absolute inset-[5%] border-4 border-black/40 rounded-full"></div>}
                        
                        {piece && (
                          <span 
                            className={`text-3xl sm:text-4xl md:text-5xl leading-none select-none relative z-10 
                              ${piece.color === "w" ? "text-white" : "text-gray-900"}
                              ${isJustLanded ? "animate-drop" : ""}
                            `} 
                            style={{ textShadow: piece.color === "w" ? "0 0 2px black" : "none" }}
                          >
                            {PIECES_UNICODE[piece.color + piece.type.toUpperCase()]}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* UI BOTTOM PLAYER */}
        <div className="flex flex-col w-[85vw] max-w-125 mt-2 px-1">
          <div className="flex justify-between w-full items-start">
            <div className="flex flex-col">
              <span className={`font-bold text-lg leading-none ${bottomPlayer.active ? "text-amber-400 font-extrabold" : "text-gray-400"}`}>
                {bottomPlayer.name} {bottomPlayer.active && "•"}
              </span>
              <div className="flex items-center text-lg mt-1.5 min-h-6">
                {bottomPlayer.captured.map((c, i) => (
                  <span key={i} className="text-gray-400 -ml-1 drop-shadow-md">{PIECES_UNICODE[c]}</span>
                ))}
                {bottomPlayer.adv > 0 && (
                  <span className="ml-2 text-sm text-green-400 font-bold bg-green-900/30 px-1.5 rounded">+{bottomPlayer.adv}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGASI RIWAYAT LANGKAH */}
        <div className="flex items-center gap-2 mt-4 bg-gray-900 border border-gray-800 p-2 rounded-xl shadow-md w-[85vw] max-w-125 justify-between">
          <div className="flex gap-1">
            <button 
              onClick={() => goToStep(0)} 
              disabled={currentStep === 0}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-sm font-bold border border-gray-700"
            >
              |◀
            </button>
            <button 
              onClick={() => goToStep(currentStep - 1)} 
              disabled={currentStep === 0}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-sm font-bold border border-gray-700"
            >
              ◀
            </button>
            <button 
              onClick={() => goToStep(currentStep + 1)} 
              disabled={currentStep === moveRecords.length}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-sm font-bold border border-gray-700"
            >
              ▶
            </button>
            <button 
              onClick={() => goToStep(moveRecords.length)} 
              disabled={currentStep === moveRecords.length}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-sm font-bold border border-gray-700"
            >
              ▶|
            </button>
          </div>

          <span className="text-xs font-mono text-gray-400">
            Langkah: <strong className="text-white">{currentStep}</strong> / {moveRecords.length}
          </span>
        </div>

        {/* TOMBOL KONTROL & PENGATURAN */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          <button onClick={() => setIsFlipped(!isFlipped)} className="px-3 py-2 bg-gray-800 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 border border-gray-700">
            🔄 Flip
          </button>
          <button onClick={() => setShowSettingsModal(true)} className="px-3 py-2 bg-gray-800 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 border border-gray-700 flex items-center gap-1">
            ⚙️ Engine Settings
          </button>
          <button onClick={() => setShowFenModal(true)} className="px-3 py-2 bg-gray-800 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 border border-gray-700">
            📥 Import FEN
          </button>
          <button onClick={handleReset} className="px-3 py-2 bg-white text-black text-xs font-semibold rounded-lg hover:bg-gray-300">
            Reset Papan
          </button>
          <Link href="/games/chess" className="px-3 py-2 bg-gray-800 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 border border-gray-700">
            ← Menu Catur
          </Link>
        </div>
      </div>

      {/* MODAL ENGINE SETTINGS */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-2">Engine Settings</h3>
            <p className="text-xs text-gray-400 mb-4">Sesuaikan kedalaman kalkulasi Stockfish.</p>
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">Search Depth:</span>
                <span className="text-amber-400 font-bold">{targetDepth}</span>
              </div>
              <input
                type="range"
                min="6"
                max="18"
                step="1"
                value={targetDepth}
                onChange={(e) => setTargetDepth(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>Cepat (Depth 6)</span>
                <span>Mendalam (Depth 18)</span>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT FEN */}
      {showFenModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-2">Import Posisi FEN</h3>
            <p className="text-xs text-gray-400 mb-4">Tempelkan (paste) string FEN untuk menganalisis posisi tertentu.</p>
            <form onSubmit={handleImportFen} className="flex flex-col gap-3">
              <input
                type="text"
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
                placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowFenModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg"
                >
                  Terapkan Posisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AdBanner />
    </main>
  );
}