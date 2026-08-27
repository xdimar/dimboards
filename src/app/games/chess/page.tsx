// src/app/games/chess/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Setup Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ChessLobbyPage() {
  const router = useRouter();
  const [showBotLevels, setShowBotLevels] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // State untuk durasi waktu (default 10 menit = 600 detik)
  const [selectedTime, setSelectedTime] = useState(600);

  const startGame = (mode: string, level?: string) => {
    let url = `/games/chess/play?mode=${mode}`;
    if (level) url += `&level=${level}`;
    router.push(url);
  };

  const createRoom = async () => {
    setIsLoading(true);
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Insert room ke Supabase dengan status waiting dan waktu yang dipilih
    const { error } = await supabase.from('chess_rooms').insert([
      {
        id: newRoomId,
        status: 'waiting',
        white_time: selectedTime,
        black_time: selectedTime
      }
    ]);

    setIsLoading(false);
    if (error) {
      alert("Gagal membuat room!");
      return;
    }
    router.push(`/games/chess/play?mode=multiplayer&roomId=${newRoomId}&color=w`);
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput) return;
    setIsLoading(true);

    const { data, error } = await supabase.from('chess_rooms').select('id, status').eq('id', roomCodeInput.toUpperCase()).single();

    setIsLoading(false);
    if (error || !data) {
      alert("Room tidak ditemukan!");
      return;
    }

    router.push(`/games/chess/play?mode=multiplayer&roomId=${roomCodeInput.toUpperCase()}&color=b`);
  };

  const timeOptions = [
    { label: "1 Menit (Bullet)", value: 60 },
    { label: "3 Menit (Blitz)", value: 180 },
    { label: "5 Menit (Blitz)", value: 300 },
    { label: "10 Menit (Rapid)", value: 600 },
    { label: "30 Menit (Classical)", value: 1800 },
  ];

  const botLevels = [
    { id: "easy", name: "Pemula" },
    { id: "medium", name: "Menengah" },
    { id: "hard", name: "Sulit" },
    { id: "grandmaster", name: "Grandmaster" },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
        <div className="mb-8">
          <span className="text-5xl mb-4 block">♟️</span>
          <h1 className="text-3xl font-bold mb-2">Catur</h1>
          <p className="text-gray-400">Pilih mode permainan</p>
        </div>

        <div className="flex flex-col gap-4">
          <button onClick={() => startGame("local")} className="flex items-center justify-center gap-3 w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 p-4 rounded-xl transition-all font-semibold">
            <span className="text-xl">👥</span> Main Lokal (Offline)
          </button>

          {/* Menu Multiplayer */}
          <div className="w-full">
            <button
              onClick={() => setShowMultiplayer(!showMultiplayer)}
              className={`flex items-center justify-center gap-3 w-full p-4 rounded-xl transition-all font-semibold border ${showMultiplayer ? 'bg-green-600 border-green-500' : 'bg-green-600/20 border-green-500/50 hover:bg-green-600/40 text-green-100'}`}
            >
              <span className="text-xl">🌐</span> Multiplayer Online
            </button>

            {showMultiplayer && (
              <div className="mt-3 bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col gap-3 animate-fade-in text-left">

                <label className="text-xs text-gray-500 font-bold ml-1">Pilih Waktu (Buat Room):</label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500 mb-2"
                >
                  {timeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <button onClick={createRoom} disabled={isLoading} className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-white transition-colors disabled:opacity-50">
                  {isLoading ? "Membuat..." : "+ Buat Room Baru"}
                </button>

                <div className="flex items-center gap-2 text-gray-500 text-sm my-1">
                  <span className="h-px w-full bg-gray-800"></span>ATAU<span className="h-px w-full bg-gray-800"></span>
                </div>

                <label className="text-xs text-gray-500 font-bold ml-1">Join Room Teman:</label>
                <form onSubmit={joinRoom} className="flex gap-2">
                  <input type="text" placeholder="Kode Room..." value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white uppercase focus:outline-none focus:border-green-500" maxLength={6} />
                  <button type="submit" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold border border-gray-600">Join</button>
                </form>
              </div>
            )}
          </div>

          {/* Menu Bot */}
          <div className="w-full">
            <button
              onClick={() => setShowBotLevels(!showBotLevels)}
              className={`flex items-center justify-center gap-3 w-full p-4 rounded-xl transition-all font-semibold border ${showBotLevels ? 'bg-indigo-600 border-indigo-500' : 'bg-indigo-600/20 border-indigo-500/50 hover:bg-indigo-600/40 text-indigo-100'}`}
            >
              <span className="text-xl">🤖</span> Lawan Bot (Stockfish)
            </button>

            {showBotLevels && (
              <div className="mt-3 bg-gray-950 border border-gray-800 rounded-xl p-3 flex flex-col gap-2 animate-fade-in">
                <p className="text-xs text-gray-500 text-left mb-1 pl-2">Pilih tingkat kesulitan:</p>
                {botLevels.map((lvl) => (
                  <button key={lvl.id} onClick={() => startGame("bot", lvl.id)} className="flex justify-between items-center w-full p-3 bg-gray-900 hover:bg-gray-800 rounded-lg border border-transparent hover:border-gray-700 transition-colors">
                    <span className="font-medium text-gray-300">{lvl.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => router.push("/games/chess/analysis")}
          className="flex items-center justify-center gap-3 w-full bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/50 p-4 rounded-xl transition-all font-semibold text-amber-100"
        >
          <span className="text-xl">🔍</span> Analisis Papan (Offline)
        </button>

        <Link href="/" className="mt-8 inline-block text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}