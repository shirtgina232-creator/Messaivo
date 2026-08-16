"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { Eye, EyeOff, ArrowRight, Check, Mail } from "lucide-react";
import { MessaivoLogo } from "@/components/MessaivoLogo";

type Props = {
  heading?: string;
  description?: string;
  logoUrl?: string | null;
};

export default function SignupForm({
  heading = "Create your account",
  description = "Start managing customer conversations with Messaivo.",
  logoUrl,
}: Props) {
  const router = useRouter();
  const { signUp, fetchStatus } = useSignUp();
  const loading = fetchStatus === "fetching";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setError("");

    try {
      const { error: createError } = await signUp.create({
        emailAddress: email,
        password,
      });

      if (createError) {
        setError(createError.message ?? "Failed to create account.");
        return;
      }

      if (signUp.status === "complete") {
        const { error: finalizeError } = await signUp.finalize();
        if (finalizeError) {
          setError(finalizeError.message ?? "Failed to activate session.");
          return;
        }
        router.push("/app");
        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setError(sendError.message ?? "Failed to send verification email.");
        return;
      }

      setPendingVerification(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setError("");

    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
      if (verifyError) {
        setError(verifyError.message ?? "Invalid verification code.");
        return;
      }

      if (signUp.status === "complete") {
        const { error: finalizeError } = await signUp.finalize();
        if (finalizeError) {
          setError(finalizeError.message ?? "Failed to activate session.");
          return;
        }
        router.push("/app");
      }
    } catch {
      setError("Invalid verification code. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#07090D" }}>
      <div id="clerk-captcha" />

      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" width={140} height={38} style={{ height: 38, width: "auto", objectFit: "contain" }} unoptimized />
            ) : (
              <MessaivoLogo height={38} theme="light" showTagline={false} />
            )}
          </Link>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          {!pendingVerification ? (
            <>
              <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>{heading}</h1>
              <p className="text-[13px] mb-6" style={{ color: "#8B95A7" }}>{description}</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2.5 rounded-lg text-[13.5px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-3 py-2.5 rounded-lg text-[13.5px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-2.5 pr-10 rounded-lg text-[13.5px] outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={14} style={{ color: "#8B95A7" }} /> : <Eye size={14} style={{ color: "#8B95A7" }} />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-[12px] text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[13.5px] font-semibold text-white transition-all"
                  style={{ background: loading ? "rgba(108,99,255,0.6)" : "#6C63FF" }}
                >
                  {loading ? "Creating account…" : <>Create account <ArrowRight size={15} /></>}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t flex flex-col gap-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {["Free to start — no credit card required", "Connect Facebook Pages in minutes", "Cancel or change plans anytime"].map(b => (
                  <div key={b} className="flex items-center gap-2 text-[11.5px]" style={{ color: "#8B95A7" }}>
                    <Check size={11} style={{ color: "#10B981" }} />{b}
                  </div>
                ))}
              </div>

              <p className="text-center text-[12.5px] mt-4" style={{ color: "#8B95A7" }}>
                Already have an account?{" "}
                <Link href="/login" className="font-medium" style={{ color: "#6C63FF" }}>Sign in</Link>
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl mb-5 mx-auto" style={{ background: "rgba(108,99,255,0.12)" }}>
                <Mail size={22} style={{ color: "#6C63FF" }} />
              </div>
              <h1 className="text-[20px] font-semibold mb-1 text-center" style={{ color: "#F5F7FA" }}>Check your email</h1>
              <p className="text-[13px] mb-6 text-center" style={{ color: "#8B95A7" }}>
                We sent a 6-digit code to <span className="font-medium" style={{ color: "#F5F7FA" }}>{email}</span>
              </p>

              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Verification code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    autoFocus
                    className="w-full px-3 py-3 rounded-lg text-[20px] font-semibold tracking-[0.3em] text-center outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
                  />
                </div>

                {error && <p className="text-[12px] text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[13.5px] font-semibold text-white transition-all"
                  style={{ background: loading || code.length < 6 ? "rgba(108,99,255,0.6)" : "#6C63FF" }}
                >
                  {loading ? "Verifying…" : <>Verify email <ArrowRight size={15} /></>}
                </button>
              </form>

              <p className="text-center text-[12px] mt-4" style={{ color: "#8B95A7" }}>
                Didn&apos;t receive it?{" "}
                <button
                  className="font-medium"
                  style={{ color: "#6C63FF" }}
                  onClick={async () => {
                    const { error: resendError } = await signUp.verifications.sendEmailCode();
                    if (resendError) setError(resendError.message ?? "Failed to resend code.");
                  }}
                >
                  Resend code
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
