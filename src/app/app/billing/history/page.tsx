"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Search, Filter, Check, Clock, X as XIcon, CreditCard, Zap } from "lucide-react";

type InvoiceStatus = "Paid" | "Pending" | "Failed";
type PaymentMethodType = "Visa" | "PayPal" | "Apple Pay" | "Google Pay";

type Invoice = {
  id: string;
  date: string;
  description: string;
  plan: string;
  credits: number;
  amount: number;
  status: InvoiceStatus;
  method: PaymentMethodType;
  last4?: string;
};

const DEMO_INVOICES: Invoice[] = [
  { id: "INV-2026-0809", date: "Aug 9, 2026",  description: "Growth Plan — Monthly",   plan: "Growth",     credits: 800_000, amount: 69.00,  status: "Paid",    method: "Visa",      last4: "4242" },
  { id: "INV-2026-0709", date: "Jul 9, 2026",  description: "Growth Plan — Monthly",   plan: "Growth",     credits: 800_000, amount: 69.00,  status: "Paid",    method: "Visa",      last4: "4242" },
  { id: "INV-2026-0709B",date: "Jul 9, 2026",  description: "500,000 Credit Top-Up",   plan: "—",          credits: 500_000, amount: 89.00,  status: "Paid",    method: "PayPal"              },
  { id: "INV-2026-0609", date: "Jun 9, 2026",  description: "Growth Plan — Monthly",   plan: "Growth",     credits: 800_000, amount: 69.00,  status: "Paid",    method: "Visa",      last4: "4242" },
  { id: "INV-2026-0509", date: "May 9, 2026",  description: "Starter Plan — Monthly",  plan: "Starter",    credits: 300_000, amount: 29.00,  status: "Paid",    method: "Visa",      last4: "4242" },
  { id: "INV-2026-0509B",date: "May 9, 2026",  description: "Growth Plan Upgrade",     plan: "Growth",     credits: 800_000, amount: 40.00,  status: "Paid",    method: "Visa",      last4: "4242" },
  { id: "INV-2026-0409", date: "Apr 9, 2026",  description: "Starter Plan — Monthly",  plan: "Starter",    credits: 300_000, amount: 29.00,  status: "Paid",    method: "Visa",      last4: "4242" },
  { id: "INV-2026-0408", date: "Apr 8, 2026",  description: "100,000 Credit Top-Up",   plan: "—",          credits: 100_000, amount: 24.00,  status: "Failed",  method: "Visa",      last4: "1234" },
  { id: "INV-2026-0309", date: "Mar 9, 2026",  description: "Starter Plan — Monthly",  plan: "Starter",    credits: 300_000, amount: 29.00,  status: "Paid",    method: "Apple Pay"           },
  { id: "INV-2026-0228", date: "Feb 28, 2026", description: "Starter Plan — Monthly",  plan: "Starter",    credits: 300_000, amount: 29.00,  status: "Paid",    method: "Apple Pay"           },
];

const STATUS_CONFIG: Record<InvoiceStatus, { bg: string; color: string; icon: React.ReactNode }> = {
  Paid:    { bg: "rgba(16,185,129,0.1)", color: "#10B981", icon: <Check size={10} strokeWidth={3} /> },
  Pending: { bg: "rgba(245,158,11,0.1)", color: "#F59E0B", icon: <Clock size={10} /> },
  Failed:  { bg: "rgba(239,68,68,0.1)",  color: "#EF4444", icon: <XIcon size={10} /> },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { bg, color, icon } = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>
      {icon} {status}
    </span>
  );
}

function PaymentMethodCell({ method, last4 }: { method: PaymentMethodType; last4?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#8B95A7" }}>
      <CreditCard size={12} />
      {method}{last4 ? ` ···· ${last4}` : ""}
    </div>
  );
}

