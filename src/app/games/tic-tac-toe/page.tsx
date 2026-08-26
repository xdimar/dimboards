// src/app/games/tic-tac-toe/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Square = "X" | "O" | null;

export default function TicTacToePage() {
  // State untuk UI (Lobby vs Game)
  const [gameState, setGameState] = useState<"lobby" | "playing">("lobby");
  
  // State data game dari Supabase
  const [roomCode, setRoomCode] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [playerSymbol, setPlayerSymbol] = useState<"X" | "O">("X");
  
  // State papan game lokal
  const [board, setBoard] = useState<Square[]>(Array(9).fill(null) as Square[]);
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [winner, setWinner] = useState<Square>(null);

  // Fungsi generate kode room acak
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  // --- FUNGSI CREATE ROOM (Player X) ---
  const handleCreateRoom = async () => {
    const newCode = generateRoomCode();
    const emptyBoard = Array(9).fill(null) as Square[];

    // Masukkan data ke table Supabase
    const { error } = await supabase.from("tictactoe_rooms").insert([
      {
        room_code: newCode,
        board: emptyBoard,
        is_x_next: true,
        winner: null,
      },
    ]);

    if (error) {
      alert("Gagal membuat room: " + error.message);
      return;
    }

    setRoomCode(newCode);
    setPlayerSymbol("X");
    setGameState("playing");

    // Listen perubahan data di room ini
    subscribeToRoom(newCode);
  };

  // --- FUNGSI JOIN ROOM (Player O) ---
  const handleJoinRoom = async () => {
    if (inputCode.length < 4) {
      alert("Kode room minimal 4 karakter");
      return;
    }

    // Cari room di Supabase
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
    setPlayerSymbol("O"); // Yang join pasti pemain O
    setBoard(data.board as Square[]);
    setIsXNext(data.is_x_next);
    setWinner(data.winner as Square);
    setGameState("playing");

    // Listen perubahan data di room ini
    subscribeToRoom(inputCode.toUpperCase());
  };

  // --- FUNGSI REAL-TIME LISTENER ---
  const subscribeToRoom = (code: string) => {
    // Setiap ada perubahan di database, update state lokal
    supabase
      .channel(`room:${code}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tictactoe_rooms",
          filter: `room_code=eq.${code}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setBoard(newData.board);
          setIsXNext(newData.is_x_next);
          setWinner(newData.winner);
        }
      )
      .subscribe();
  };

  // --- FUNGSI KLIK KOTAK ---
  const handleClick = async (index: number) => {
    // Cek: Apakah giliran saya? Apakah kotak kosong? Apakah belum ada menang?
    if (board[index] || winner) return;
    if (isXNext !== (playerSymbol === "X")) return; // Kalau bukan giliran saya, abaikan

    const newBoard = [...board];
    newBoard[index] = playerSymbol;
    
    // Cek pemenang lokal
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    let newWinner: Square = null;
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        newWinner = newBoard[a];
        break;
      }
    }

    // Update state lokal biar UI langsung respon (gak nunggu server)
    setBoard(newBoard);
    setIsXNext(!isXNext);
    setWinner(newWinner);

    // Kirim update ke Supabase
    await supabase
      .from("tictactoe_rooms")
      .update({
        board: newBoard,
        is_x_next: !isXNext,
        winner: newWinner,
      })
      .eq("room_code", roomCode);
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
  const status = winner
    ? `Pemenang: ${winner} 🎉`
    : board.every((s) => s !== null)
    ? "Permainan Seri! 🤝"
    : `Giliran: ${isXNext ? "X" : "O"} ${isXNext === (playerSymbol === "X") ? "(Kamu)" : "(Musuh)"}`;

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-2">Tic-Tac-Toe Online</h1>
      <p className="text-gray-400 mb-1">Kode Room: <span className="font-mono font-bold text-white tracking-widest">{roomCode}</span></p>
      <p className="text-sm mb-4">Kamu: <span className={playerSymbol === 'X' ? 'text-blue-400 font-bold' : 'text-red-400 font-bold'}>{playerSymbol}</span></p>
      
      <div className={`text-xl font-semibold mb-6 ${winner ? 'text-green-400' : 'text-blue-400'}`}>
        {status}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-8 bg-gray-800 p-2 rounded-xl">
        {board.map((square, index) => {
          // Tentukan apakah tombol ini boleh diklik
          const isMyTurn = isXNext === (playerSymbol === "X");
          const canClick = !square && !winner && isMyTurn;
          
          return (
            <button
              key={index}
              onClick={() => handleClick(index)}
              className={`w-24 h-24 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center text-4xl font-bold transition-colors ${
                canClick ? "hover:bg-gray-700 cursor-pointer" : "cursor-not-allowed opacity-80"
              }`}
            >
              <span className={square === 'X' ? 'text-blue-400' : 'text-red-400'}>
                {square}
              </span>
            </button>
          );
        })}
      </div>

      <Link href="/" className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors border border-gray-700">
        Keluar dari Room
      </Link>
    </main>
  );
}