"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";

export default function BillingHistoryPage() {
  return (
    <div className="p-6 max-w-[1000px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/billing" className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#8B95A7" }}>
          <ArrowLeft size={14} />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold" style={{ color: "#F5F7FA" }}>Billing History</h1>
          <p className="text-[12.5px]" style={{ color: "#8B95A7" }}>Your invoices and payment history</p>
        </div>
      </div>

      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <CreditCard size={36} style={{ color: "#8B95A7", opacity: 0.25 }} />
        <div className="text-[15px] font-semibold" style={{ color: "#F5F7FA" }}>No billing history yet</div>
        <div className="text-[13px] text-center max-w-xs" style={{ color: "#8B95A7" }}>
          Your invoices and payment receipts will appear here once you subscribe to a plan.
        </div>
        <Link
          href="/app/billing"
          className="mt-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
          style={{ background: "#6C63FF" }}
        >
          View Plans
        </Link>
      </div>
    </div>
  );
}
