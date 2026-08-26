// src/app/games/tic-tac-toe/page.tsx
import Link from 'next/link';

export default function TicTacToePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">Tic-Tac-Toe</h1>
      <p className="text-gray-400 mb-8">Game board akan dibuat di sini nanti.</p>
      
      {/* Placeholder papan 3x3 */}
      <div className="grid grid-cols-3 gap-2 mb-8">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="w-20 h-20 bg-gray-800 border border-gray-700 rounded-md flex items-center justify-center text-3xl font-bold text-gray-600">
            ?
          </div>
        ))}
      </div>

      <Link href="/" className="text-blue-400 hover:underline">
        ← Kembali ke Beranda
      </Link>
    </main>
  );
}