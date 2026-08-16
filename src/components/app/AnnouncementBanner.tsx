"use client";

import { useState, useEffect } from "react";
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

type AnnouncementType = "INFO" | "WARNING" | "SUCCESS" | "ERROR";

type Announcement = {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  ctaText: string | null;
  ctaUrl: string | null;
  isDismissible: boolean;
};

const TYPE_STYLES: Record<AnnouncementType, { bg: string; border: string; icon: React.ElementType; iconColor: string; textColor: string }> = {
  INFO:    { bg: "rgba(108,99,255,0.08)", border: "rgba(108,99,255,0.2)",  icon: Info,          iconColor: "#6C63FF", textColor: "#8B85FF" },
  WARNING: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)",  icon: AlertTriangle, iconColor: "#F59E0B", textColor: "#FCD34D" },
  SUCCESS: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)",  icon: CheckCircle,   iconColor: "#10B981", textColor: "#34D399" },
  ERROR:   { bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",   icon: AlertCircle,   iconColor: "#EF4444", textColor: "#F87171" },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem("dismissed-announcements");
    const storedSet: Set<string> = stored ? new Set(JSON.parse(stored)) : new Set();
    setDismissed(storedSet);

    fetch("/api/public/announcements")
      .then(r => r.ok ? r.json() : { announcements: [] })
      .then(({ announcements: data }) => setAnnouncements(data ?? []))
      .catch(() => {});
  }, []);

  const dismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      sessionStorage.setItem("dismissed-announcements", JSON.stringify([...next]));
      return next;
    });
  };

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col">
      {visible.map(a => {
        const s = TYPE_STYLES[a.type] ?? TYPE_STYLES.INFO;
        const Icon = s.icon;
        return (
          <div
            key={a.id}
            className="flex items-center gap-3 px-4 py-2.5 border-b"
            style={{ background: s.bg, borderColor: s.border }}
          >
            <Icon size={14} style={{ color: s.iconColor, shrink: 0 }} className="shrink-0" />
            <span className="text-[12.5px] font-semibold mr-1" style={{ color: s.textColor }}>
              {a.title}
            </span>
            <span className="text-[12px] flex-1 truncate" style={{ color: "#8B95A7" }}>
              {a.message}
            </span>
            {a.ctaText && a.ctaUrl && (
              <Link
                href={a.ctaUrl}
                className="text-[11.5px] font-semibold shrink-0 px-2.5 py-1 rounded-lg"
                style={{ background: `${s.iconColor}20`, color: s.iconColor }}
              >
                {a.ctaText}
              </Link>
            )}
            {a.isDismissible && (
              <button onClick={() => dismiss(a.id)} className="shrink-0" title="Dismiss">
                <X size={13} style={{ color: "#8B95A7" }} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