export default function BillingHistoryPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "All">("All");

  const filtered = DEMO_INVOICES.filter(inv => {
    const matchSearch = !search || inv.description.toLowerCase().includes(search.toLowerCase()) || inv.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPaid = DEMO_INVOICES.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <Link
            href="/app/billing"
            className="flex items-center gap-1.5 text-[12.5px] mb-3 transition-colors"
            style={{ color: "#8B95A7" }}
          >
            <ArrowLeft size={13} /> Back to Billing
          </Link>
          <h1 className="text-[22px] font-semibold mb-1" style={{ color: "#F5F7FA" }}>Billing History</h1>
          <p className="text-[13px]" style={{ color: "#8B95A7" }}>All your invoices and payment records.</p>
        </div>

        <div className="p-4 rounded-2xl text-right" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-[22px] font-bold" style={{ color: "#F5F7FA" }}>${totalPaid.toFixed(2)}</div>
          <div className="text-[11.5px]" style={{ color: "#8B95A7" }}>Total spent (all time)</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total invoices",  value: DEMO_INVOICES.length.toString(),                           color: "#6366F1" },
          { label: "Paid",            value: DEMO_INVOICES.filter(i => i.status === "Paid").length.toString(),    color: "#10B981" },
          { label: "Failed",          value: DEMO_INVOICES.filter(i => i.status === "Failed").length.toString(),  color: "#EF4444" },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-xl" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-[18px] font-bold mb-0.5" style={{ color }}>{value}</div>
            <div className="text-[12px]" style={{ color: "#8B95A7" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8B95A7" }} />
          <input
            type="text"
            placeholder="Search invoices…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-[13px] outline-none"
            style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)", color: "#F5F7FA" }}
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {(["All", "Paid", "Pending", "Failed"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: statusFilter === s ? "#6366F1" : "transparent",
                color: statusFilter === s ? "#fff" : "#8B95A7",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#101722", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Table header */}
        <div
          className="hidden md:grid gap-4 px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider border-b"
          style={{ gridTemplateColumns: "1fr 1.8fr 0.8fr 1fr 0.8fr 0.8fr auto", borderColor: "rgba(255,255,255,0.06)", color: "#8B95A7", background: "rgba(255,255,255,0.02)" }}
        >
          <span>Date</span>
          <span>Description</span>
          <span>Plan</span>
          <span>Credits</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Invoice</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Filter size={24} style={{ color: "#8B95A7", opacity: 0.4 }} />
            <span className="text-[13px]" style={{ color: "#8B95A7" }}>No invoices match your filters</span>
          </div>
        ) : (
          filtered.map((inv, i) => (
            <div
              key={inv.id}
              className="flex md:grid items-center gap-3 md:gap-4 px-5 py-4 border-b flex-wrap hover:bg-white/[0.015] transition-colors"
              style={{ gridTemplateColumns: "1fr 1.8fr 0.8fr 1fr 0.8fr 0.8fr auto", borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div>
                <div className="text-[12.5px] font-medium" style={{ color: "#F5F7FA" }}>{inv.date}</div>
                <div className="text-[10.5px] md:hidden" style={{ color: "#8B95A7" }}>{inv.id}</div>
              </div>
              <div>
                <div className="text-[12.5px] font-medium" style={{ color: "#F5F7FA" }}>{inv.description}</div>
                <div className="text-[11px] hidden md:block" style={{ color: "#8B95A7" }}>{inv.id}</div>
                <div className="md:hidden mt-0.5">
                  <PaymentMethodCell method={inv.method} last4={inv.last4} />
                </div>
              </div>
              <div className="hidden md:block text-[12px]" style={{ color: "#8B95A7" }}>{inv.plan}</div>
              <div className="hidden md:flex items-center gap-1.5 text-[12px]" style={{ color: "#8B95A7" }}>
                <Zap size={11} style={{ color: "#6366F1" }} />
                {inv.credits.toLocaleString()}
              </div>
              <div className="text-[13px] font-semibold" style={{ color: "#F5F7FA" }}>${inv.amount.toFixed(2)}</div>
              <div className="hidden md:block">
                <StatusBadge status={inv.status} />
              </div>
              <div className="flex items-center gap-2 ml-auto md:ml-0">
                <div className="md:hidden"><StatusBadge status={inv.status} /></div>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-all"
                  style={{ background: inv.status === "Paid" ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.04)", color: inv.status === "Paid" ? "#6366F1" : "#8B95A7", border: "1px solid rgba(255,255,255,0.07)" }}
                  onClick={() => {/* Stripe invoice download will connect here */}}
                >
                  <Download size={11} /> Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-center text-[11.5px] mt-5" style={{ color: "#8B95A7", opacity: 0.5 }}>
        Demo data only — invoice download will be enabled when Stripe is connected.
      </p>
    </div>
  );
}
