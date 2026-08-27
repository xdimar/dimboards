// src/components/AdBanner.tsx
"use client";

import { useEffect, useRef } from "react";

interface AdBannerProps {
  bannerKey?: string;
  size?: "300x250" | "728x90" | "468x60" | "320x50";
}

export default function AdBanner({
  bannerKey = "cb832ec0c50f853b5c7e8bed315ceb62", // Default key Adsterra milikmu
  size = "300x250",
}: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Bersihkan isi lama sebelum inject baru
    container.innerHTML = "";

    const [width, height] = size.split("x").map(Number);

    const confScript = document.createElement("script");
    confScript.type = "text/javascript";
    confScript.innerHTML = `
      atOptions = {
        'key' : '${bannerKey}',
        'format' : 'iframe',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };
    `;

    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src = `//www.highperformanceformat.com/${bannerKey}/invoke.js`;

    container.appendChild(confScript);
    container.appendChild(invokeScript);
  }, [bannerKey, size]);

  return (
    <div className="my-6 flex flex-col items-center justify-center w-full select-none">
      <span className="text-[10px] uppercase text-gray-600 font-mono mb-1 tracking-wider">
        Sponsor
      </span>
      <div
        ref={containerRef}
        className="flex items-center justify-center bg-gray-900/30 rounded-xl border border-gray-800/60 p-1 min-h-25 overflow-hidden"
      />
    </div>
  );
}