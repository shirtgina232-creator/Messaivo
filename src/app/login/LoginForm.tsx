"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { MessaivoLogo } from "@/components/MessaivoLogo";

type View = "login" | "forgot" | "sent";

type Props = {
  heading?: string;
  description?: string;
  logoUrl?: string | null;
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#F5F7FA",
};
const inputCls = "w-full px-3 py-2.5 rounded-lg text-[13.5px] outline-none transition-all";

function PwInput({ value, onChange, placeholder = "••••••••", autoFocus, name, autoComplete }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  name?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        name={name}
        autoComplete={autoComplete}
        className={`${inputCls} pr-10`}
        style={inputStyle}
      />
      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShow(s => !s)}>
        {show ? <EyeOff size={14} style={{ color: "#8B95A7" }} /> : <Eye size={14} style={{ color: "#8B95A7" }} />}
      </button>
    </div>
  );
}

export default function LoginForm({
  heading = "Welcome back",
  description = "Sign in to your Messaivo workspace.",
  logoUrl,
}: Props) {
  const router = useRouter();

  const [view, setView] = useState<View>("login");
  const [busy, setBusy] = useState(false);

  // Login
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  // Forgot
  const [resetEmail, setResetEmail] = useState("");
  const [sentEmail, setSentEmail]   = useState("");

  function goTo(v: View) {
    setError("");
    setView(v);
  }

  // ── SIGN IN ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const emailVal = email || (fd.get("email") as string) || "";
    const pwVal    = password || (fd.get("password") as string) || "";
    if (!emailVal || !pwVal) { setError("Please fill in all fields."); return; }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password: pwVal }),
      });
      const data = await res.json() as { ok?: boolean; role?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Invalid email or password.");
        return;
      }
      const role = data.role ?? "";
      router.push(["SUPER_ADMIN", "ADMIN", "SUPPORT", "FINANCE"].includes(role) ? "/admin" : "/app");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ── FORGOT PASSWORD ────────────────────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) { setError("Please enter your email address."); return; }
    setError("");
    setBusy(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      // Always show "sent" to prevent email enumeration
      setSentEmail(resetEmail);
      setView("sent");
    } catch {
      setError("Could not send reset email. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ── SHARED STYLES ──────────────────────────────────────────────────────────
  const submitBtn = (label: React.ReactNode, loadingLabel: string) => (
    <button
      type="submit"
      disabled={busy}
      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[13.5px] font-semibold text-white transition-all"
      style={{ background: busy ? "rgba(108,99,255,0.6)" : "#6C63FF" }}
    >
      {busy ? loadingLabel : label}
    </button>
  );

  const backBtn = (onClick: () => void, label = "Back") => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-[12px] mb-5 transition-opacity hover:opacity-70"
      style={{ color: "#8B95A7" }}
    >
      <ArrowLeft size={13} /> {label}
    </button>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#07090D" }}>
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" width={140} height={38}
                style={{ height: 38, width: "auto", objectFit: "contain" }} unoptimized />
            ) : (
              <MessaivoLogo height={38} theme="light" showTagline={false} />
            )}
          </Link>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>

          {/* ── LOGIN ── */}
          {view === "login" && (
            <>
              <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>{heading}</h1>
              <p className="text-[13px] mb-6" style={{ color: "#8B95A7" }}>{description}</p>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com" className={inputCls} style={inputStyle}
                    name="email" autoComplete="email"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] font-medium" style={{ color: "#8B95A7" }}>Password</label>
                    <button
                      type="button"
                      onClick={() => { setResetEmail(email); goTo("forgot"); }}
                      className="text-[11.5px] font-medium transition-opacity hover:opacity-80"
                      style={{ color: "#6C63FF" }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <PwInput value={password} onChange={setPassword} name="password" autoComplete="current-password" />
                </div>

                {error && <p className="text-[12px] text-red-400">{error}</p>}

                {submitBtn(<>Sign in <ArrowRight size={15} /></>, "Signing in…")}
              </form>

              <p className="text-center text-[12.5px] mt-5" style={{ color: "#8B95A7" }}>
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-medium" style={{ color: "#6C63FF" }}>Sign up</Link>
              </p>
            </>
          )}

          {/* ── FORGOT: ENTER EMAIL ── */}
          {view === "forgot" && (
            <>
              {backBtn(() => goTo("login"), "Back to sign in")}

              <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Reset password</h1>
              <p className="text-[13px] mb-6" style={{ color: "#8B95A7" }}>
                Enter your account email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleForgot} className="flex flex-col gap-4">
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Email</label>
                  <input
                    type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                    placeholder="you@company.com" className={inputCls} style={inputStyle} autoFocus
                    name="email" autoComplete="email"
                  />
                </div>

                {error && <p className="text-[12px] text-red-400">{error}</p>}

                {submitBtn(<>Send reset link <ArrowRight size={15} /></>, "Sending…")}
              </form>
            </>
          )}

          {/* ── SENT CONFIRMATION ── */}
          {view === "sent" && (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl mb-5 mx-auto" style={{ background: "rgba(108,99,255,0.12)" }}>
                <Mail size={22} style={{ color: "#6C63FF" }} />
              </div>
              <h1 className="text-[20px] font-semibold mb-1 text-center" style={{ color: "#F5F7FA" }}>Check your email</h1>
              <p className="text-[13px] mb-6 text-center" style={{ color: "#8B95A7" }}>
                If <span className="font-medium" style={{ color: "#F5F7FA" }}>{sentEmail}</span> is registered, you&apos;ll receive a password reset link shortly.
              </p>
              <button
                type="button"
                className="w-full py-3 rounded-xl text-[13.5px] font-semibold text-white"
                style={{ background: "#6C63FF" }}
                onClick={() => { goTo("login"); }}
              >
                Back to sign in
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
