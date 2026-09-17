"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";

// ── Speech bubble messages ─────────────────────────────────────────────────────

const INTRO_MSG = "Hey 👋 I'm Messaivo!";
const IDLE_MSGS = [
  "Need help? I'm here!",
  "Let's grow together 🚀",
  "Welcome to Messaivo ✨",
  "I'm right here with you!",
  "Start your free trial →",
];

// ── Mascot SVG ─────────────────────────────────────────────────────────────────

function MascotSvg({ size, isDark }: { size: number; isDark: boolean }) {
  return (
    <svg
      viewBox="0 0 52 58"
      width={size}
      height={Math.round(size * 58 / 52)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {/* Body */}
      <circle cx="26" cy="34" r="19" fill={isDark ? "#0E1526" : "#EEF0FF"} />
      <circle cx="26" cy="34" r="19" stroke="#6C63FF" strokeWidth="1.5"
        opacity={isDark ? "0.78" : "0.55"} />
      {/* Rim highlight */}
      <path d="M 10 24 A 19 19 0 0 1 42 24" stroke="white" strokeWidth="0.8"
        opacity={isDark ? "0.07" : "0.3"} fill="none" strokeLinecap="round" />

      {/* Face screen */}
      <rect x="13" y="25" width="26" height="17" rx="6"
        fill={isDark ? "#060912" : "#16193A"} />

      {/* Left eye — violet */}
      <circle cx="20" cy="33" r="3.5" fill="#6C63FF" opacity="0.95" />
      <circle cx="21" cy="32" r="1.4" fill="white" opacity="0.45" />

      {/* Right eye — cyan */}
      <circle cx="32" cy="33" r="3.5" fill="#22D3EE" opacity="0.9" />
      <circle cx="33" cy="32" r="1.4" fill="white" opacity="0.45" />

      {/* Antenna left */}
      <line x1="19" y1="16" x2="13" y2="5"
        stroke="#6C63FF" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="13" cy="5" r="3" fill="#6C63FF" />
      <circle cx="13" cy="5" r="1.2" fill="white" opacity="0.5" />

      {/* Antenna right */}
      <line x1="33" y1="16" x2="39" y2="5"
        stroke="#22D3EE" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="39" cy="5" r="3" fill="#22D3EE" />
      <circle cx="39" cy="5" r="1.2" fill="white" opacity="0.5" />
    </svg>
  );
}

// ── Trail particle type ────────────────────────────────────────────────────────

type Dot = { id: number; x: number; y: number; life: number; sz: number; cyan: boolean };

// ── Main mascot layer ──────────────────────────────────────────────────────────

export default function MascotLayer() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [pos, setPos]     = useState({ x: -400, y: -400 });
  const [trail, setTrail] = useState<Dot[]>([]);
  const [bubble, setBubble] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // All mutable state lives in refs to avoid stale closures inside RAF
  const mouseRef   = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: -400, y: -400 });
  const rafRef     = useRef<number>(0);
  const trailRef   = useRef<Dot[]>([]);
  const dotIdRef   = useRef(0);
  const lastDotMs  = useRef(0);
  const isTouch    = useRef(false);
  const noMotion   = useRef(false);

  // ── Detect environment once on mount ─────────────────────────────────────────
  useEffect(() => {
    isTouch.current  = window.matchMedia("(pointer: coarse)").matches;
    noMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReady(true);
  }, []);

  // ── Mouse tracking ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || isTouch.current || noMotion.current) return;
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [ready]);

  // ── Spring animation loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || isTouch.current || noMotion.current) return;

    // Start off-screen; mascot springs into view once mouse enters
    const cx = typeof window !== "undefined" ? window.innerWidth * 0.65 : 800;
    const cy = typeof window !== "undefined" ? window.innerHeight * 0.4 : 300;
    currentRef.current = { x: cx, y: cy };
    mouseRef.current   = { x: cx, y: cy };

    const SPRING = 0.082;
    const TRAIL_GAP = 55; // ms between trail dots

    const tick = (ts: number) => {
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const px = currentRef.current.x;
      const py = currentRef.current.y;

      const dx = mx - px;
      const dy = my - py;
      currentRef.current.x = px + dx * SPRING;
      currentRef.current.y = py + dy * SPRING;

      const speed = Math.sqrt(dx * dx + dy * dy);

      // Add trail dot
      if (speed > 2.5 && ts - lastDotMs.current > TRAIL_GAP) {
        lastDotMs.current = ts;
        trailRef.current.push({
          id:   ++dotIdRef.current,
          x:    currentRef.current.x,
          y:    currentRef.current.y,
          life: 1.0,
          sz:   2.5 + Math.random() * 2.8,
          cyan: dotIdRef.current % 3 === 0,
        });
        if (trailRef.current.length > 10) trailRef.current.shift();
      }

      // Decay
      for (let i = trailRef.current.length - 1; i >= 0; i--) {
        trailRef.current[i].life -= 0.062;
        if (trailRef.current[i].life <= 0) trailRef.current.splice(i, 1);
      }

      setPos({ x: currentRef.current.x, y: currentRef.current.y });
      setTrail([...trailRef.current]);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready]);

  // ── Speech bubbles ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || isTouch.current || noMotion.current) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Intro
    timers.push(setTimeout(() => setBubble(INTRO_MSG), 900));
    timers.push(setTimeout(() => setBubble(null), 4500));

    // Periodic idle messages
    const schedule = (after: number) => {
      const t = setTimeout(() => {
        const msg = IDLE_MSGS[Math.floor(Math.random() * IDLE_MSGS.length)];
        setBubble(msg);
        const t2 = setTimeout(() => {
          setBubble(null);
          schedule(16_000 + Math.random() * 20_000);
        }, 3200);
        timers.push(t2);
      }, after);
      timers.push(t);
    };
    schedule(13_000);

    return () => timers.forEach(clearTimeout);
  }, [ready]);

  if (!ready) return null;

  // ── Mobile: fixed floating mascot only ───────────────────────────────────────
  if (isTouch.current) {
    return (
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 60,
          pointerEvents: "none",
          userSelect: "none",
          animation: "float 4s ease-in-out infinite",
        }}
      >
        <div style={{
          position: "absolute",
          inset: -8,
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, rgba(108,99,255,0.18) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(108,99,255,0.10) 0%, transparent 70%)",
          filter: "blur(8px)",
        }} />
        <MascotSvg size={38} isDark={isDark} />
      </div>
    );
  }

  // ── Desktop: full cursor-follow + trail + bubble ──────────────────────────────
  return (
    <>
      {/* Sparkle trail */}
      {trail.map(dot => {
        const alpha = Math.max(0, dot.life) * (isDark ? 0.72 : 0.42);
        const glowColor = dot.cyan ? "rgba(34,211,238," : "rgba(108,99,255,";
        return (
          <div
            key={dot.id}
            aria-hidden="true"
            style={{
              position: "fixed",
              left:  dot.x,
              top:   dot.y,
              width:  dot.sz,
              height: dot.sz,
              borderRadius: "50%",
              background: dot.cyan
                ? `rgba(34,211,238,${alpha})`
                : `rgba(108,99,255,${alpha})`,
              opacity: 1,
              transform: `translate(-50%,-50%) scale(${0.5 + dot.life * 0.5})`,
              boxShadow: isDark
                ? `0 0 ${dot.sz * 2.5}px ${glowColor}${alpha * 0.8})`
                : "none",
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 59,
              willChange: "opacity, transform",
            }}
          />
        );
      })}

      {/* Mascot */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: pos.x,
          top:  pos.y,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 60,
          willChange: "left, top",
        }}
      >
        {/* Glow halo */}
        <div style={{
          position: "absolute",
          inset: -18,
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle, rgba(108,99,255,0.20) 0%, transparent 68%)"
            : "radial-gradient(circle, rgba(108,99,255,0.10) 0%, transparent 68%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }} />

        {/* Speech bubble */}
        {bubble && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 12px)",
              left: "50%",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              background: isDark ? "rgba(10,14,26,0.96)" : "rgba(255,255,255,0.97)",
              color: isDark ? "#F5F7FA" : "#0D1117",
              border: `1px solid ${isDark ? "rgba(108,99,255,0.32)" : "rgba(108,99,255,0.24)"}`,
              borderRadius: 10,
              padding: "5px 11px",
              fontSize: 11.5,
              fontWeight: 500,
              fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
              letterSpacing: "0.01em",
              boxShadow: isDark
                ? "0 4px 22px rgba(0,0,0,0.5), 0 0 14px rgba(108,99,255,0.10)"
                : "0 4px 14px rgba(0,0,0,0.08)",
              animation: "fade-up 0.28s ease-out both",
              zIndex: 1,
            }}
          >
            {bubble}
            {/* Caret pointer */}
            <div style={{
              position: "absolute",
              bottom: -5,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `5px solid ${isDark ? "rgba(10,14,26,0.96)" : "rgba(255,255,255,0.97)"}`,
            }} />
          </div>
        )}

        {/* Mascot with gentle bob */}
        <div style={{ animation: "mascot-bob 3.6s ease-in-out infinite" }}>
          <MascotSvg size={44} isDark={isDark} />
        </div>
      </div>
    </>
  );
}
