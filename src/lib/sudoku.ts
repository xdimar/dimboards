// src/lib/sudoku.ts

export type Difficulty = "easy" | "medium" | "hard" | "daily";

// Simple PRNG (Seeded Random) untuk Daily Challenge
function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function createEmptyGrid(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function isValid(grid: number[][], row: number, col: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num && i !== col) return false;
    if (grid[i][col] === num && i !== row) return false;
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const currR = startRow + r;
      const currC = startCol + c;
      if (grid[currR][currC] === num && (currR !== row || currC !== col)) {
        return false;
      }
    }
  }

  return true;
}

function solveGrid(grid: number[][], seed?: number): boolean {
  let currentSeed = seed || Math.random() * 1000000;

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => {
          currentSeed++;
          return seed !== undefined ? pseudoRandom(currentSeed) - 0.5 : Math.random() - 0.5;
        });

        for (const num of numbers) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (solveGrid(grid, seed ? currentSeed : undefined)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

export function generateSudoku(
  difficulty: Difficulty = "easy",
  seed?: number
): {
  initial: number[][];
  solution: number[][];
} {
  const solution = createEmptyGrid();
  solveGrid(solution, seed);

  const initial = solution.map((row) => [...row]);

  let emptyCells = 32;
  if (difficulty === "medium" || difficulty === "daily") emptyCells = 44;
  if (difficulty === "hard") emptyCells = 54;

  let removed = 0;
  let currentSeed = seed || Math.random() * 1000000;

  while (removed < emptyCells) {
    currentSeed++;
    const rndRow = seed !== undefined ? pseudoRandom(currentSeed) : Math.random();
    currentSeed++;
    const rndCol = seed !== undefined ? pseudoRandom(currentSeed) : Math.random();

    const row = Math.floor(rndRow * 9);
    const col = Math.floor(rndCol * 9);

    if (initial[row][col] !== 0) {
      initial[row][col] = 0;
      removed++;
    }
  }

  return { initial, solution };
}