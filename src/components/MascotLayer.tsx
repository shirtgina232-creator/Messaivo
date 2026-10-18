"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";

// ── Constants ──────────────────────────────────────────────────────────────────
const SPRING        = 0.082;
const TRAIL_GAP     = 60;   // ms between sparkle dots
const MAX_TRAIL     = 9;
const CTA_NEAR_PX   = 160;  // px from cursor center to CTA center
const INTRO_HOLD_MS = 5800; // ms to stay near hero button before following cursor

// ── Messages ───────────────────────────────────────────────────────────────────
const INTRO_MSG_1 = "Hey there! 👋";
const INTRO_MSG_2 = "Click the Get Started button! 🚀";
const CTA_MSG     = "Click here 👆";
const IDLE_MSGS   = [
  "Need help? I'm here! 💙",
  "Let's grow together 🚀",
  "Welcome to Messaivo ✨",
  "I'll guide you around!",
];

// Selectors for CTA buttons to react to
const CTA_SELECTOR = 'a[href="/signup"], a[href="/login"], a[href="#demo"]';

// ──────────────────────────────────────────────────────────────────────────────
// Mascot SVG — Messaivo robot character
// White rounded body · dark glossy face · happy blinking LED eyes
// Blue antennae · blue/violet side pods · "M" logo · animated pointing arm
// ──────────────────────────────────────────────────────────────────────────────

