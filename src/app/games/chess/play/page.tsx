// src/app/games/chess/play/page.tsx
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { Chess, Square } from "chess.js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const PIECES_UNICODE: { [key: string]: string } = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const loadGameData = (dataStr: string) => {
  const newGame = new Chess();
  if (!dataStr) return newGame;
  if (dataStr.includes("1.") || dataStr.includes("[Event")) {
    newGame.loadPgn(dataStr); 
  } else {
    newGame.load(dataStr); 
  }
  return newGame;
};

function ChessBoardArea() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "local";
  const level = searchParams.get("level") || "medium";
  const roomId = searchParams.get("roomId");
  const myColor = searchParams.get("color") || "w"; 

  const isVsBot = mode === "bot";
  const isMultiplayer = mode === "multiplayer";

  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(isMultiplayer && myColor === "b");
  const [copySuccess, setCopySuccess] = useState("");

  const [roomStatus, setRoomStatus] = useState<string>(isMultiplayer ? "waiting" : "playing");
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [timeOutWinner, setTimeOutWinner] = useState<string | null>(null);

  const engineRef = useRef<Worker | null>(null);
  const latestFenRef = useRef(game.fen());
  const latestPgnRef = useRef(game.pgn());

  const moveSoundRef = useRef<HTMLAudioElement | null>(null);
  const captureSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      moveSoundRef.current = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3");
      captureSoundRef.current = new Audio("https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3");
    }
  }, []);

  useEffect(() => {
    latestFenRef.current = game.fen();
    latestPgnRef.current = game.pgn();
    
    const currentHistory = game.history({ verbose: true });
    if (currentHistory.length > 0) {
      const lastMove = currentHistory[currentHistory.length - 1];
      const isCapture = lastMove.flags.includes('c') || lastMove.flags.includes('e');
      
      if (isCapture) captureSoundRef.current?.play().catch(() => {});
      else moveSoundRef.current?.play().catch(() => {});
    }
  }, [game]);

  const getBotDepth = () => {
    switch (level) {
      case "easy": return 1;
      case "medium": return 5;
      case "hard": return 10;
      case "grandmaster": return 15;
      default: return 5;
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const m = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
    const s = (timeInSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    const isGameStarted = game.fen() !== INITIAL_FEN && roomStatus === "playing";
    if (!isGameStarted || game.isGameOver() || timeOutWinner) return;

    const currentTurn = game.turn(); 

    const timerInterval = setInterval(() => {
      if (currentTurn === "w") {
        setWhiteTime((prev) => {
          if (prev <= 1) { setTimeOutWinner("b"); return 0; }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) { setTimeOutWinner("w"); return 0; }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [game.fen(), timeOutWinner, roomStatus]); 

  useEffect(() => {
    if (typeof window !== "undefined" && isVsBot) {
      engineRef.current = new Worker("/stockfish.js");
      engineRef.current.postMessage("uci");
    }
    return () => { if (engineRef.current) engineRef.current.terminate(); };
  }, [isVsBot]);

  useEffect(() => {
    if (!isMultiplayer || !roomId) return;

    const fetchRoom = async () => {
      const { data } = await supabase.from('chess_rooms').select('*').eq('id', roomId).single();
      if (data) {
        if (data.fen) setGame(loadGameData(data.fen));
        if (data.white_time !== null) setWhiteTime(data.white_time);
        if (data.black_time !== null) setBlackTime(data.black_time);
        if (data.status) setRoomStatus(data.status);

        if (myColor === "b" && data.status === "waiting") {
          await supabase.from('chess_rooms').update({ status: 'playing' }).eq('id', roomId);
          setRoomStatus("playing");
        }
      }
    };
    fetchRoom();

    const channel = supabase.channel(`room-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chess_rooms', filter: `id=eq.${roomId}` }, 
      (payload) => {
        const { fen, white_time, black_time, status } = payload.new;
        if (fen) {
           const syncedGame = loadGameData(fen);
           if (syncedGame.pgn() !== latestPgnRef.current) setGame(syncedGame);
        }
        if (white_time !== null) setWhiteTime(white_time);
        if (black_time !== null) setBlackTime(black_time);
        if (status) setRoomStatus(status);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, isMultiplayer, myColor]);

  useEffect(() => {
    if (isVsBot && game.turn() === "b" && !game.isGameOver() && !timeOutWinner) {
      const engine = engineRef.current;
      if (!engine) return;

      engine.postMessage(`position fen ${game.fen()}`);
      engine.postMessage(`go depth ${getBotDepth()}`);

      engine.onmessage = (event) => {
        const message = event.data;
        if (typeof message === "string" && message.startsWith("bestmove")) {
          const bestMove = message.split(" ")[1]; 
          if (bestMove && bestMove !== "(none)") {
            const from = bestMove.substring(0, 2);
            const to = bestMove.substring(2, 4);
            const promotion = bestMove.length === 5 ? bestMove[4] : "q";

            const gameCopy = new Chess();
            gameCopy.loadPgn(latestPgnRef.current);
            try {
              gameCopy.move({ from, to, promotion });
              setGame(gameCopy);
              setSelectedSquare(null);
              setLegalMoves([]);
            } catch (error) { console.error("Langkah bot tidak valid:", error); }
          }
        }
      };
    }
  }, [game.fen(), isVsBot, level, timeOutWinner]); 

  const handleSquareClick = async (square: string) => {
    if (game.isGameOver() || timeOutWinner || roomStatus === "waiting") return;
    if (isMultiplayer && game.turn() !== myColor) return;
    if (isVsBot && game.turn() === "b") return;

    if (selectedSquare) {
      try {
        const gameCopy = new Chess();
        gameCopy.loadPgn(latestPgnRef.current);
        
        gameCopy.move({ from: selectedSquare, to: square, promotion: "q" });
        setGame(gameCopy);
        setSelectedSquare(null);
        setLegalMoves([]);

        if (isMultiplayer && roomId) {
          supabase.from('chess_rooms').update({ 
            fen: gameCopy.pgn(), 
            white_time: whiteTime,
            black_time: blackTime
          }).eq('id', roomId).then(({ error }) => {
            if (error) console.error("Gagal sinkronisasi langkah:", error);
          });
        }
        return;
      } catch (e) {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }

    const piece = game.get(square as Square);
    if (piece && piece.color === game.turn()) {
      if (isMultiplayer && piece.color !== myColor) return;
      if (isVsBot && piece.color === "b") return;
      const moves = game.moves({ square: square as Square, verbose: true });
      setSelectedSquare(square);
      setLegalMoves(moves.map((m) => typeof m === "string" ? m : m.to));
    }
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      const link = `${window.location.origin}/games/chess/play?mode=multiplayer&roomId=${roomId}&color=b`;
      navigator.clipboard.writeText(link);
      setCopySuccess("Link Tercopy!");
      setTimeout(() => setCopySuccess(""), 2000);
    }
  };

  // --- PERBAIKAN TYPE SCRIPT PADA COUNTS ---
  type PieceType = 'p' | 'n' | 'b' | 'r' | 'q';

  const getCapturedPieces = () => {
    const board = game.board();
    const counts: Record<'w' | 'b', Record<PieceType, number>> = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };
    
    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let wScore = 0; let bScore = 0;

    board.forEach(row => row.forEach(piece => {
      if (piece) {
        if (piece.type !== 'k') {
           counts[piece.color][piece.type as PieceType]++;
        }
        if (piece.color === 'w') wScore += values[piece.type];
        if (piece.color === 'b') bScore += values[piece.type];
      }
    }));

    const maxPieces: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const capturedByWhite: string[] = []; 
    const capturedByBlack: string[] = []; 

    (Object.keys(maxPieces) as PieceType[]).forEach(type => {
      const bLost = maxPieces[type] - counts.b[type];
      for(let i=0; i<bLost; i++) capturedByWhite.push("b" + type.toUpperCase());

      const wLost = maxPieces[type] - counts.w[type];
      for(let i=0; i<wLost; i++) capturedByBlack.push("w" + type.toUpperCase());
    });

    return { 
      capturedByWhite, 
      capturedByBlack, 
      whiteAdvantage: wScore > bScore ? wScore - bScore : 0,
      blackAdvantage: bScore > wScore ? bScore - wScore : 0
    };
  };

  const { capturedByWhite, capturedByBlack, whiteAdvantage, blackAdvantage } = getCapturedPieces();

  if (isMultiplayer && roomStatus === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-md mx-auto text-center bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
        <span className="text-6xl mb-6 block animate-bounce">⏳</span>
        <h2 className="text-2xl font-bold mb-2">Menunggu Lawan...</h2>
        <p className="text-gray-400 mb-8">Pemain Hitam belum bergabung ke dalam room.</p>
        
        <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 mb-6 w-full">
          <p className="text-xs text-gray-500 mb-1">Kode Room</p>
          <span className="text-4xl font-mono tracking-widest text-white font-bold">{roomId}</span>
        </div>

        <button onClick={copyShareLink} className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl shadow transition-colors font-bold flex items-center justify-center gap-2">
          {copySuccess || "📋 Copy Link Invite"}
        </button>
        <Link href="/games/chess" className="mt-6 text-sm text-gray-500 hover:text-gray-300">Batalkan & Kembali</Link>
      </div>
    );
  }

  const isCheckmate = game.isCheckmate();
  const isDraw = game.isDraw();
  const turn = game.turn() === "w" ? "Putih" : "Hitam";

  let status = `Giliran: ${turn}`;
  if (timeOutWinner) status = `Waktu Habis! Pemenang: ${timeOutWinner === "w" ? "Putih" : "Hitam"} ⏱️`;
  else if (isCheckmate) status = `Skakmat! Pemenang: ${game.turn() === "w" ? "Hitam" : "Putih"} 🎉`; // Perbaikan tipe pembanding
  else if (isDraw) status = "Permainan Seri! 🤝";
  else if (game.isCheck()) status = `Skak! Giliran: ${turn}`;

  const handleReset = async () => {
    if (isMultiplayer) return alert("Reset tidak diizinkan di mode multiplayer.");
    setGame(new Chess()); setSelectedSquare(null); setLegalMoves([]);
    setWhiteTime(600); setBlackTime(600); setTimeOutWinner(null);
  };

  const handleUndo = () => {
    if (isMultiplayer) return alert("Undo tidak diizinkan di mode multiplayer.");
    const gameCopy = new Chess();
    gameCopy.loadPgn(latestPgnRef.current);
    gameCopy.undo(); 
    if (isVsBot && gameCopy.turn() === "w") gameCopy.undo();
    setGame(gameCopy); setSelectedSquare(null); setLegalMoves([]);
  };

  const board = game.board();
  const displayRows = isFlipped ? [...board].reverse() : board;
  const displayCols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const files = isFlipped ? ["h", "g", "f", "e", "d", "c", "b", "a"] : ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = isFlipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];

  const historyVerbose = game.history({ verbose: true });
  const allMoves = game.history(); 
  const whiteMovesStr = allMoves.filter((_, i) => i % 2 === 0);
  const blackMovesStr = allMoves.filter((_, i) => i % 2 !== 0);
  
  const lastMove = historyVerbose.length > 0 ? historyVerbose[historyVerbose.length - 1] : null;

  const getGameLabel = () => {
    if (isVsBot) return `Lawan Bot (${level})`;
    if (isMultiplayer) return `Multiplayer (Room: ${roomId})`;
    return "Lokal (Lawan Teman)";
  };

  const topPlayer = isFlipped 
    ? { name: "Putih", time: whiteTime, active: game.turn() === 'w', moves: whiteMovesStr, captured: capturedByWhite, adv: whiteAdvantage } 
    : { name: "Hitam", time: blackTime, active: game.turn() === 'b', moves: blackMovesStr, captured: capturedByBlack, adv: blackAdvantage };
    
  const bottomPlayer = isFlipped 
    ? { name: "Hitam", time: blackTime, active: game.turn() === 'b', moves: blackMovesStr, captured: capturedByBlack, adv: blackAdvantage } 
    : { name: "Putih", time: whiteTime, active: game.turn() === 'w', moves: whiteMovesStr, captured: capturedByWhite, adv: whiteAdvantage };

  return (
    <div className="flex flex-col gap-8 items-center justify-center w-full max-w-5xl relative">
      <style>{`
        @keyframes dropIn {
          0% { transform: scale(1.4) translateY(-10px); filter: drop-shadow(0 10px 10px rgba(0,0,0,0.5)); }
          100% { transform: scale(1) translateY(0); filter: drop-shadow(0 0px 0px rgba(0,0,0,0)); }
        }
        .animate-drop {
          animation: dropIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      <div className="flex flex-col items-center w-full lg:w-auto">
        <h1 className="text-3xl font-bold mb-1">Chess</h1>
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full border border-gray-700 inline-block mb-2">
            Mode: {getGameLabel()}
          </p>
          {isMultiplayer && (
            <div className="flex flex-col items-center gap-2 mt-1">
              <p className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                Kamu bermain sebagai: {myColor === 'w' ? "Putih (White)" : "Hitam (Black)"}
              </p>
            </div>
          )}
        </div>
        
        <div className={`text-xl font-semibold mb-2 ${isCheckmate || isDraw || timeOutWinner ? "text-green-400" : "text-blue-400"}`}>
          {status}
        </div>

        {/* UI TOP PLAYER */}
        <div className="flex flex-col w-[85vw] max-w-125 mb-2 px-1">
          <div className="flex justify-between w-full items-start">
            <div className="flex flex-col">
              <span className="font-bold text-gray-300 text-lg leading-none">{topPlayer.name}</span>
              <div className="flex items-center text-lg mt-1.5 min-h-6">
                {topPlayer.captured.map((c, i) => (
                  <span key={i} className="text-gray-400 -ml-1 drop-shadow-md">{PIECES_UNICODE[c]}</span>
                ))}
                {topPlayer.adv > 0 && (
                  <span className="ml-2 text-sm text-green-400 font-bold bg-green-900/30 px-1.5 rounded">+{topPlayer.adv}</span>
                )}
              </div>
            </div>

            <div className={`px-4 py-1 rounded font-mono text-lg font-bold transition-colors ${topPlayer.active && !game.isGameOver() && !timeOutWinner ? "bg-gray-100 text-gray-900 shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "bg-gray-800 text-gray-400 border border-gray-700"}`}>
              ⏱ {formatTime(topPlayer.time)}
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-2 whitespace-nowrap overflow-x-auto scrollbar-hide text-left flex gap-1">
            {topPlayer.moves.length > 0 ? topPlayer.moves.map((m, i) => (<span key={i}>{m} {i < topPlayer.moves.length - 1 && " > "}</span>)) : "Belum ada langkah"}
          </div>
        </div>

        {/* PAPAN CATUR */}
        <div className="flex w-full max-w-[95vw] md:max-w-none justify-center">
          <div className="flex flex-col justify-around py-[2%] mr-1">
            {ranks.map((r) => <div key={r} className="text-xs text-gray-500 font-bold flex items-center justify-center h-[10%]">{r}</div>)}
          </div>
          <div className="flex flex-col">
            <div className="grid grid-cols-8 grid-rows-8 w-[85vw] max-w-125 aspect-square rounded-lg overflow-hidden shadow-2xl border-2 border-gray-800">
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

        {/* UI BOTTOM PLAYER */}
        <div className="flex flex-col w-[85vw] max-w-125 mt-2 px-1">
          <div className="flex justify-between w-full items-start">
            <div className="flex flex-col">
              <span className="font-bold text-gray-300 text-lg leading-none">{bottomPlayer.name} {isMultiplayer && "(Kamu)"}</span>
              <div className="flex items-center text-lg mt-1.5 min-h-6">
                {bottomPlayer.captured.map((c, i) => (
                  <span key={i} className="text-gray-400 -ml-1 drop-shadow-md">{PIECES_UNICODE[c]}</span>
                ))}
                {bottomPlayer.adv > 0 && (
                  <span className="ml-2 text-sm text-green-400 font-bold bg-green-900/30 px-1.5 rounded">+{bottomPlayer.adv}</span>
                )}
              </div>
            </div>

            <div className={`px-4 py-1 rounded font-mono text-lg font-bold transition-colors ${bottomPlayer.active && !game.isGameOver() && !timeOutWinner ? "bg-gray-100 text-gray-900 shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "bg-gray-800 text-gray-400 border border-gray-700"}`}>
              ⏱ {formatTime(bottomPlayer.time)}
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-2 whitespace-nowrap overflow-x-auto scrollbar-hide text-left flex gap-1">
            {bottomPlayer.moves.length > 0 ? bottomPlayer.moves.map((m, i) => (<span key={i}>{m} {i < bottomPlayer.moves.length - 1 && " > "}</span>)) : "Belum ada langkah"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          <button onClick={() => setIsFlipped(!isFlipped)} className="px-4 py-2 bg-gray-700 text-white text-sm font-semibold rounded-lg hover:bg-gray-600 border border-gray-600">🔄 Flip Papan</button>
          {!isMultiplayer && (
            <>
              <button onClick={handleUndo} className="px-4 py-2 bg-gray-700 text-white text-sm font-semibold rounded-lg hover:bg-gray-600 border border-gray-600">↩️ Undo</button>
              <button onClick={handleReset} className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-300">Reset Game</button>
            </>
          )}
          <Link href="/games/chess" className="px-4 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 border border-gray-700">← Menu Utama</Link>
        </div>
      </div>
    </div>
  );
}

export default function ChessPlayPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-xl font-bold animate-pulse text-gray-400">Memuat Arena Catur...</div>}>
        <ChessBoardArea />
      </Suspense>
    </main>
  );
}