// src/app/games/chess/page.tsx
"use client";

import { useState } from "react";
import { Chess, Square } from "chess.js";
import Link from "next/link";

// Kamus bidak catur ke simbol Unicode
const PIECES_UNICODE: { [key: string]: string } = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

export default function ChessPage() {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  // Dapatkan posisi papan dari chess.js
  // game.board() mengembalikan array 8x8 dari objek bidak atau null
  const board = game.board();

  const handleSquareClick = (square: string) => {
    // Jika ada bidak yang sudah dipilih sebelumnya
    if (selectedSquare) {
      // Coba lakukan gerakan
      try {
        const gameCopy = new Chess(game.fen());
        gameCopy.move({ from: selectedSquare, to: square, promotion: "q" });
        
        setGame(gameCopy);
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      } catch (e) {
        // Gagal gerak (kotak tujuan ilegal), jadi kita reset pilihan
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }

    // Jika belum ada yang dipilih, cek apakah kotak yang diklik ada bidaknya
    const piece = game.get(square as Square);
    if (piece && piece.color === game.turn()) {
      // Ambil semua gerakan legal dari bidak ini
      const moves = game.moves({ square: square as Square, verbose: true });
      const squaresOnly = moves.map((m) => m.to);

      setSelectedSquare(square);
      setLegalMoves(squaresOnly);
    }
  };

  const isCheckmate = game.isCheckmate();
  const isDraw = game.isDraw();
  const turn = game.turn() === "w" ? "Putih" : "Hitam";

  let status = `Giliran: ${turn}`;
  if (isCheckmate) {
    status = `Skakmat! Pemenang: ${turn === "Putih" ? "Hitam" : "Putih"} 🎉`;
  } else if (isDraw) {
    status = "Permainan Seri! 🤝";
  } else if (game.isCheck()) {
    status = `Skak! Giliran: ${turn}`;
  }

  const handleReset = () => {
    setGame(new Chess());
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const handleUndo = () => {
    game.undo();
    setGame(new Chess(game.fen()));
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  // Helper untuk dapatkan nama kotak (misal: 'a8', 'b7') dari index baris & kolom
  const getSquareName = (rowIndex: number, colIndex: number) => {
    const file = "abcdefgh"[colIndex];
    const rank = 8 - rowIndex;
    return `${file}${rank}`;
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-2">Chess</h1>
      
      <div className={`text-xl font-semibold mb-6 ${isCheckmate || isDraw ? "text-green-400" : "text-blue-400"}`}>
        {status}
      </div>

            {/* Papan Catur Custom (CSS Grid) */}
      <div className="grid grid-cols-8 grid-rows-8 w-[90vw] max-w-112.5 aspect-square mb-8 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-800">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const square = getSquareName(rowIndex, colIndex);
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const isSelected = selectedSquare === square;
            const isLegal = legalMoves.includes(square);

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                className={`
                  flex items-center justify-center cursor-pointer relative w-full h-full overflow-hidden
                  ${isLight ? "bg-slate-300" : "bg-slate-700"}
                  ${isSelected ? "bg-yellow-400" : ""} 
                `}
              >
                {/* Titik gerakan legal */}
                {isLegal && !piece && (
                  <div className="w-1/3 h-1/3 bg-black/30 rounded-full"></div>
                )}
                {/* Ring di bidak musuh yang bisa dimakan */}
                {isLegal && piece && (
                  <div className="absolute inset-[5%] border-4 border-black/40 rounded-full"></div>
                )}
                
                {/* Bidak Catur */}
                {piece && (
                  <span 
                    className={`text-3xl sm:text-4xl md:text-5xl leading-none select-none ${piece.color === "w" ? "text-white" : "text-gray-900"}`}
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

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleUndo}
          className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
        >
          ↩️ Undo Gerakan
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-300 transition-colors"
        >
          🔄 Reset Game
        </button>
        <Link
          href="/"
          className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 text-center"
        >
          ← Beranda
        </Link>
      </div>
    </main>
  );
}