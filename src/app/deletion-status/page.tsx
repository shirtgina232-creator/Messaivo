import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getDeletionStatus } from "@/lib/data-deletion";
import { CheckCircle, Clock, AlertCircle, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Deletion Status — Messaivo",
  description: "Check the status of your Facebook data deletion request.",
};

export default async function DeletionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  type StatusRecord = {
    status: string;
    deletedContacts: number;
    createdAt: Date;
    completedAt: Date | null;
  } | null;

  let record: StatusRecord = null;
  let fetchError = false;

  if (code) {
    try {
      record = await getDeletionStatus(code);
    } catch {
      fetchError = true;
    }
  }

  const state: "no-code" | "not-found" | "error" | "completed" | "processing" | "failed" =
    !code
      ? "no-code"
      : fetchError
        ? "error"
        : !record
          ? "not-found"
          : record.status === "COMPLETED"
            ? "completed"
            : record.status === "FAILED"
              ? "failed"
              : "processing";

  const config = {
    "no-code": {
      icon: HelpCircle,
      color: "#8B95A7",
      title: "No confirmation code provided",
      body: "Please use the link provided in your data deletion confirmation email, or contact us at hello@messaivo.com.",
    },
    "not-found": {
      icon: AlertCircle,
      color: "#F59E0B",
      title: "Confirmation code not found",
      body: "This code is not recognised. It may have been entered incorrectly. Please check the link or contact hello@messaivo.com.",
    },
    error: {
      icon: AlertCircle,
      color: "#EF4444",
      title: "Unable to look up status",
      body: "A temporary error occurred. Please try again in a few moments.",
    },
    processing: {
      icon: Clock,
      color: "#6C63FF",
      title: "Deletion in progress",
      body: "Your deletion request has been received and is being processed. Please check back shortly.",
    },
    completed: {
      icon: CheckCircle,
      color: "#10B981",
      title: "Deletion completed",
      body: "All Facebook-sourced personal data associated with this request has been permanently removed from Messaivo.",
    },
    failed: {
      icon: AlertCircle,
      color: "#EF4444",
      title: "Deletion could not be completed",
      body: "An error occurred during data deletion. Please contact hello@messaivo.com so we can resolve this manually.",
    },
  } as const;

  const { icon: Icon, color, title, body } = config[state];

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-2xl mx-auto px-6">
          <div className="mb-10">
            <h1 className="text-[40px] font-semibold tracking-[-0.03em] text-[#F5F7FA] mb-3">
              Data Deletion Status
            </h1>
            <p className="text-[15px] text-[#8B95A7] leading-relaxed">
              Verify the status of your Facebook data deletion request.
            </p>
          </div>

          <div
            className="flex items-start gap-4 p-6 rounded-2xl mb-8"
            style={{
              background: `${color}08`,
              border: `1px solid ${color}20`,
            }}
          >
            <Icon
              size={22}
              style={{ color, flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <h2 className="text-[17px] font-semibold text-[#F5F7FA] mb-1.5">{title}</h2>
              <p className="text-[13.5px] text-[#8B95A7] leading-relaxed">{body}</p>
            </div>
          </div>

          {record && state === "completed" && (
            <div
              className="p-5 rounded-xl text-[13.5px] text-[#8B95A7] space-y-2"
              style={{
                background: "rgba(16,21,31,0.7)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex justify-between">
                <span>Request received</span>
                <span className="text-[#F5F7FA] font-medium">
                  {record.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              {record.completedAt && (
                <div className="flex justify-between">
                  <span>Completed</span>
                  <span className="text-[#F5F7FA] font-medium">
                    {record.completedAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
              {code && (
                <div className="flex justify-between">
                  <span>Confirmation code</span>
                  <span
                    className="font-mono text-[12px] text-[#F5F7FA]"
                    style={{ wordBreak: "break-all" }}
                  >
                    {code}
                  </span>
                </div>
              )}
            </div>
          )}

          <div
            className="mt-8 p-5 rounded-xl"
            style={{
              background: "rgba(108,99,255,0.06)",
              border: "1px solid rgba(108,99,255,0.15)",
            }}
          >
            <h3 className="text-[14.5px] font-semibold text-[#F5F7FA] mb-2">Need help?</h3>
            <p className="text-[13.5px] text-[#8B95A7]">
              Contact us at{" "}
              <a href="mailto:hello@messaivo.com" className="text-[#6C63FF] hover:underline">
                hello@messaivo.com
              </a>
              {code && (
                <> and include your confirmation code: <code className="text-[#F5F7FA] font-mono text-[12px]">{code}</code></>
              )}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
