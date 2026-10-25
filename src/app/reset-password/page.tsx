"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { MessaivoLogo } from "@/components/MessaivoLogo";

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#F5F7FA",
};
const inputCls = "w-full px-3 py-2.5 rounded-lg text-[13.5px] outline-none transition-all";

function PwInput({ value, onChange, placeholder = "••••••••", autoFocus, autoComplete }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
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

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [done, setDone]           = useState(false);
  const [invalid, setInvalid]     = useState(!token);

  useEffect(() => {
    if (!token) setInvalid(true);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPw || !confirmPw) { setError("Please fill in both fields."); return; }
    if (newPw !== confirmPw)  { setError("Passwords do not match."); return; }
    if (newPw.length < 8)     { setError("Password must be at least 8 characters."); return; }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: newPw }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        if (data.error?.includes("expired") || data.error?.includes("invalid")) {
          setInvalid(true);
        } else {
          setError(data.error ?? "Failed to reset password.");
        }
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/app"), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#07090D" }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center">
            <MessaivoLogo height={38} theme="light" showTagline={false} />
          </Link>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>

          {/* Invalid / expired token */}
          {invalid && (
            <div className="flex flex-col items-center text-center gap-4">
              <XCircle size={40} style={{ color: "#EF4444" }} />
              <h1 className="text-[20px] font-semibold" style={{ color: "#F5F7FA" }}>Link expired</h1>
              <p className="text-[13px]" style={{ color: "#8B95A7" }}>
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                href="/login"
                className="flex items-center gap-2 w-full py-3 justify-center rounded-xl text-[13.5px] font-semibold text-white"
                style={{ background: "#6C63FF" }}
              >
                Back to sign in
              </Link>
            </div>
          )}

          {/* Success */}
          {done && !invalid && (
            <div className="flex flex-col items-center text-center gap-4">
              <CheckCircle size={40} style={{ color: "#10B981" }} />
              <h1 className="text-[20px] font-semibold" style={{ color: "#F5F7FA" }}>Password updated</h1>
              <p className="text-[13px]" style={{ color: "#8B95A7" }}>
                You&apos;re signed in. Redirecting to your workspace…
              </p>
            </div>
          )}

          {/* Form */}
          {!invalid && !done && (
            <>
              <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Set new password</h1>
              <p className="text-[13px] mb-6" style={{ color: "#8B95A7" }}>
                Choose a new password for your account.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>New password</label>
                  <PwInput value={newPw} onChange={setNewPw} placeholder="Min. 8 characters" autoFocus autoComplete="new-password" />
                </div>
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Confirm password</label>
                  <PwInput value={confirmPw} onChange={setConfirmPw} autoComplete="new-password" />
                </div>

                {error && <p className="text-[12px] text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[13.5px] font-semibold text-white transition-all"
                  style={{ background: busy ? "rgba(108,99,255,0.6)" : "#6C63FF" }}
                >
                  {busy ? "Saving…" : <>Reset password <ArrowRight size={15} /></>}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
