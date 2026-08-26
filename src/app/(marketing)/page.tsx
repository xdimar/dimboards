// src/app/page.tsx
import Link from "next/link";

const games = [
  { 
    name: "Tic-Tac-Toe", 
    slug: "tic-tac-toe", 
    desc: "Klasik 3x3. Asah strategimu untuk menyusun 3 simbol berurutan.", 
    status: "Tersedia",
    emoji: "❌⭕",
    color: "from-blue-500 to-indigo-500"
  },
  { 
    name: "Chess", 
    slug: "chess", 
    desc: "Catur Internasional. Pertempuran otak melawan raja dan pion.", 
    status: "Segera",
    emoji: "♟️",
    color: "from-amber-500 to-orange-600"
  },
  { 
    name: "Sudoku", 
    slug: "sudoku", 
    desc: "Teka-teki angka 9x9. Isi kotak-kotak kosong dengan benar.", 
    status: "Segera",
    emoji: "🔢",
    color: "from-green-500 to-emerald-600"
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
      
      {/* Navbar: Padding dikecilin di mobile (p-4) */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-md rotate-45"></div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dim<span className="text-blue-400">Boards</span></h1>
        </div>
        <button className="px-4 py-2 text-xs sm:text-sm bg-white/10 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-colors">
          Masuk
        </button>
      </nav>

      {/* Hero Section: Ngurangin padding atas di mobile biar gak kelamaan scroll */}
      <section className="relative flex flex-col items-center justify-center text-center pt-32 pb-20 px-4 sm:px-6 md:pt-48 md:pb-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 bg-white/5 border border-white/10 rounded-full text-xs sm:text-sm text-blue-300">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Multiplayer Online Tersedia!
          </div>
          
          {/* Ukuran font dikecilin di mobile (text-4xl), membesar di layar lebih besar */}
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Bermain Papan, <br/> Tanpa Batas.
          </h2>
          
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-xl mx-auto mb-8 md:mb-10 leading-relaxed">
            DimBoards adalah rumah untuk game papan klasik. Mainkan catur, sudoku, dan game favoritmu secara real-time bersama teman, langsung di browser.
          </p>
          
          {/* Tombol jadi full width di mobile (w-full), dan flex row di tablet ke atas */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto">
            <Link href="/games/tic-tac-toe" className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-slate-200 transition-all hover:scale-105 shadow-lg shadow-blue-500/20 text-center">
              Mulai Bermain
            </Link>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-all text-center">
              Pelajari Lebih Lanjut
            </button>
          </div>
        </div>
      </section>

      {/* Koleksi Game: Padding disesuaikan */}
      <section className="px-4 sm:px-6 md:px-12 pb-20 md:pb-24 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 sm:mb-8 gap-2">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Koleksi Game</h3>
          <span className="text-slate-500 text-xs sm:text-sm">{games.filter(g => g.status === 'Tersedia').length} dari {games.length} game tersedia</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {games.map((game) => (
            <div 
              key={game.slug} 
              className="group relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 sm:p-8 overflow-hidden transition-all duration-300 hover:border-slate-600 hover:-translate-y-1"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              
              <div className="relative z-10">
                <div className="text-3xl sm:text-4xl mb-4">{game.emoji}</div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xl sm:text-2xl font-bold">{game.name}</h4>
                  {game.status === 'Tersedia' ? (
                    <span className="text-[10px] sm:text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-medium">Live</span>
                  ) : (
                    <span className="text-[10px] sm:text-xs px-2 py-1 bg-slate-700/50 text-slate-400 rounded-full font-medium">Soon</span>
                  )}
                </div>
                <p className="text-slate-400 mb-6 text-sm sm:text-base h-10">{game.desc}</p>
                
                {game.status === 'Tersedia' ? (
                  <Link href={`/games/${game.slug}`} className="inline-flex items-center gap-2 text-blue-400 font-medium hover:gap-3 transition-all text-sm sm:text-base">
                    Mainkan Sekarang 
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 text-slate-500 font-medium cursor-not-allowed text-sm sm:text-base">
                    Segera Hadir
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 px-6 text-center text-slate-500 text-xs sm:text-sm">
        © {new Date().getFullYear()} DimBoards. Dibuat dengan Next.js & Supabase.
      </footer>
    </main>
  );
}