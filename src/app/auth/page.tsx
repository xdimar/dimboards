// src/app/auth/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });
        if (error) throw error;
        alert("Pendaftaran berhasil! Silakan periksa email atau login.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan autentikasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">
          {isLogin ? "Masuk ke DimBoards" : "Buat Akun Baru"}
        </h1>
        <p className="text-xs text-gray-400 text-center mb-6">
          Satu akun untuk seluruh koleksi game papan
        </p>

        {errorMessage && (
          <div className="bg-rose-900/30 border border-rose-500/50 text-rose-300 text-xs p-3 rounded-lg mb-4">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-3">
          {!isLogin && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nama_pengguna"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-sm mt-2"
          >
            {loading ? "Memproses..." : isLogin ? "Masuk" : "Daftar Akun"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMessage("");
            }}
            className="text-blue-400 hover:underline font-semibold"
          >
            {isLogin ? "Daftar Sekarang" : "Masuk di sini"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-400">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}