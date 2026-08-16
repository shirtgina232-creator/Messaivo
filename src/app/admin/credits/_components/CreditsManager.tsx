"use client";

import { useState } from "react";
import { Infinity, Plus, Minus, Hash } from "lucide-react";

interface LedgerRow {
  id: string;
  name: string;
  email: string;
  customerName: string | null;
  monthlyAllocation: number;
  bonusCredits: number;
  usedThisPeriod: number;
  unlimitedCredits: boolean;
}

interface Props {
  initialRows: LedgerRow[];
}

type ActionMode = "add" | "subtract" | "set" | null;

interface RowState {
  monthlyAllocation: number;
  bonusCredits: number;
  usedThisPeriod: number;
  unlimitedCredits: boolean;
  loading: boolean;
  msg: string;
  msgOk: boolean;
  actionMode: ActionMode;
  inputValue: string;
}

export default function CreditsManager({ initialRows }: Props) {
  const [rows, setRows] = useState<LedgerRow[]>(initialRows);
  const [rowState, setRowState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      initialRows.map((r) => [
        r.id,
        {
          monthlyAllocation: r.monthlyAllocation,
          bonusCredits: r.bonusCredits,
          usedThisPeriod: r.usedThisPeriod,
          unlimitedCredits: r.unlimitedCredits,
          loading: false,
          msg: "",
          msgOk: false,
          actionMode: null,
          inputValue: "",
        },
      ])
    )
  );

  const patchRow = (id: string, patch: Partial<RowState>) =>
    setRowState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const flashMsg = (id: string, msg: string, ok: boolean) => {
    patchRow(id, { msg, msgOk: ok });
    setTimeout(() => patchRow(id, { msg: "" }), 2500);
  };

  const callApi = async (workspaceId: string, body: Record<string, unknown>) => {
    patchRow(workspaceId, { loading: true, msg: "" });
    try {
      const res = await fetch(`/api/admin/credits/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ledger?: {
          monthlyAllocation: number;
          bonusCredits: number;
          usedThisPeriod: number;
          unlimitedCredits: boolean;
        };
        error?: string;
      };
      if (!res.ok) {
        flashMsg(workspaceId, data.error ?? "Error", false);
        return;
      }
      if (data.ledger) {
        patchRow(workspaceId, {
          monthlyAllocation: data.ledger.monthlyAllocation,
          bonusCredits: data.ledger.bonusCredits,
          usedThisPeriod: data.ledger.usedThisPeriod,
          unlimitedCredits: data.ledger.unlimitedCredits,
          actionMode: null,
          inputValue: "",
        });
      }
      flashMsg(workspaceId, "Saved", true);
    } finally {
      patchRow(workspaceId, { loading: false });
    }
  };

  const handleAction = (workspaceId: string) => {
    const s = rowState[workspaceId];
    const n = parseInt(s.inputValue, 10);
    if (!s.actionMode) return;

    if (s.actionMode === "set") {
      if (!Number.isInteger(n) || n < 0) {
        flashMsg(workspaceId, "Enter a non-negative number", false);
        return;
      }
      callApi(workspaceId, { action: "set", amount: n });
    } else {
      if (!n || n <= 0) {
        flashMsg(workspaceId, "Enter a positive number", false);
        return;
      }
      callApi(workspaceId, { action: s.actionMode === "add" ? "add" : "remove", amount: n });
    }
  };

  const toggleActionMode = (workspaceId: string, mode: ActionMode) => {
    const s = rowState[workspaceId];
    patchRow(workspaceId, {
      actionMode: s.actionMode === mode ? null : mode,
      inputValue: "",
      msg: "",
    });
  };

  const toggleUnlimited = (workspaceId: string) => {
    const s = rowState[workspaceId];
    callApi(workspaceId, { action: "unlimited", value: !s.unlimitedCredits });
  };

  if (rows.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-[13px]" style={{ color: "#8B95A7" }}>
        No workspaces yet.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        className="grid gap-3 px-5 py-3 border-b"
        style={{
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 220px",
          borderColor: "rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        {["Workspace / Owner", "Monthly", "Bonus", "Used", "Available", "Mode", "Actions"].map((h) => (
          <span
            key={h}
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "#8B95A7" }}
          >
            {h}
          </span>
        ))}
      </div>

      {rows.map((row) => {
        const s = rowState[row.id];
        const available = s.monthlyAllocation + s.bonusCredits - s.usedThisPeriod;

        return (
          <div
            key={row.id}
            className="border-b last:border-0"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <div
              className="grid gap-3 px-5 py-4 items-center"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 220px" }}
            >
              {/* Workspace / Owner */}
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate" style={{ color: "#F5F7FA" }}>
                  {row.name}
                </div>
                <div className="text-[11px] truncate" style={{ color: "#8B95A7" }}>
                  {row.customerName ? `${row.customerName} · ` : ""}
                  {row.email}
                </div>
              </div>

              {/* Monthly */}
              <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>
                {s.monthlyAllocation.toLocaleString()}
              </div>

              {/* Bonus */}
              <div className="text-[12.5px]" style={{ color: "#8B95A7" }}>
                {s.bonusCredits.toLocaleString()}
              </div>

              {/* Used */}
              <div
                className="text-[12.5px]"
                style={{
                  color:
                    s.usedThisPeriod > s.monthlyAllocation * 0.8 ? "#EF4444" : "#8B95A7",
                }}
              >
                {s.usedThisPeriod.toLocaleString()}
              </div>

              {/* Available */}
              <div
                className="text-[12.5px] font-semibold"
                style={{
                  color: s.unlimitedCredits
                    ? "#10B981"
                    : available < 0
                    ? "#EF4444"
                    : "#F5F7FA",
                }}
              >
                {s.unlimitedCredits ? "∞" : available.toLocaleString()}
              </div>

              {/* Mode badge */}
              <div>
                <button
                  onClick={() => toggleUnlimited(row.id)}
                  disabled={s.loading}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: s.unlimitedCredits
                      ? "rgba(16,185,129,0.12)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${
                      s.unlimitedCredits
                        ? "rgba(16,185,129,0.3)"
                        : "rgba(255,255,255,0.08)"
                    }`,
                    color: s.unlimitedCredits ? "#10B981" : "#8B95A7",
                  }}
                  title={s.unlimitedCredits ? "Disable unlimited" : "Enable unlimited"}
                >
                  <Infinity size={11} />
                  {s.unlimitedCredits ? "Unlimited" : "Limited"}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Add */}
                <button
                  onClick={() => toggleActionMode(row.id, "add")}
                  disabled={s.loading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                  style={{
                    background:
                      s.actionMode === "add"
                        ? "rgba(16,185,129,0.2)"
                        : "rgba(16,185,129,0.08)",
                    border: `1px solid ${
                      s.actionMode === "add"
                        ? "rgba(16,185,129,0.4)"
                        : "transparent"
                    }`,
                    color: "#10B981",
                  }}
                  title="Add bonus credits"
                >
                  <Plus size={13} />
                </button>

                {/* Subtract */}
                <button
                  onClick={() => toggleActionMode(row.id, "subtract")}
                  disabled={s.loading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                  style={{
                    background:
                      s.actionMode === "subtract"
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(239,68,68,0.08)",
                    border: `1px solid ${
                      s.actionMode === "subtract"
                        ? "rgba(239,68,68,0.4)"
                        : "transparent"
                    }`,
                    color: "#EF4444",
                  }}
                  title="Subtract bonus credits"
                >
                  <Minus size={13} />
                </button>

                {/* Set exact */}
                <button
                  onClick={() => toggleActionMode(row.id, "set")}
                  disabled={s.loading}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                  style={{
                    background:
                      s.actionMode === "set"
                        ? "rgba(108,99,255,0.2)"
                        : "rgba(108,99,255,0.08)",
                    border: `1px solid ${
                      s.actionMode === "set"
                        ? "rgba(108,99,255,0.4)"
                        : "transparent"
                    }`,
                    color: "#6C63FF",
                  }}
                  title="Set exact monthly allocation"
                >
                  <Hash size={13} />
                </button>

                {/* Input + Apply (shown when actionMode is active) */}
                {s.actionMode && (
                  <>
                    <input
                      type="number"
                      min="0"
                      value={s.inputValue}
                      onChange={(e) => patchRow(row.id, { inputValue: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAction(row.id);
                        if (e.key === "Escape") patchRow(row.id, { actionMode: null, inputValue: "" });
                      }}
                      placeholder={
                        s.actionMode === "set" ? "monthly" : "amount"
                      }
                      autoFocus
                      className="w-20 px-2 py-1 rounded-lg text-[11.5px] text-center outline-none"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#F5F7FA",
                      }}
                    />
                    <button
                      onClick={() => handleAction(row.id)}
                      disabled={s.loading || !s.inputValue}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                      style={{
                        background:
                          s.actionMode === "set"
                            ? "rgba(108,99,255,0.15)"
                            : s.actionMode === "add"
                            ? "rgba(16,185,129,0.15)"
                            : "rgba(239,68,68,0.15)",
                        color:
                          s.actionMode === "set"
                            ? "#6C63FF"
                            : s.actionMode === "add"
                            ? "#10B981"
                            : "#EF4444",
                        opacity: s.loading || !s.inputValue ? 0.5 : 1,
                      }}
                    >
                      {s.loading ? "…" : "Apply"}
                    </button>
                  </>
                )}

                {/* Feedback message */}
                {s.msg && (
                  <span
                    className="text-[11px]"
                    style={{ color: s.msgOk ? "#10B981" : "#EF4444" }}
                  >
                    {s.msg}
                  </span>
                )}
              </div>
            </div>

            {/* Action label */}
            {s.actionMode && (
              <div className="px-5 pb-2 text-[11px]" style={{ color: "#8B95A7" }}>
                {s.actionMode === "add" && "Add to bonus credits"}
                {s.actionMode === "subtract" && "Subtract from bonus credits (floor 0)"}
                {s.actionMode === "set" && "Set monthly allocation to exact value"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
