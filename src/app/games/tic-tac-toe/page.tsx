// src/app/games/tic-tac-toe/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AdBanner from "@/components/AdBanner";

type Square = "X" | "O" | null;

export default function TicTacToePage() {
  const [gameState, setGameState] = useState<"lobby" | "playing">("lobby");
  
  const [roomCode, setRoomCode] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [playerSymbol, setPlayerSymbol] = useState<"X" | "O">("X");
  
  const [board, setBoard] = useState<Square[]>(Array(9).fill(null) as Square[]);
  const [isXNext, setIsXNext] = useState<boolean>(true);
  
  // State untuk fitur polish
  const [winner, setWinner] = useState<Square>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  // Fungsi pengecek pemenang sekaligus dapat index kotaknya
  const calculateWinner = (squares: Square[]): { winner: Square; line: number[] | null } => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    return { winner: null, line: null };
  };

  const handleCreateRoom = async () => {
    const newCode = generateRoomCode();
    const emptyBoard = Array(9).fill(null) as Square[];

    const { error } = await supabase.from("tictactoe_rooms").insert([
      { room_code: newCode, board: emptyBoard, is_x_next: true, winner: null },
    ]);

    if (error) {
      alert("Gagal membuat room: " + error.message);
      return;
    }

    setRoomCode(newCode);
    setPlayerSymbol("X");
    setGameState("playing");
    subscribeToRoom(newCode);
  };

  const handleJoinRoom = async () => {
    if (inputCode.length < 4) {
      alert("Kode room minimal 4 karakter");
      return;
    }

    const { data, error } = await supabase
      .from("tictactoe_rooms")
      .select("*")
      .eq("room_code", inputCode.toUpperCase())
      .single();

    if (error || !data) {
      alert("Room tidak ditemukan!");
      return;
    }

    setRoomCode(data.room_code);
    setPlayerSymbol("O");
    setBoard(data.board as Square[]);
    setIsXNext(data.is_x_next);
    setWinner(data.winner as Square);
    
    // Cek jika room yang dimasuki sudah ada pemenangnya
    const result = calculateWinner(data.board as Square[]);
    setWinningLine(result.line);

    setGameState("playing");
    subscribeToRoom(inputCode.toUpperCase());
  };

  const subscribeToRoom = (code: string) => {
    supabase
      .channel(`room:${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tictactoe_rooms", filter: `room_code=eq.${code}` },
        (payload) => {
          const newData = payload.new as any;
          setBoard(newData.board);
          setIsXNext(newData.is_x_next);
          setWinner(newData.winner);
          
          // Update garis menang saat ada perubahan dari musuh
          const result = calculateWinner(newData.board);
          setWinningLine(result.line);
        }
      )
      .subscribe();
  };

  const handleClick = async (index: number) => {
    if (board[index] || winner) return;
    if (isXNext !== (playerSymbol === "X")) return;

    const newBoard = [...board];
    newBoard[index] = playerSymbol;
    
    const result = calculateWinner(newBoard);
    const newWinner = result.winner;

    setBoard(newBoard);
    setIsXNext(!isXNext);
    setWinner(newWinner);
    setWinningLine(result.line);

    await supabase
      .from("tictactoe_rooms")
      .update({ board: newBoard, is_x_next: !isXNext, winner: newWinner })
      .eq("room_code", roomCode);
  };

  // Fungsi Play Again (Reset papan di Supabase)
  const handlePlayAgain = async () => {
    const emptyBoard = Array(9).fill(null) as Square[];
    setBoard(emptyBoard);
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);

    await supabase
      .from("tictactoe_rooms")
      .update({ board: emptyBoard, is_x_next: true, winner: null })
      .eq("room_code", roomCode);
  };

  // Fungsi Copy Kode
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000); // Reset teks setelah 2 detik
  };

  // --- UI LOBBY ---
  if (gameState === "lobby") {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold mb-8">Tic-Tac-Toe Online</h1>
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-sm">
          <button onClick={handleCreateRoom} className="w-full mb-6 px-4 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
            Buat Room Baru (Main sebagai X)
          </button>
          
          <div className="border-t border-gray-700 pt-6">
            <p className="text-center text-gray-400 mb-4 text-sm">ATAU</p>
            <input
              type="text"
              placeholder="Masukkan Kode Room"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg mb-4 uppercase text-center tracking-widest focus:outline-none focus:border-blue-500"
            />
            <button onClick={handleJoinRoom} className="w-full px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors font-semibold">
              Gabung Room (Main sebagai O)
            </button>
          </div>
        </div>
        <Link href="/" className="mt-8 text-gray-500 hover:text-white transition-colors">
          ← Kembali ke Beranda
        </Link>
      </main>
    );
  }

  // --- UI GAME ---
  const isDraw = !winner && board.every((s) => s !== null);
  const status = winner
    ? `Pemenang: ${winner} 🎉`
    : isDraw
    ? "Permainan Seri! 🤝"
    : `Giliran: ${isXNext ? "X" : "O"} ${isXNext === (playerSymbol === "X") ? "(Kamu)" : "(Musuh)"}`;

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-2">Tic-Tac-Toe Online</h1>
      
      {/* Bagian Kode Room + Copy */}
      <div className="flex items-center gap-2 mb-1 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
        <p className="text-gray-400 text-sm">Kode Room:</p>
        <span className="font-mono font-bold text-white tracking-widest">{roomCode}</span>
        <button onClick={handleCopyCode} className="text-blue-400 hover:text-blue-300 transition-colors ml-2 text-sm font-medium">
          {isCopied ? "Tersalin!" : "Copy"}
        </button>
      </div>
      
      <p className="text-sm mb-4">Kamu: <span className={playerSymbol === 'X' ? 'text-blue-400 font-bold' : 'text-red-400 font-bold'}>{playerSymbol}</span></p>
      
      <div className={`text-xl font-semibold mb-6 ${winner ? 'text-green-400' : 'text-blue-400'}`}>
        {status}
      </div>

      {/* Papan Game dengan Highlight */}
      <div className="grid grid-cols-3 gap-2 mb-6 bg-gray-800 p-2 rounded-xl">
        {board.map((square, index) => {
          const isMyTurn = isXNext === (playerSymbol === "X");
          const canClick = !square && !winner && isMyTurn;
          // Cek apakah kotak ini bagian dari garis menang
          const isWinningSquare = winningLine?.includes(index);
          
          return (
            <button
              key={index}
              onClick={() => handleClick(index)}
              className={`w-24 h-24 bg-gray-900 border rounded-lg flex items-center justify-center text-4xl font-bold transition-all duration-200 ${
                isWinningSquare 
                  ? "bg-green-500/20 border-green-500 scale-105" /* Efek menang */
                  : canClick 
                  ? "border-gray-700 hover:bg-gray-700 cursor-pointer hover:scale-105" 
                  : "border-gray-700 cursor-not-allowed opacity-80"
              }`}
            >
              <span className={square === 'X' ? 'text-blue-400' : 'text-red-400'}>
                {square}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tombol Aksi: Main Lagi / Keluar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {(winner || isDraw) && (
          <button
            onClick={handlePlayAgain}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            🔄 Main Lagi
          </button>
        )}
        <Link
          href="/"
          className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 text-center"
        >
          Keluar dari Room
        </Link>
      </div>
      <AdBanner />
    </main>
  );
}