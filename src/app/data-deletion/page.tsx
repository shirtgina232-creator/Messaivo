import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Trash2, Mail, Clock, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Deletion — Messaivo",
  description: "How to request deletion of your data from Messaivo.",
};

export default function DataDeletionPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-12">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium mb-6"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.15)",
                color: "#EF4444",
              }}
            >
              <Trash2 size={11} />
              Data Deletion
            </div>
            <h1 className="text-[40px] md:text-[48px] font-semibold tracking-[-0.03em] text-[#F5F7FA] mb-3">
              Data Deletion Request
            </h1>
            <p className="text-[15px] text-[#8B95A7] leading-relaxed">
              You have the right to request deletion of your personal data and any data associated with your Messaivo account.
            </p>
          </div>

          {/* Meta requirement note */}
          <div
            className="flex items-start gap-3 p-4 rounded-xl mb-8"
            style={{
              background: "rgba(108,99,255,0.06)",
              border: "1px solid rgba(108,99,255,0.15)",
            }}
          >
            <AlertCircle size={16} style={{ color: "#6C63FF", flexShrink: 0, marginTop: 2 }} />
            <p className="text-[13px] text-[#8B95A7] leading-relaxed">
              <strong className="text-[#F5F7FA]">Facebook / Meta users:</strong> If you used Facebook Login or connected a Facebook Page to Messaivo, Meta requires us to provide a way for you to request deletion of data received through their platform. This page fulfills that requirement.
            </p>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-4 mb-12">
            <h2 className="text-[20px] font-semibold text-[#F5F7FA]">How to Request Data Deletion</h2>

            {[
              {
                icon: Mail,
                step: "1",
                title: "Send a deletion request",
                body: "Email us at hello@messaivo.com with the subject line \"Data Deletion Request\". Include the email address associated with your account.",
                color: "#6C63FF",
              },
              {
                icon: Clock,
                step: "2",
                title: "We'll confirm within 5 business days",
                body: "We'll confirm receipt of your request and provide a timeline for deletion. In most cases, deletion will be completed within 30 days.",
                color: "#22D3EE",
              },
              {
                icon: Trash2,
                step: "3",
                title: "Data is permanently deleted",
                body: "Your account data, conversation data, and customer data managed through your account will be permanently removed from our systems, except where retention is required by law.",
                color: "#10B981",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-5 rounded-xl"
                style={{
                  background: "rgba(16,21,31,0.7)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}12`, border: `1px solid ${item.color}20` }}
                >
                  <item.icon size={16} style={{ color: item.color }} />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8B95A7]/50 mb-1">
                    Step {item.step}
                  </div>
                  <h3 className="text-[14.5px] font-semibold text-[#F5F7FA] mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-[13.5px] text-[#8B95A7] leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* What's deleted */}
          <div className="mb-10">
            <h2 className="text-[20px] font-semibold text-[#F5F7FA] mb-4">What gets deleted</h2>
            <div
              className="p-5 rounded-xl text-[13.5px] text-[#8B95A7] leading-[1.8] space-y-2"
              style={{ background: "rgba(16,21,31,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <ul className="list-disc list-inside space-y-1.5 ml-1">
                <li>Your account and profile information</li>
                <li>Connected Page authorizations</li>
                <li>Conversation history stored in Messaivo</li>
                <li>Audience and customer records</li>
                <li>Message templates and broadcast history</li>
                <li>Workspace settings and team configurations</li>
              </ul>
            </div>
          </div>

          {/* What may be retained */}
          <div className="mb-10">
            <h2 className="text-[20px] font-semibold text-[#F5F7FA] mb-4">What may be retained</h2>
            <div
              className="p-5 rounded-xl text-[13.5px] text-[#8B95A7] leading-[1.8]"
              style={{ background: "rgba(16,21,31,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p>Certain data may be retained where required by applicable law, such as transaction records for tax or accounting purposes. We retain the minimum necessary for the legally required period.</p>
            </div>
          </div>

          {/* Contact */}
          <div
            className="p-5 rounded-xl"
            style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)" }}
          >
            <h3 className="text-[14.5px] font-semibold text-[#F5F7FA] mb-2">Contact us</h3>
            <p className="text-[13.5px] text-[#8B95A7]">
              For deletion requests or privacy questions:{" "}
              <a href="mailto:hello@messaivo.com" className="text-[#6C63FF] hover:underline">
                hello@messaivo.com
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