function MascotSvg({
  size,
  isDark,
  isPointing,
}: {
  size: number;
  isDark: boolean;
  isPointing: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 128"
      width={size}
      height={Math.round(size * 128 / 100)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="msc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E6EEFF" />
        </linearGradient>
        <linearGradient id="msc-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="msc-m" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <filter id="msc-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="msc-eglow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ─── FEET ──────────────────────────────────────────────────────── */}
      <ellipse cx="37" cy="120" rx="13" ry="8" fill="url(#msc-blue)" opacity="0.9" />
      <ellipse cx="36" cy="117" rx="8"  ry="4" fill="white" opacity="0.3" />
      <ellipse cx="63" cy="120" rx="13" ry="8" fill="url(#msc-blue)" opacity="0.9" />
      <ellipse cx="62" cy="117" rx="8"  ry="4" fill="white" opacity="0.3" />

      {/* ─── BODY ──────────────────────────────────────────────────────── */}
      <rect x="27" y="71" width="46" height="47" rx="18" fill="#A5B4FC" opacity="0.22" />
      <rect x="24" y="67" width="52" height="50" rx="20" fill="url(#msc-body)" />
      <rect x="29" y="69" width="42" height="14" rx="12" fill="white" opacity="0.5" />
      <rect
        x="24" y="67" width="52" height="50" rx="20"
        stroke="#6366F1" strokeWidth="1.2"
        opacity={isDark ? "0.5" : "0.25"}
      />

      {/* ─── M LOGO ────────────────────────────────────────────────────── */}
      <path
        d="M 37 100 L 37 87 L 50 95 L 63 87 L 63 100"
        stroke="url(#msc-m)" strokeWidth="4.5"
        strokeLinecap="round" strokeLinejoin="round"
      />

      {/* ─── LEFT HAND (static) ────────────────────────────────────────── */}
      <ellipse cx="17" cy="86" rx="8" ry="12" fill="url(#msc-blue)" opacity="0.88" />
      <ellipse cx="16" cy="82" rx="5" ry="4"  fill="white" opacity="0.32" />

      {/* ─── RIGHT HAND — raises & pulses when isPointing ──────────────── */}
      <g
        style={{
          animation:  isPointing ? "msc-point-pulse 1.1s ease-in-out infinite" : "none",
          transform:  isPointing ? undefined : "translate(0,0)",
          transition: !isPointing ? "transform 0.45s cubic-bezier(0.34,1.56,0.64,1)" : undefined,
        }}
      >
        <ellipse cx="83" cy="86" rx="8" ry="12" fill="url(#msc-blue)" opacity="0.88" />
        <ellipse cx="82" cy="82" rx="5" ry="4"  fill="white" opacity="0.32" />
      </g>

      {/* ─── POINTING DIRECTION DOTS (fade in when isPointing) ─────────── */}
      <g style={{ opacity: isPointing ? 1 : 0, transition: "opacity 0.35s ease" }}>
        <circle cx="98"  cy="66" r="3.0" fill="#22D3EE" filter="url(#msc-glow)" opacity="0.82" />
        <circle cx="105" cy="60" r="2.0" fill="#22D3EE" opacity="0.62" />
        <circle cx="110" cy="55" r="1.3" fill="#22D3EE" opacity="0.4" />
      </g>

      {/* ─── HEAD ──────────────────────────────────────────────────────── */}
      <circle cx="50" cy="43" r="30" fill="#C7D7FF" opacity="0.28" />
      <circle cx="50" cy="40" r="29" fill="url(#msc-body)" />
      <ellipse cx="50" cy="27" rx="19" ry="12" fill="white" opacity="0.45" />
      <circle
        cx="50" cy="40" r="29"
        stroke="#6366F1" strokeWidth="1.2"
        opacity={isDark ? "0.42" : "0.2"}
      />

      {/* ─── SIDE PODS ─────────────────────────────────────────────────── */}
      <circle cx="22" cy="44" r="9.5" fill="url(#msc-blue)" filter="url(#msc-glow)" opacity="0.82" />
      <circle cx="21" cy="41" r="5"   fill="white" opacity="0.38" />
      <circle cx="22" cy="44" r="9.5" stroke="#60A5FA" strokeWidth="0.9" opacity="0.55" />
      <circle cx="78" cy="44" r="9.5" fill="url(#msc-blue)" filter="url(#msc-glow)" opacity="0.82" />
      <circle cx="77" cy="41" r="5"   fill="white" opacity="0.38" />
      <circle cx="78" cy="44" r="9.5" stroke="#60A5FA" strokeWidth="0.9" opacity="0.55" />

      {/* ─── FACE SCREEN ───────────────────────────────────────────────── */}
      <rect x="28" y="27" width="44" height="28" rx="12" fill="#010407" opacity="0.2" />
      <rect x="26" y="25" width="48" height="28" rx="13" fill="#0B1020" />
      <rect x="26" y="25" width="48" height="28" rx="13"
        stroke="#22D3EE" strokeWidth="0.7" opacity="0.3" />
      <rect x="30" y="27" width="40" height="6" rx="5" fill="white" opacity="0.055" />

      {/* ─── LEFT EYE — blinking LED arc ───────────────────────────────── */}
      <ellipse cx="37" cy="38" rx="8" ry="6" fill="#22D3EE" opacity="0.06" filter="url(#msc-eglow)" />
      <g style={{ animation: "msc-blink 3.5s ease-in-out infinite" }}>
        <path d="M 30 41 Q 37 31 44 41"
          stroke="#22D3EE" strokeWidth="2.8" strokeLinecap="round"
          filter="url(#msc-eglow)" />
        <path d="M 30 41 Q 37 31 44 41"
          stroke="#7DD3FC" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
        <circle cx="33" cy="37" r="1.5" fill="white" opacity="0.65" />
      </g>

      {/* ─── RIGHT EYE — blink with slight delay ───────────────────────── */}
      <ellipse cx="63" cy="38" rx="8" ry="6" fill="#22D3EE" opacity="0.06" filter="url(#msc-eglow)" />
      <g style={{ animation: "msc-blink 3.5s ease-in-out 0.4s infinite" }}>
        <path d="M 56 41 Q 63 31 70 41"
          stroke="#22D3EE" strokeWidth="2.8" strokeLinecap="round"
          filter="url(#msc-eglow)" />
        <path d="M 56 41 Q 63 31 70 41"
          stroke="#7DD3FC" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
        <circle cx="59" cy="37" r="1.5" fill="white" opacity="0.65" />
      </g>

      {/* Subtle cheek blush */}
      <ellipse cx="29" cy="47" rx="5.5" ry="3.5" fill="#FDA4AF" opacity="0.14" />
      <ellipse cx="71" cy="47" rx="5.5" ry="3.5" fill="#FDA4AF" opacity="0.14" />

      {/* ─── ANTENNAE ──────────────────────────────────────────────────── */}
      <line x1="39" y1="13" x2="41" y2="25" stroke="#3B82F6" strokeWidth="2.3" strokeLinecap="round" />
      <circle cx="38" cy="9" r="5.5" fill="#3B82F6" filter="url(#msc-glow)" />
      <circle cx="37" cy="7" r="2.8" fill="white" opacity="0.55" />
      <line x1="61" y1="13" x2="59" y2="25" stroke="#3B82F6" strokeWidth="2.3" strokeLinecap="round" />
      <circle cx="62" cy="9" r="5.5" fill="#3B82F6" filter="url(#msc-glow)" />
      <circle cx="63" cy="7" r="2.8" fill="white" opacity="0.55" />
    </svg>
  );
}

// ── Trail particle type ─────────────────────────────────────────────────────────
type Dot = { id: number; x: number; y: number; life: number; sz: number; cyan: boolean };

// ──────────────────────────────────────────────────────────────────────────────
// MascotLayer
//
// Behavior phases:
//   "intro"  — mascot springs to a position just left of the hero "Get Started"
//              button, raises arm, shows speech bubble, stays there for 5.8 s
//   "follow" — switches to smooth spring cursor-follow; reacts to CTA proximity
//
// pointer-events: none throughout — never blocks any click target
// ──────────────────────────────────────────────────────────────────────────────

export default function MascotLayer() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [pos, setPos]         = useState({ x: -400, y: -400 });
  const [trail, setTrail]     = useState<Dot[]>([]);
  const [bubble, setBubble]   = useState<string | null>(null);
  const [phase, setPhase]     = useState<"intro" | "follow">("intro");
  const [nearCta, setNearCta] = useState(false);
  const [ready, setReady]     = useState(false);

  // Derived: mascot points when in intro phase OR cursor is near a CTA
  const isPointing = phase === "intro" || nearCta;

  // All mutable state for the RAF lives in refs to avoid stale closures
  const mouseRef       = useRef({ x: 0, y: 0 });
  const springTarget   = useRef({ x: -400, y: -400 }); // what the spring moves toward
  const currentRef     = useRef({ x: -400, y: -400 }); // current spring position
  const rafRef         = useRef<number>(0);
  const trailRef       = useRef<Dot[]>([]);
  const dotIdRef       = useRef(0);
  const lastDotMs      = useRef(0);
  const phaseRef       = useRef<"intro" | "follow">("intro");
  const nearCtaRef     = useRef(false);
  const ctaBubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouch        = useRef(false);
  const noMotion       = useRef(false);

  // ── Detect environment once ─────────────────────────────────────────────────
  useEffect(() => {
    isTouch.current  = window.matchMedia("(pointer: coarse)").matches;
    noMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReady(true);
  }, []);

  // ── Mouse tracking ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || isTouch.current || noMotion.current) return;
    const onMove = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [ready]);

  // ── Spring animation loop ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || isTouch.current || noMotion.current) return;

    // Find the hero "Get Started" button — must be:
    //   • below the navbar (top > 80)
    //   • on-screen horizontally (left within viewport)
    //   • actually visible (no ancestor has opacity: 0, e.g. closed mobile menu)
    const allBtns = document.querySelectorAll<HTMLElement>('a[href="/signup"]');
    const heroBtn = Array.from(allBtns).find(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 50 || r.top <= 80 || r.top >= window.innerHeight) return false;
      if (r.left < 0 || r.right > window.innerWidth + 50)            return false;
      // Walk ancestors — skip if any parent has opacity < 0.5 (closed mobile overlay)
      let node: HTMLElement | null = el.parentElement;
      while (node && node !== document.body) {
        if (parseFloat(getComputedStyle(node).opacity) < 0.5) return false;
        node = node.parentElement;
      }
      return true;
    });

    if (heroBtn) {
      const r = heroBtn.getBoundingClientRect();
      // Position mascot to the left of the button, vertically centered.
      // Clamp so mascot center is at least 72px from left edge (mascot is ~64px wide → 32px radius + 40px buffer)
      const introX = Math.max(72, r.left - 80);
      const introY = r.top + r.height / 2 + 6;
      springTarget.current  = { x: introX, y: introY };
      currentRef.current    = { x: introX - 100, y: introY + 20 }; // spring in from left
      mouseRef.current      = { x: introX - 100, y: introY + 20 };
    } else {
      // Fallback if hero button not found
      const fx = window.innerWidth * 0.3;
      const fy = window.innerHeight * 0.48;
      springTarget.current = { x: fx, y: fy };
      currentRef.current   = { x: fx - 100, y: fy };
      mouseRef.current     = { x: fx, y: fy };
    }

    const tick = (ts: number) => {
      // In follow phase, spring target tracks the real cursor
      if (phaseRef.current === "follow") {
        springTarget.current = { ...mouseRef.current };
      }

      const tx = springTarget.current.x;
      const ty = springTarget.current.y;
      const px = currentRef.current.x;
      const py = currentRef.current.y;
      const dx = tx - px;
      const dy = ty - py;
      currentRef.current.x = px + dx * SPRING;
      currentRef.current.y = py + dy * SPRING;

      const speed = Math.sqrt(dx * dx + dy * dy);

      // Spawn sparkle dot when moving fast enough
      if (speed > 2.5 && ts - lastDotMs.current > TRAIL_GAP) {
        lastDotMs.current = ts;
        trailRef.current.push({
          id:   ++dotIdRef.current,
          x:    currentRef.current.x,
          y:    currentRef.current.y,
          life: 1.0,
          sz:   2.3 + Math.random() * 2.6,
          cyan: dotIdRef.current % 3 === 0,
        });
        if (trailRef.current.length > MAX_TRAIL) trailRef.current.shift();
      }

      // Decay trail
      for (let i = trailRef.current.length - 1; i >= 0; i--) {
        trailRef.current[i].life -= 0.062;
        if (trailRef.current[i].life <= 0) trailRef.current.splice(i, 1);
      }

      // CTA proximity check (every ~6 frames to avoid layout thrash)
      if (phaseRef.current === "follow" && dotIdRef.current % 6 === 0) {
        const ctaEls = document.querySelectorAll<HTMLElement>(CTA_SELECTOR);
        let closest = Infinity;
        ctaEls.forEach(el => {
          const r   = el.getBoundingClientRect();
          const cx2 = r.left + r.width  / 2;
          const cy2 = r.top  + r.height / 2;
          const d   = Math.sqrt(
            (mouseRef.current.x - cx2) ** 2 + (mouseRef.current.y - cy2) ** 2
          );
          if (d < closest) closest = d;
        });

        const isNear = closest < CTA_NEAR_PX;
        if (isNear !== nearCtaRef.current) {
          nearCtaRef.current = isNear;
          setNearCta(isNear);
          if (isNear) {
            if (ctaBubbleTimer.current) clearTimeout(ctaBubbleTimer.current);
            setBubble(CTA_MSG);
          } else {
            ctaBubbleTimer.current = setTimeout(() => {
              if (!nearCtaRef.current) setBubble(null);
            }, 450);
          }
        }
      }

      setPos({ x: currentRef.current.x, y: currentRef.current.y });
      setTrail([...trailRef.current]);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (ctaBubbleTimer.current) clearTimeout(ctaBubbleTimer.current);
    };
  }, [ready]);

  // ── Speech bubbles + phase transition ──────────────────────────────────────
  useEffect(() => {
    if (!ready || isTouch.current || noMotion.current) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Intro speech sequence
    timers.push(setTimeout(() => setBubble(INTRO_MSG_1), 380));
    timers.push(setTimeout(() => setBubble(INTRO_MSG_2), 2000));

    // Switch from intro → follow
    timers.push(setTimeout(() => {
      phaseRef.current = "follow";
      setPhase("follow");
      if (!nearCtaRef.current) setBubble(null);
    }, INTRO_HOLD_MS));

    // Idle messages (start after intro ends + 8s gap)
    const schedule = (after: number) => {
      const t = setTimeout(() => {
        if (nearCtaRef.current || phaseRef.current === "intro") {
          schedule(8_000);
          return;
        }
        const msg = IDLE_MSGS[Math.floor(Math.random() * IDLE_MSGS.length)];
        setBubble(msg);
        const t2 = setTimeout(() => {
          if (!nearCtaRef.current) setBubble(null);
          schedule(14_000 + Math.random() * 18_000);
        }, 3200);
        timers.push(t2);
      }, after);
      timers.push(t);
    };
    schedule(INTRO_HOLD_MS + 9_000);

    return () => timers.forEach(clearTimeout);
  }, [ready]);

  if (!ready) return null;

  // ── Mobile: fixed floating mascot near bottom ───────────────────────────────
  if (isTouch.current) {
    return (
      <div
        aria-hidden="true"
        style={{
          position:      "fixed",
          bottom:        28,
          right:         22,
          zIndex:        60,
          pointerEvents: "none",
          userSelect:    "none",
          animation:     "float 4s ease-in-out infinite",
        }}
      >
        <div style={{
          position:     "absolute",
          inset:        -12,
          borderRadius: "50%",
          background:   isDark
            ? "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          filter: "blur(8px)",
        }} />
        {/* Persistent bubble on mobile */}
        <div style={{
          position:     "absolute",
          bottom:       "calc(100% + 10px)",
          left:         "50%",
          transform:    "translateX(-50%)",
          whiteSpace:   "nowrap",
          background:   isDark ? "rgba(9,12,22,0.96)" : "rgba(255,255,255,0.97)",
          color:        isDark ? "#EEF2FF" : "#0D1117",
          border:       `1px solid ${isDark ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.22)"}`,
          borderRadius: 9,
          padding:      "4px 10px",
          fontSize:     11,
          fontWeight:   500,
          fontFamily:   "var(--font-geist-sans, system-ui, sans-serif)",
          boxShadow:    isDark ? "0 4px 18px rgba(0,0,0,0.5)" : "0 3px 12px rgba(0,0,0,0.08)",
        }}>
          Any questions? I&apos;m a click away! 💙
          <div style={{
            position:    "absolute",
            bottom:      -4,
            left:        "50%",
            transform:   "translateX(-50%)",
            width:       0,
            height:      0,
            borderLeft:  "4px solid transparent",
            borderRight: "4px solid transparent",
            borderTop:   `4px solid ${isDark ? "rgba(9,12,22,0.96)" : "rgba(255,255,255,0.97)"}`,
          }} />
        </div>
        <MascotSvg size={46} isDark={isDark} isPointing={true} />
      </div>
    );
  }

  // ── Desktop: spring cursor-follow + trail + bubble ─────────────────────────
  return (
    <>
      {/* Sparkle trail */}
      {trail.map(dot => {
        const alpha     = Math.max(0, dot.life) * (isDark ? 0.7 : 0.36);
        const glowColor = dot.cyan ? "rgba(34,211,238," : "rgba(99,102,241,";
        return (
          <div
            key={dot.id}
            aria-hidden="true"
            style={{
              position:      "fixed",
              left:          dot.x,
              top:           dot.y,
              width:         dot.sz,
              height:        dot.sz,
              borderRadius:  "50%",
              background:    dot.cyan
                ? `rgba(34,211,238,${alpha})`
                : `rgba(99,102,241,${alpha})`,
              transform:     `translate(-50%,-50%) scale(${0.4 + dot.life * 0.6})`,
              boxShadow:     isDark
                ? `0 0 ${dot.sz * 2.8}px ${glowColor}${alpha * 0.7})`
                : "none",
              pointerEvents: "none",
              userSelect:    "none",
              zIndex:        59,
              willChange:    "opacity, transform",
            }}
          />
        );
      })}

      {/* Mascot */}
      <div
        aria-hidden="true"
        style={{
          position:      "fixed",
          left:          pos.x,
          top:           pos.y,
          transform:     "translate(-50%, -50%)",
          pointerEvents: "none",
          userSelect:    "none",
          zIndex:        60,
          willChange:    "left, top",
        }}
      >
        {/* Ambient glow halo */}
        <div style={{
          position:     "absolute",
          inset:        -22,
          borderRadius: "50%",
          background:   isDark
            ? "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%)",
          filter: "blur(12px)",
        }} />

        {/* Speech bubble */}
        {bubble && (
          <div
            style={{
              position:      "absolute",
              bottom:        "calc(100% + 12px)",
              left:          "50%",
              transform:     "translateX(-50%)",
              whiteSpace:    "nowrap",
              background:    isDark ? "rgba(9,12,22,0.96)" : "rgba(255,255,255,0.97)",
              color:         isDark ? "#EEF2FF" : "#0D1117",
              border:        `1px solid ${isDark
                ? "rgba(99,102,241,0.35)"
                : "rgba(99,102,241,0.22)"}`,
              borderRadius:  10,
              padding:       "5px 12px",
              fontSize:      11.5,
              fontWeight:    500,
              fontFamily:    "var(--font-geist-sans, system-ui, sans-serif)",
              letterSpacing: "0.01em",
              boxShadow:     isDark
                ? "0 4px 22px rgba(0,0,0,0.55), 0 0 12px rgba(99,102,241,0.12)"
                : "0 4px 14px rgba(0,0,0,0.08)",
              animation:     "fade-up 0.28s ease-out both",
              zIndex:        1,
            }}
          >
            {bubble}
            <div style={{
              position:    "absolute",
              bottom:      -5,
              left:        "50%",
              transform:   "translateX(-50%)",
              width:       0,
              height:      0,
              borderLeft:  "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop:   `5px solid ${
                isDark ? "rgba(9,12,22,0.96)" : "rgba(255,255,255,0.97)"
              }`,
            }} />
          </div>
        )}

        {/* Lean toward CTA wrapper + gentle bob */}
        <div style={{
          transform:  isPointing ? "rotate(6deg)" : "rotate(0deg)",
          transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <div style={{ animation: "mascot-bob 3.6s ease-in-out infinite" }}>
            <MascotSvg size={64} isDark={isDark} isPointing={isPointing} />
          </div>
        </div>
      </div>
    </>
  );
}
