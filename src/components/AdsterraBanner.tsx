// src/components/AdsterraCustomBanner.tsx
"use client";

import { useEffect, useRef } from "react";

export default function AdsterraCustomBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !containerRef.current.firstChild) {
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "https://pl31049935.profitableratecpmnetwork.com/75/fc/38/75fc38a7228d579a36dabbe6bf6409c6.js";
      script.async = true;
      containerRef.current.appendChild(script);
    }
  }, []);

  return (
    <div className="my-6 flex flex-col items-center justify-center w-full">
      <span className="text-[10px] uppercase text-gray-600 font-mono mb-1">Sponsor</span>
      <div ref={containerRef} className="min-h-25 flex items-center justify-center" />
    </div>
  );
}