"use client";

import { useState } from "react";
import { Infinity, Plus, Minus } from "lucide-react";

interface Props {
  workspaceId: string;
  initialUnlimited: boolean;
  initialBonus: number;
}

export default function CreditActions({ workspaceId, initialUnlimited, initialBonus }: Props) {
  const [unlimited, setUnlimited] = useState(initialUnlimited);
  const [bonus, setBonus] = useState(initialBonus);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const call = async (body: Record<string, unknown>) => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/credits/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ledger?: { bonusCredits: number; unlimitedCredits: boolean }; error?: string };
      if (!res.ok) { setMsg(data.error ?? "Error"); return; }
      if (data.ledger) {
        setBonus(data.ledger.bonusCredits);
        setUnlimited(data.ledger.unlimitedCredits);
      }
      setMsg("Saved");
      setTimeout(() => setMsg(""), 2000);
    } finally {
      setLoading(false);
    }
  };

  const addCredits = () => {
    const n = parseInt(amount, 10);
    if (!n || n <= 0) { setMsg("Enter a positive number"); return; }
    call({ action: "add", amount: n });
    setAmount("");
  };

  const removeCredits = () => {
    const n = parseInt(amount, 10);
    if (!n || n <= 0) { setMsg("Enter a positive number"); return; }
    call({ action: "remove", amount: n });
    setAmount("");
  };

  const toggleUnlimited = () => call({ action: "unlimited", value: !unlimited });

  return (
    <div className="flex flex-col gap-2">
      {/* Unlimited toggle */}
      <button
        onClick={toggleUnlimited}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-all"
        style={{
          background: unlimited ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${unlimited ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)"}`,
          color: unlimited ? "#10B981" : "#8B95A7",
        }}
        title={unlimited ? "Disable unlimited" : "Enable unlimited"}
      >
        <Infinity size={12} />
        {unlimited ? "Unlimited ON" : "Unlimited OFF"}
      </button>

      {/* Add / remove */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="w-20 px-2 py-1 rounded-lg text-[12px] text-center outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
        />
        <button
          onClick={addCredits}
          disabled={loading}
          className="w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}
          title="Add credits"
        >
          <Plus size={13} />
        </button>
        <button
          onClick={removeCredits}
          disabled={loading}
          className="w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}
          title="Remove credits"
        >
          <Minus size={13} />
        </button>
      </div>
      {msg && <span className="text-[11px]" style={{ color: msg === "Saved" ? "#10B981" : "#EF4444" }}>{msg}</span>}
      <span className="text-[10.5px]" style={{ color: "#8B95A7" }}>Bonus: {bonus.toLocaleString()}</span>
    </div>
  );
}
