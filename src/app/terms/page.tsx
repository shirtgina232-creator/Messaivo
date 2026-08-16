import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — Messaivo",
  description: "Messaivo Terms of Service.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-[20px] font-semibold text-[#F5F7FA] mb-4">{title}</h2>
      <div className="text-[14px] text-[#8B95A7] leading-[1.8] space-y-3">{children}</div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-12">
            <h1 className="text-[40px] md:text-[48px] font-semibold tracking-[-0.03em] text-[#F5F7FA] mb-3">
              Terms of Service
            </h1>
            <p className="text-[13.5px] text-[#8B95A7]">
              Last updated: August 2025
            </p>
          </div>

          <div
            className="p-4 rounded-xl mb-10"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
          >
            <p className="text-[13px] text-[#8B95A7]">
              <strong className="text-[#F5F7FA]">Note:</strong> These Terms of Service are a working document. Certain sections are marked as placeholders and should be finalized with the assistance of a qualified attorney before deployment.
            </p>
          </div>

          <div
            className="border-l-2 pl-6 mb-10"
            style={{ borderColor: "rgba(108,99,255,0.4)" }}
          >
            <p className="text-[15px] text-[#8B95A7] leading-relaxed italic">
              Please read these Terms of Service carefully before using Messaivo. By accessing or using our platform, you agree to be bound by these terms.
            </p>
          </div>

          <Section title="1. Acceptance of Terms">
            <p>By creating an account or using the Messaivo platform, you agree to these Terms of Service and our Privacy Policy. If you do not agree, you may not use Messaivo.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>Messaivo is a customer messaging platform that enables businesses to connect Facebook Pages, manage Messenger conversations, organize customer audiences, create message templates, and send permitted broadcasts. We reserve the right to modify, suspend, or discontinue any feature at any time.</p>
          </Section>

          <Section title="3. Account Registration">
            <p>You must provide accurate information when creating your account. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.</p>
          </Section>

          <Section title="4. Use of the Platform">
            <p>You agree to use Messaivo only for lawful purposes and in compliance with:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All applicable laws and regulations</li>
              <li>Meta&apos;s Platform Terms and Policies</li>
              <li>Facebook&apos;s Messenger Platform policies</li>
              <li>These Terms of Service</li>
            </ul>
            <p>You may not use Messaivo to send spam, harass users, or engage in any deceptive or abusive messaging practices.</p>
          </Section>

          <Section title="5. Messaging and Broadcasts">
            <p>Messaivo provides tools for sending messages through the Facebook Messenger platform. Your use of these tools is subject to Meta&apos;s Platform Policies. You are solely responsible for ensuring that messages sent through your account comply with applicable policies, including eligibility requirements for broadcasts.</p>
            <p>Messaivo does not guarantee message deliverability. Platform policies, changes by Meta, or customer eligibility status may affect whether messages are delivered.</p>
          </Section>

          <Section title="6. Payment and Billing">
            <p>Access to paid features requires a valid subscription. Subscriptions are billed in advance on a monthly or annual basis. [Payment provider and specific billing terms to be added.] You may cancel your subscription at any time. Refund policy: [to be defined].</p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>Messaivo and its original content, features, and functionality are owned by [Company Legal Name] and are protected by applicable intellectual property laws. You retain ownership of content you input into the platform, including messages and customer data.</p>
          </Section>

          <Section title="8. Data and Privacy">
            <p>Your use of Messaivo is also governed by our Privacy Policy. By using Messaivo, you consent to the collection and use of information as described therein.</p>
          </Section>

          <Section title="9. Third-Party Services">
            <p>Messaivo integrates with third-party services (including Meta/Facebook). We are not responsible for the availability, content, or practices of third-party services. Your use of third-party services is at your own risk.</p>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <p>Messaivo is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. We do not warrant that the service will be uninterrupted, error-free, or completely secure.</p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>[Limitation of liability clause to be finalized by legal counsel, appropriate to the jurisdiction.]</p>
          </Section>

          <Section title="12. Termination">
            <p>We may suspend or terminate your access to Messaivo at any time for violations of these Terms or for any other reason at our discretion. You may also terminate your account at any time.</p>
          </Section>

          <Section title="13. Changes to Terms">
            <p>We may update these Terms from time to time. We will notify you of material changes. Continued use of Messaivo after changes constitutes acceptance.</p>
          </Section>

          <Section title="14. Governing Law">
            <p>[Governing law and jurisdiction to be determined and added.]</p>
          </Section>

          <Section title="15. Contact">
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:hello@messaivo.com" className="text-[#6C63FF] hover:underline">
                hello@messaivo.com
              </a>.
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  );
}
