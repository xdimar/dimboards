// src/app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserProfile {
  username: string;
  created_at: string;
}

interface ChessStats {
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

interface SudokuStats {
  puzzles_solved: number;
  best_time_easy: number | null;
  best_time_medium: number | null;
  best_time_hard: number | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [chessStats, setChessStats] = useState<ChessStats | null>(null);
  const [sudokuStats, setSudokuStats] = useState<SudokuStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }

      const userId = session.user.id;

      // 1. Profil Global
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, created_at")
        .eq("id", userId)
        .single();

      // 2. Statistik Catur
      const { data: cStats } = await supabase
        .from("chess_stats")
        .select("rating, wins, losses, draws")
        .eq("user_id", userId)
        .single();

      // 3. Statistik Sudoku
      const { data: sStats } = await supabase
        .from("sudoku_stats")
        .select("puzzles_solved, best_time_easy, best_time_medium, best_time_hard")
        .eq("user_id", userId)
        .single();

      if (profileData) setProfile(profileData);
      if (cStats) setChessStats(cStats);
      if (sStats) setSudokuStats(sStats);
      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const formatTime = (secs: number | null) => {
    if (!secs) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Memuat Profil Akun...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        
        {/* Header Profil */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
            {profile?.username ? profile.username[0].toUpperCase() : "U"}
          </div>
          <div>
            <h1 className="text-xl font-bold">{profile?.username}</h1>
            <p className="text-xs text-gray-500">
              Bergabung sejak {new Date(profile?.created_at || "").toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Statistik Game Catur */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 mb-3">
          <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            ♟️ Statistik Catur
          </h2>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
              <span className="text-[10px] text-gray-500 block">Rating ELO</span>
              <strong className="text-base text-white font-mono">{chessStats?.rating || 1200}</strong>
            </div>
            <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
              <span className="text-[10px] text-gray-500 block">Menang / Kalah</span>
              <strong className="text-xs text-green-400 font-mono">
                {chessStats?.wins || 0}W <span className="text-gray-600">/</span> <span className="text-rose-400">{chessStats?.losses || 0}L</span>
              </strong>
            </div>
          </div>
        </div>

        {/* Statistik Game Sudoku */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
              🔢 Statistik Sudoku
            </h2>
            <span className="text-[10px] text-gray-400 font-mono">
              Selesai: <strong className="text-white">{sudokuStats?.puzzles_solved || 0}</strong>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
              <span className="text-[10px] text-gray-500 block">Easy</span>
              <strong className="font-mono text-green-400">{formatTime(sudokuStats?.best_time_easy ?? null)}</strong>
            </div>
            <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
              <span className="text-[10px] text-gray-500 block">Medium</span>
              <strong className="font-mono text-amber-400">{formatTime(sudokuStats?.best_time_medium ?? null)}</strong>
            </div>
            <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
              <span className="text-[10px] text-gray-500 block">Hard</span>
              <strong className="font-mono text-rose-400">{formatTime(sudokuStats?.best_time_hard ?? null)}</strong>
            </div>
          </div>
        </div>

        {/* Tombol Navigasi */}
        <div className="flex gap-2">
          <Link
            href="/"
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold py-2.5 rounded-xl text-center border border-gray-700 transition-colors"
          >
            Beranda
          </Link>
          <button
            onClick={handleLogout}
            className="flex-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/40 text-xs font-bold py-2.5 rounded-xl transition-colors"
          >
            Keluar (Logout)
          </button>
        </div>
      </div>
    </main>
  );
}