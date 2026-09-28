"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    localStorage.setItem("momentum-theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button type="button" onClick={toggleTheme} aria-pressed={dark}
      className={`flex items-center rounded-xl text-sm font-medium text-[#61715f] transition hover:bg-[#edf3ee] hover:text-[#45634c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#45634c] ${compact ? "w-full gap-3 px-4 py-3" : "w-full justify-between px-3 py-2.5"}`}>
      <span className="flex items-center gap-3"><span aria-hidden="true" className="flex h-7 w-7 items-center justify-center text-base">{dark ? "☀️" : "🌙"}</span>{dark ? "Light mode" : "Dark mode"}</span>
      {!compact && <span aria-hidden="true" className={`relative h-6 w-10 rounded-full transition ${dark ? "bg-[#45634c]" : "bg-[#d7ded5]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${dark ? "left-5" : "left-1"}`} /></span>}
    </button>
  );
}
