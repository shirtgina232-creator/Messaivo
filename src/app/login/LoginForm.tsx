"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { MessaivoLogo } from "@/components/MessaivoLogo";

// "verify" handles both code entry and new-password entry without a view change,
// which keeps the Clerk signIn attempt alive between verifyCode() and submitPassword().
type View = "login" | "forgot" | "verify";

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

function PwInput({ value, onChange, placeholder = "••••••••", autoFocus }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
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
  const { signIn, fetchStatus } = useSignIn();
  const isFetching = fetchStatus === "fetching";

  const [view, setView] = useState<View>("login");
  const [busy, setBusy] = useState(false);
  const loading = isFetching || busy;

  // Login
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  // Forgot / verify
  const [resetEmail, setResetEmail]   = useState("");
  const [code, setCode]               = useState("");
  // codeVerified gates the password fields — no view change occurs between
  // verifyCode() and submitPassword() so the Clerk attempt stays intact.
  const [codeVerified, setCodeVerified] = useState(false);
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");

  function goTo(v: View) {
    setError("");
    setCodeVerified(false);
    setCode("");
    setNewPw("");
    setConfirmPw("");
    setView(v);
  }

  // ── SIGN IN ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError("");
    try {
      const { error: err } = await signIn!.password({ emailAddress: email, password });
      if (err) { setError(err.message ?? "Invalid email or password."); return; }
      if (signIn!.status === "complete") {
        const { error: finalErr } = await signIn!.finalize();
        if (finalErr) { setError(finalErr.message ?? "Failed to activate session."); return; }
        try {
          const res = await fetch("/api/auth/role");
          const { role } = (await res.json()) as { role: string | null };
          router.push(["SUPER_ADMIN", "ADMIN", "SUPPORT", "FINANCE"].includes(role ?? "") ? "/admin" : "/app");
        } catch {
          router.push("/app");
        }
      }
    } catch {
      setError("Invalid email or password.");
    }
  };

  // ── STEP 1: SEND CODE ─────────────────────────────────────────────────────
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) { setError("Please enter your email address."); return; }
    setError("");
    setBusy(true);
    try {
      const { error: createErr } = await signIn!.create({ identifier: resetEmail });
      if (createErr) { setError(createErr.message ?? "No account found with that email."); return; }

      const { error: sendErr } = await signIn!.resetPasswordEmailCode.sendCode();
      if (sendErr) { setError(sendErr.message ?? "Failed to send reset code. Try again."); return; }

      // Move to verify view — code is now in flight
      setError("");
      setView("verify");
    } catch {
      setError("Could not send reset email. Check the address and try again.");
    } finally {
      setBusy(false);
    }
  };

  // ── STEP 2a: VERIFY CODE ──────────────────────────────────────────────────
  // On success we reveal the password fields IN THE SAME VIEW.
  // No view transition = signIn attempt stays alive.
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) { setError("Please enter the verification code."); return; }
    setError("");
    setBusy(true);
    try {
      const { error: verifyErr } = await signIn!.resetPasswordEmailCode.verifyCode({ code });
      if (verifyErr) { setError(verifyErr.message ?? "Invalid or expired code. Try again."); return; }
      // Reveal password fields without changing view
      setCodeVerified(true);
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ── STEP 2b: SET NEW PASSWORD ─────────────────────────────────────────────
  // Called while still on the "verify" view — same signIn instance guaranteed.
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPw || !confirmPw)  { setError("Please fill in both password fields."); return; }
    if (newPw !== confirmPw)   { setError("Passwords do not match."); return; }
    if (newPw.length < 8)      { setError("Password must be at least 8 characters."); return; }
    setError("");
    setBusy(true);
    try {
      const { error: pwErr } = await signIn!.resetPasswordEmailCode.submitPassword({ password: newPw });
      if (pwErr) { setError(pwErr.message ?? "Failed to set password. Please try again."); return; }
      // Password reset successful — go to login
      router.push("/login?reset=success");
    } catch {
      setError("Something went wrong. Please start over.");
    } finally {
      setBusy(false);
    }
  };

  // ── SHARED STYLES ──────────────────────────────────────────────────────────
  const submitBtn = (label: React.ReactNode, loadingLabel: string) => (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[13.5px] font-semibold text-white transition-all"
      style={{ background: loading ? "rgba(108,99,255,0.6)" : "#6C63FF" }}
    >
      {loading ? loadingLabel : label}
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
                  <PwInput value={password} onChange={setPassword} />
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

          {/* ── STEP 1: ENTER EMAIL ── */}
          {view === "forgot" && (
            <>
              {backBtn(() => goTo("login"), "Back to sign in")}

              <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Reset password</h1>
              <p className="text-[13px] mb-6" style={{ color: "#8B95A7" }}>
                Enter your account email and we&apos;ll send you a 6-digit verification code.
              </p>

              <form onSubmit={handleSendCode} className="flex flex-col gap-4">
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Email</label>
                  <input
                    type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                    placeholder="you@company.com" className={inputCls} style={inputStyle} autoFocus
                  />
                </div>

                {error && <p className="text-[12px] text-red-400">{error}</p>}

                {submitBtn(<>Send code <ArrowRight size={15} /></>, "Sending…")}
              </form>
            </>
          )}

          {/* ── STEP 2: VERIFY CODE → (same view) → SET PASSWORD ── */}
          {view === "verify" && (
            <>
              {!codeVerified && backBtn(() => goTo("forgot"))}

              {/* Phase A: code entry */}
              {!codeVerified && (
                <>
                  <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>
                    Enter verification code
                  </h1>
                  <p className="text-[13px] mb-6" style={{ color: "#8B95A7" }}>
                    We sent a 6-digit code to{" "}
                    <span style={{ color: "#F5F7FA" }}>{resetEmail}</span>. Enter it below.
                  </p>

                  <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
                    <div>
                      <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>
                        Verification code
                      </label>
                      <input
                        type="text" value={code} onChange={e => setCode(e.target.value.trim())}
                        placeholder="000000" maxLength={6} inputMode="numeric"
                        className={inputCls} style={inputStyle} autoFocus
                      />
                    </div>

                    {error && <p className="text-[12px] text-red-400">{error}</p>}

                    {submitBtn(<>Verify code <ArrowRight size={15} /></>, "Verifying…")}

                    <p className="text-center text-[12px]" style={{ color: "#8B95A7" }}>
                      Didn&apos;t receive it?{" "}
                      <button
                        type="button"
                        onClick={() => goTo("forgot")}
                        className="font-medium transition-opacity hover:opacity-80"
                        style={{ color: "#6C63FF" }}
                      >
                        Resend code
                      </button>
                    </p>
                  </form>
                </>
              )}

              {/* Phase B: password entry — revealed after verifyCode() succeeds */}
              {codeVerified && (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <CheckCircle size={15} className="shrink-0" style={{ color: "#22c55e" }} />
                    <span className="text-[12px]" style={{ color: "#8B95A7" }}>
                      Code verified — now set your new password
                    </span>
                  </div>

                  <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>
                    Set new password
                  </h1>
                  <p className="text-[13px] mb-6" style={{ color: "#8B95A7" }}>
                    Choose a new password for your account.
                  </p>

                  <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
                    <div>
                      <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>
                        New password
                      </label>
                      <PwInput value={newPw} onChange={setNewPw} placeholder="Min. 8 characters" autoFocus />
                    </div>
                    <div>
                      <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>
                        Confirm password
                      </label>
                      <PwInput value={confirmPw} onChange={setConfirmPw} />
                    </div>

                    {error && <p className="text-[12px] text-red-400">{error}</p>}

                    {submitBtn(<>Reset password <ArrowRight size={15} /></>, "Resetting…")}
                  </form>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
