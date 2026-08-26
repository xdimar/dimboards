// src/app/(marketing)/page.tsx
import Link from 'next/link';

// Data dummy untuk list game nantinya
const games = [
  { name: 'Tic-Tac-Toe', slug: 'tic-tac-toe', desc: 'Game klasik 3x3', status: 'Tersedia' },
  { name: 'Chess', slug: 'chess', desc: 'Catur Internasional', status: 'Segera' },
  { name: 'Sudoku', slug: 'sudoku', desc: 'Teka-teki angka 9x9', status: 'Segera' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-blue-400">Dim<span className="text-white">Boards</span></h1>
        <button className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
          Masuk
        </button>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-24">
        <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
          Bermain Papan Tanpa Batas
        </h2>
        <p className="text-lg text-gray-400 max-w-xl mb-8">
          DimBoards adalah rumah untuk game papan klasik. Mainkan catur, sudoku, dan game favoritmu langsung di browser.
        </p>
        <Link href="/games/tic-tac-toe" className="bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors">
          Mulai Bermain
        </Link>
      </section>

      {/* Game Grid */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <h3 className="text-2xl font-bold mb-6 text-gray-300">Koleksi Game</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {games.map((game) => (
            <div key={game.slug} className="bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-blue-500 transition-colors">
              <h4 className="text-xl font-semibold mb-2">{game.name}</h4>
              <p className="text-gray-500 mb-4">{game.desc}</p>
              {game.status === 'Tersedia' ? (
                <Link href={`/games/${game.slug}`} className="text-blue-400 font-medium hover:underline">
                  Mainkan Sekarang →
                </Link>
              ) : (
                <span className="text-gray-600 font-medium cursor-not-allowed">
                  {game.status}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}