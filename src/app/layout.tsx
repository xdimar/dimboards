// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "DimBoards - Platform Game Papan Klasik & Modern",
  description: "Mainkan Catur, Tic-Tac-Toe, Sudoku secara real-time dan analisis taktik catur bersama Stockfish.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="google-adsense-account" content="ca-pub-6251522756773628"></meta>
        {/* Google AdSense Script */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6251522756773628"
          crossOrigin="anonymous"></script>
        <script src="https://pl31049935.profitableratecpmnetwork.com/75/fc/38/75fc38a7228d579a36dabbe6bf6409c6.js"></script>

      </head>
      <body className="antialiased bg-gray-950 text-white">
        {children}
        <script src="https://pl31049936.profitableratecpmnetwork.com/07/b8/a4/07b8a41bd013d9b0a310940469a294fb.js"></script>

      </body>
    </html>
  );
}