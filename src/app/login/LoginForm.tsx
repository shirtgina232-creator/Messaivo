"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { MessaivoLogo } from "@/components/MessaivoLogo";

type Props = {
  heading?: string;
  description?: string;
  logoUrl?: string | null;
};

export default function LoginForm({ heading = "Welcome back", description = "Sign in to your Messaivo workspace.", logoUrl }: Props) {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const loading = fetchStatus === "fetching";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }

    setError("");

    try {
      const { error: clerkError } = await signIn.password({ emailAddress: email, password });
      if (clerkError) {
        setError(clerkError.message ?? "Invalid email or password.");
        return;
      }
      if (signIn.status === "complete") {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) {
          setError(finalizeError.message ?? "Failed to activate session.");
          return;
        }
        // Role is verified server-side — never stored client-side
        try {
          const res = await fetch("/api/auth/role");
          const { role } = (await res.json()) as { role: string | null };
          const adminRoles = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "FINANCE"];
          router.push(adminRoles.includes(role ?? "") ? "/admin" : "/app");
        } catch {
          router.push("/app");
        }
      }
    } catch {
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#07090D" }}>
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
          <h1 className="text-[20px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>{heading}</h1>
          <p className="text-[13px] mb-6" style={{ color: "#8B95A7" }}>{description}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[12px] font-medium block mb-1.5" style={{ color: "#8B95A7" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 rounded-lg text-[13.5px] outline-none transition-all"
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
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg text-[13.5px] outline-none transition-all"
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
              {loading ? "Signing in…" : <>Sign in <ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="text-center text-[12.5px] mt-5" style={{ color: "#8B95A7" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium" style={{ color: "#6C63FF" }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
