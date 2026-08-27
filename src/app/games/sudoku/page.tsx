// src/app/games/sudoku/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { generateSudoku, Difficulty } from "@/lib/sudoku";
import { supabase } from "@/lib/supabaseClient";

interface CellState {
  value: number;
  isInitial: boolean;
  notes: number[];
}

export default function SudokuPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [grid, setGrid] = useState<CellState[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isNotesMode, setIsNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Fitur Hints (3x kesempatan per game)
  const [hintsRemaining, setHintsRemaining] = useState(3);

  // Inisialisasi Game Baru (Mendukung Daily Challenge)
  const startNewGame = useCallback((diff: Difficulty) => {
    let seed: number | undefined = undefined;
    if (diff === "daily") {
      const today = new Date();
      seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    }

    const { initial, solution: sol } = generateSudoku(diff, seed);
    const newGrid: CellState[][] = initial.map((row) =>
      row.map((val) => ({
        value: val,
        isInitial: val !== 0,
        notes: [],
      }))
    );

    setGrid(newGrid);
    setSolution(sol);
    setSelectedCell(null);
    setMistakes(0);
    setTimer(0);
    setHintsRemaining(3);
    setIsCompleted(false);
  }, []);

  useEffect(() => {
    startNewGame(difficulty);
  }, [difficulty, startNewGame]);

  // Timer counter
  useEffect(() => {
    if (isCompleted) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Hitung jumlah masing-masing angka (1-9) yang sudah berada di papan
  const numberCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    grid.forEach((row) => {
      row.forEach((cell) => {
        if (cell.value >= 1 && cell.value <= 9) {
          counts[cell.value]++;
        }
      });
    });
    return counts;
  }, [grid]);

  // Simpan statistik ke Supabase saat game selesai
  const saveStatsToSupabase = useCallback(async (timeSpent: number, diff: Difficulty) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      const { data: currentStats } = await supabase
        .from("sudoku_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      const timeColumn = diff === "easy" ? "best_time_easy" : diff === "medium" ? "best_time_medium" : diff === "hard" ? "best_time_hard" : null;

      const updates: any = {
        puzzles_solved: (currentStats?.puzzles_solved || 0) + 1,
      };

      if (timeColumn) {
        const oldBest = currentStats ? currentStats[timeColumn] : null;
        if (!oldBest || timeSpent < oldBest) {
          updates[timeColumn] = timeSpent;
        }
      }

      if (currentStats) {
        await supabase.from("sudoku_stats").update(updates).eq("user_id", userId);
      } else {
        await supabase.from("sudoku_stats").insert({ user_id: userId, ...updates });
      }
    } catch (err) {
      console.error("Gagal menyimpan statistik Sudoku:", err);
    }
  }, []);

  // Cek Kemenangan
  const checkCompletion = (currentGrid: CellState[][]) => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (currentGrid[r][c].value === 0 || currentGrid[r][c].value !== solution[r][c]) {
          return false;
        }
      }
    }
    return true;
  };

  // Auto-Erase Notes pada Baris, Kolom, dan Kotak 3x3
  const autoEraseNotes = (gridCopy: CellState[][], row: number, col: number, num: number) => {
    for (let i = 0; i < 9; i++) {
      gridCopy[row][i].notes = gridCopy[row][i].notes.filter((n) => n !== num);
      gridCopy[i][col].notes = gridCopy[i][col].notes.filter((n) => n !== num);
    }

    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        gridCopy[startRow + r][startCol + c].notes = gridCopy[startRow + r][startCol + c].notes.filter(
          (n) => n !== num
        );
      }
    }
  };

  // Input Angka
  const handleInputNumber = (num: number) => {
    if (!selectedCell || isCompleted) return;
    const { row, col } = selectedCell;
    const cell = grid[row][col];

    if (cell.isInitial) return;

    const newGrid = grid.map((r) => r.map((c) => ({ ...c, notes: [...c.notes] })));

    if (isNotesMode) {
      if (num === 0) {
        newGrid[row][col].notes = [];
      } else {
        const currentNotes = newGrid[row][col].notes;
        if (currentNotes.includes(num)) {
          newGrid[row][col].notes = currentNotes.filter((n) => n !== num);
        } else {
          newGrid[row][col].notes.push(num);
          newGrid[row][col].notes.sort();
        }
      }
      setGrid(newGrid);
      return;
    }

    if (num === 0) {
      newGrid[row][col].value = 0;
      setGrid(newGrid);
      return;
    }

    if (solution[row] && solution[row][col] !== num) {
      setMistakes((prev) => prev + 1);
    }

    newGrid[row][col].value = num;
    newGrid[row][col].notes = [];

    // Jika angka yang dimasukkan benar, otomatis hapus angka catatan di sekitarnya
    if (solution[row] && solution[row][col] === num) {
      autoEraseNotes(newGrid, row, col, num);
    }

    setGrid(newGrid);

    if (checkCompletion(newGrid)) {
      setIsCompleted(true);
      saveStatsToSupabase(timer, difficulty);
    }
  };

  // Fitur Gunakan Hint
  const handleUseHint = () => {
    if (!selectedCell || isCompleted || hintsRemaining <= 0) return;
    const { row, col } = selectedCell;
    const cell = grid[row][col];

    if (cell.value === solution[row][col]) return;

    const correctValue = solution[row][col];
    const newGrid = grid.map((r) => r.map((c) => ({ ...c, notes: [...c.notes] })));

    newGrid[row][col].value = correctValue;
    newGrid[row][col].notes = [];
    autoEraseNotes(newGrid, row, col, correctValue);

    setGrid(newGrid);
    setHintsRemaining((prev) => prev - 1);

    if (checkCompletion(newGrid)) {
      setIsCompleted(true);
      saveStatsToSupabase(timer, difficulty);
    }
  };

  // Keyboard navigation & input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;

      if (e.key >= "1" && e.key <= "9") {
        handleInputNumber(parseInt(e.key, 10));
      } else if (e.key === "Backspace" || e.key === "Delete") {
        handleInputNumber(0);
      } else if (e.key === "ArrowUp" && selectedCell.row > 0) {
        setSelectedCell({ row: selectedCell.row - 1, col: selectedCell.col });
      } else if (e.key === "ArrowDown" && selectedCell.row < 8) {
        setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col });
      } else if (e.key === "ArrowLeft" && selectedCell.col > 0) {
        setSelectedCell({ row: selectedCell.row, col: selectedCell.col - 1 });
      } else if (e.key === "ArrowRight" && selectedCell.col < 8) {
        setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, isNotesMode, grid, solution, isCompleted]);

  const selectedValue = selectedCell && grid[selectedCell.row] ? grid[selectedCell.row][selectedCell.col].value : null;

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center w-full max-w-lg">
        
        {/* Header */}
        <div className="flex justify-between items-center w-full mb-3 px-1">
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors">
            ← Menu Utama
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Dim<span className="text-green-400">Sudoku</span></h1>
          <span className="text-xs font-mono bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-md text-amber-400">
            ⏱️ {formatTimer(timer)}
          </span>
        </div>

        {/* Difficulty Bar & Daily Mode */}
        <div className="flex justify-between items-center w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-xl mb-3 text-xs">
          <div className="flex gap-1">
            {(["easy", "medium", "hard", "daily"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDifficulty(d);
                  startNewGame(d);
                }}
                className={`px-2 py-1 rounded-md capitalize font-semibold transition-colors ${
                  difficulty === d 
                    ? d === "daily" ? "bg-amber-600 text-white" : "bg-green-600 text-white" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {d === "daily" ? "📅 Harian" : d}
              </button>
            ))}
          </div>
          <span className="text-gray-400">
            Kesalahan: <strong className="text-rose-400 font-mono">{mistakes}</strong>
          </span>
        </div>

        {/* Papan Sudoku 9x9 */}
        <div className="w-[85vw] max-w-[450px] aspect-square bg-gray-900 border-2 border-gray-700 grid grid-cols-9 grid-rows-9 rounded-xl overflow-hidden shadow-2xl">
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const isSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;
              const isSameRowOrCol = selectedCell && (selectedCell.row === rIdx || selectedCell.col === cIdx);
              const isSameBox =
                selectedCell &&
                Math.floor(selectedCell.row / 3) === Math.floor(rIdx / 3) &&
                Math.floor(selectedCell.col / 3) === Math.floor(cIdx / 3);
              const isSameNumber = selectedValue && selectedValue !== 0 && cell.value === selectedValue;
              
              const isWrong = cell.value !== 0 && !cell.isInitial && solution[rIdx] && solution[rIdx][cIdx] !== cell.value;

              const borderRight = (cIdx + 1) % 3 === 0 && cIdx !== 8 ? "border-r-2 border-r-gray-600" : "border-r border-r-gray-800";
              const borderBottom = (rIdx + 1) % 3 === 0 && rIdx !== 8 ? "border-b-2 border-b-gray-600" : "border-b border-b-gray-800";

              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => setSelectedCell({ row: rIdx, col: cIdx })}
                  className={`flex items-center justify-center cursor-pointer select-none relative font-mono text-base sm:text-xl transition-colors
                    ${borderRight} ${borderBottom}
                    ${isSelected ? "!bg-green-600/40 text-white font-bold" : ""}
                    ${!isSelected && isSameNumber ? "bg-green-950/60" : ""}
                    ${!isSelected && !isSameNumber && (isSameRowOrCol || isSameBox) ? "bg-gray-800/40" : ""}
                    ${!isSelected && !isSameNumber && !isSameRowOrCol && !isSameBox ? "bg-gray-950" : ""}
                    ${cell.isInitial ? "text-slate-100 font-bold" : "text-green-400"}
                    ${isWrong ? "!text-rose-400 !bg-rose-950/40" : ""}
                  `}
                >
                  {cell.value !== 0 ? (
                    cell.value
                  ) : (
                    <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5 pointer-events-none text-[8px] sm:text-[9px] text-gray-500 leading-none text-center">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span key={n}>{cell.notes.includes(n) ? n : ""}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Number Count Indicators & Numpad */}
        <div className="w-[85vw] max-w-[450px] mt-3 flex flex-col gap-2">
          <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
              const remaining = 9 - (numberCounts[num] || 0);
              const isCompletedNum = remaining <= 0;

              return (
                <button
                  key={num}
                  disabled={isCompletedNum}
                  onClick={() => handleInputNumber(num)}
                  className={`border flex flex-col items-center justify-center py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-bold transition-colors ${
                    isCompletedNum
                      ? "bg-gray-950/40 border-gray-900 text-gray-700 cursor-not-allowed opacity-40"
                      : "bg-gray-900 hover:bg-gray-800 border-gray-800 text-white"
                  }`}
                >
                  <span>{num}</span>
                  <span className="text-[9px] font-normal text-gray-500">{remaining > 0 ? remaining : "✓"}</span>
                </button>
              );
            })}
          </div>

          {/* Action Bar (Notes, Hint, Erase, Reset) */}
          <div className="grid grid-cols-4 gap-1.5 mt-1">
            <button
              onClick={() => setIsNotesMode(!isNotesMode)}
              className={`py-2 px-1 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1 ${
                isNotesMode
                  ? "bg-amber-600 text-white border-amber-500"
                  : "bg-gray-900 text-gray-400 border-gray-800 hover:text-white"
              }`}
            >
              ✏️ {isNotesMode ? "Catat (ON)" : "Catat"}
            </button>
            <button
              onClick={handleUseHint}
              disabled={hintsRemaining <= 0 || !selectedCell}
              className="bg-gray-900 hover:bg-gray-800 disabled:opacity-40 border border-gray-800 text-amber-300 py-2 px-1 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            >
              💡 Hint ({hintsRemaining})
            </button>
            <button
              onClick={() => handleInputNumber(0)}
              className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 py-2 px-1 rounded-lg text-xs font-semibold transition-colors"
            >
              ⌫ Hapus
            </button>
            <button
              onClick={() => startNewGame(difficulty)}
              className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 py-2 px-1 rounded-lg text-xs font-semibold transition-colors"
            >
              🔄 Baru
            </button>
          </div>
        </div>
      </div>

      {/* Modal Kemenangan */}
      {isCompleted && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-xl font-bold mb-1">Sudoku Selesai!</h3>
            <p className="text-xs text-gray-400 mb-4">
              Waktu: <strong className="text-green-400 font-mono">{formatTimer(timer)}</strong> | Kesalahan:{" "}
              <strong className="text-white">{mistakes}</strong>
            </p>
            <button
              onClick={() => startNewGame(difficulty)}
              className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Main Lagi
            </button>
          </div>
        </div>
      )}
    </main>
  );
}