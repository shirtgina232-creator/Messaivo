import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import ProblemSection from "@/components/ProblemSection";
import ProductFlow from "@/components/ProductFlow";
import FeaturesSection from "@/components/FeaturesSection";
import UseCases from "@/components/UseCases";
import ProductDemo from "@/components/ProductDemo";
import TrustSection from "@/components/TrustSection";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: { absolute: "Messaivo — Facebook Messenger CRM for Business" },
  description:
    "Manage Facebook Messenger conversations, organize your audience, send permitted broadcasts, and collaborate as a team — from one intelligent workspace. Built for businesses using Facebook Pages.",
  alternates: { canonical: "https://messaivo.com" },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <ProblemSection />
        <ProductFlow />
        <FeaturesSection />
        <UseCases />
        <ProductDemo />
        <TrustSection />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
