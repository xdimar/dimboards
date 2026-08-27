// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DimBoards - Platform Game Papan Klasik & Modern",
  description: "Mainkan Catur, Tic-Tac-Toe, Sudoku secara real-time dan analisis taktik catur bersama Stockfish.",
  keywords: ["DimBoards", "Catur Online", "Chess Multiplayer", "Tic Tac Toe", "Sudoku", "Stockfish Analysis"],
  icons: {
    icon: "/favicon.ico", // Mengarah ke file icon di folder src/app atau public
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}