"use client";

import { useState } from "react";
import { BookOpen, PenTool } from "lucide-react";
import TemplatesManager from "./TemplatesManager";
import LibraryManager from "./LibraryManager";

type Tab = "library" | "custom";

export default function AdminTemplatesTabs({ initialTemplates }: { initialTemplates: unknown[] }) {
  const [tab, setTab] = useState<Tab>("library");

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(
          [
            { id: "library", label: "Library", icon: BookOpen, hint: "Meta pre-approved · instant" },
            { id: "custom", label: "Custom", icon: PenTool, hint: "Super Admin only · Meta review" },
          ] as const
        ).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
            style={{
              background: tab === t.id ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.03)",
              color: tab === t.id ? "#8B85FF" : "#8B95A7",
              border: `1px solid ${tab === t.id ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}`,
            }}>
            <t.icon size={14} />
            {t.label}
            <span className="text-[10.5px] font-normal opacity-70 hidden sm:inline">{t.hint}</span>
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <LibraryManager />
      ) : (
        <TemplatesManager initialTemplates={initialTemplates as never} />
      )}
    </div>
  );
}
