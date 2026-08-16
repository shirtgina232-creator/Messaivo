import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact — Messaivo",
  description: "Get in touch with the Messaivo team.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[13px] font-semibold uppercase tracking-widest text-[#8B95A7]/50 mb-4">
              Contact
            </p>
            <h1 className="text-[44px] md:text-[52px] font-semibold tracking-[-0.03em] leading-tight text-[#F5F7FA] mb-4">
              Get in touch.
            </h1>
            <p className="text-[16px] text-[#8B95A7] leading-relaxed">
              Have a question, feature request, or need help? We&apos;re here.
            </p>
          </div>

          <div className="grid gap-4 mb-10">
            <div
              className="flex items-start gap-4 p-5 rounded-xl"
              style={{ background: "rgba(16,21,31,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(108,99,255,0.1)" }}>
                <Mail size={17} style={{ color: "#6C63FF" }} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#F5F7FA] mb-1">Email us</h3>
                <p className="text-[13px] text-[#8B95A7] mb-2">For support, billing, or general inquiries.</p>
                <a href="mailto:hello@messaivo.com" className="text-[13.5px] font-medium text-[#6C63FF] hover:underline">
                  hello@messaivo.com
                </a>
              </div>
            </div>
            <div
              className="flex items-start gap-4 p-5 rounded-xl"
              style={{ background: "rgba(16,21,31,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(34,211,238,0.1)" }}>
                <MessageSquare size={17} style={{ color: "#22D3EE" }} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#F5F7FA] mb-1">Help Center</h3>
                <p className="text-[13px] text-[#8B95A7]">Browse guides and documentation to get started quickly.</p>
              </div>
            </div>
          </div>

          <p className="text-center text-[12.5px] text-[#8B95A7]/50">
            We aim to respond within 1 business day.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
