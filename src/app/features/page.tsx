import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import FeaturesSection from "@/components/FeaturesSection";
import ProductDemo from "@/components/ProductDemo";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Features — Messaivo",
  description:
    "Explore all the tools Messaivo gives you to manage customer conversations, organize audiences, and grow your business.",
};

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32">
        <div className="max-w-4xl mx-auto px-6 text-center mb-4">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#8B95A7]/50 mb-4">
            Features
          </p>
          <h1 className="text-[44px] md:text-[60px] font-semibold tracking-[-0.03em] leading-tight text-[#F5F7FA] mb-4">
            Built for how businesses actually work.
          </h1>
          <p className="text-[17px] text-[#8B95A7] leading-relaxed max-w-xl mx-auto">
            Every feature in Messaivo is designed around one goal: making it easier to have great customer conversations.
          </p>
        </div>
        <FeaturesSection />
        <ProductDemo />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
