"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
      style={{
        background: "var(--input-bg)",
        border: "1px solid var(--border)",
        color: "var(--muted)",
      }}
    >
      {theme === "dark" ? (
        <Sun size={14} strokeWidth={1.8} />
      ) : (
        <Moon size={14} strokeWidth={1.8} />
      )}
    </button>
  );
}
