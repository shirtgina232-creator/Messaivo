"use client";

import { useId } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LogoVariant = "full" | "icon" | "favicon";
export type LogoTheme  = "light" | "dark";

export interface MessaivoLogoProps {
  variant?:     LogoVariant;
  /** "light" = white wordmark (for dark backgrounds)
   *  "dark"  = dark wordmark (for light backgrounds) */
  theme?:       LogoTheme;
  height?:      number;
  showTagline?: boolean;
  className?:   string;
  style?:       React.CSSProperties;
}

// ── Main icon mark SVG (viewBox 0 0 120 106) ──────────────────────────────────

function IconMark({ uid, height }: { uid: string; height: number }) {
  const w = Math.round(height * (120 / 106));
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 120 106"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Main M gradient — indigo → blue, top-left to bottom-right */}
        <linearGradient
          id={`mg-${uid}`}
          x1="9" y1="17" x2="111" y2="95"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="#6366F1" />
          <stop offset="52%"  stopColor="#5175F4" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>

        {/* Chat bubble — slightly deeper indigo-blue */}
        <linearGradient
          id={`cg-${uid}`}
          x1="50" y1="64" x2="114" y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>

        {/* Top highlight for 3-D depth on M strokes */}
        <linearGradient
          id={`hg-${uid}`}
          x1="0" y1="0" x2="0" y2="1"
        >
          <stop offset="0%"   stopColor="white" stopOpacity="0.24" />
          <stop offset="55%"  stopColor="white" stopOpacity="0.06" />
          <stop offset="100%" stopColor="white" stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* ── 1. Chat bubble pointer (rendered first so M sits on top) ── */}
      <path
        d="M 64 67 L 60 59 L 81 67 Z"
        fill={`url(#cg-${uid})`}
      />

      {/* ── 2. Chat bubble body ── */}
      <rect
        x="50" y="67"
        width="64" height="33"
        rx="11"
        fill={`url(#cg-${uid})`}
      />

      {/* ── 3. M letterform stroke (rendered on top so it cleanly covers the pointer tip) ── */}
      <path
        d="M 9 95 L 9 17 L 60 55 L 111 17 L 111 55"
        stroke={`url(#mg-${uid})`}
        strokeWidth="19"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── 4. Top-highlight pass — gives the left arm that glossy depth ── */}
      <path
        d="M 9 95 L 9 17 L 60 55 L 111 17 L 111 55"
        stroke={`url(#hg-${uid})`}
        strokeWidth="19"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />

      {/* ── 5. Dots (topmost so always visible) ── */}
      <circle cx="65"  cy="83.5" r="3.4" fill="white" fillOpacity="0.93" />
      <circle cx="80"  cy="83.5" r="3.4" fill="white" fillOpacity="0.93" />
      <circle cx="95"  cy="83.5" r="3.4" fill="white" fillOpacity="0.93" />
    </svg>
  );
}

// ── Favicon / app icon (square, 32×32 canonical) ───────────────────────────────

function FaviconMark({ uid, size }: { uid: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`fbg-${uid}`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6366F1" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id={`fdg-${uid}`} x1="12" y1="16" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>

      {/* Rounded-square background */}
      <rect width="32" height="32" rx="7" fill={`url(#fbg-${uid})`} />

      {/* Chat bubble (behind M) */}
      <rect x="14" y="18.5" width="15.5" height="9" rx="3" fill="white" fillOpacity="0.82" />

      {/* M letterform — white on gradient bg */}
      <path
        d="M 3.5 27 L 3.5 6.5 L 16 15.5 L 28.5 6.5 L 28.5 15.5"
        stroke="white"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.97"
      />

      {/* 3 dots on bubble */}
      <circle cx="18.5" cy="23" r="1.5" fill={`url(#fdg-${uid})`} />
      <circle cx="22"   cy="23" r="1.5" fill={`url(#fdg-${uid})`} />
      <circle cx="25.5" cy="23" r="1.5" fill={`url(#fdg-${uid})`} />
    </svg>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function MessaivoLogo({
  variant     = "full",
  theme       = "light",
  height      = 36,
  showTagline = false,
  className   = "",
  style,
}: MessaivoLogoProps) {
  const rawId = useId();
  const uid   = rawId.replace(/:/g, "");

  if (variant === "favicon") {
    return <FaviconMark uid={uid} size={height} />;
  }

  if (variant === "icon") {
    return <IconMark uid={uid} height={height} />;
  }

  // "full" — icon + wordmark (+ optional tagline)
  const wordmarkColor  = theme === "light" ? "#F5F7FA" : "#0F172A";
  const taglineColor   = theme === "light" ? "rgba(245,247,250,0.48)" : "rgba(15,23,42,0.38)";
  const fontSize       = Math.round(height * 0.72);
  const taglineSize    = Math.max(Math.round(fontSize * 0.26), 9);
  const gap            = Math.round(height * 0.3);

  return (
    <div
      className={`flex items-center select-none ${className}`}
      style={{ gap, ...style }}
    >
      <IconMark uid={uid} height={height} />

      <div>
        <span
          style={{
            display:       "block",
            fontFamily:    "var(--font-geist-sans), system-ui, sans-serif",
            fontSize,
            fontWeight:    700,
            letterSpacing: "-0.025em",
            lineHeight:    1.05,
            color:         wordmarkColor,
            whiteSpace:    "nowrap",
          }}
        >
          Messaivo
        </span>

        {showTagline && (
          <span
            style={{
              display:       "block",
              fontFamily:    "var(--font-geist-sans), system-ui, sans-serif",
              fontSize:      taglineSize,
              fontWeight:    600,
              letterSpacing: "0.13em",
              color:         taglineColor,
              marginTop:     3,
              whiteSpace:    "nowrap",
            }}
          >
            MESSAGES. CUSTOMERS. GROWTH.
          </span>
        )}
      </div>
    </div>
  );
}

export default MessaivoLogo;
