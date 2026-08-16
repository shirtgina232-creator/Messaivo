import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Messaivo",
  description: "Messaivo Privacy Policy — how we collect, use, and protect your information.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-[20px] font-semibold text-[#F5F7FA] mb-4">{title}</h2>
      <div className="text-[14px] text-[#8B95A7] leading-[1.8] space-y-3">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-12">
            <h1 className="text-[40px] md:text-[48px] font-semibold tracking-[-0.03em] text-[#F5F7FA] mb-3">
              Privacy Policy
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
              <strong className="text-[#F5F7FA]">Note:</strong> This Privacy Policy is a working document. Certain sections are marked as placeholders where legal details need to be finalized. We recommend consulting a qualified attorney before deploying this in production.
            </p>
          </div>

          <div
            className="border-l-2 pl-6 mb-10"
            style={{ borderColor: "rgba(108,99,255,0.4)" }}
          >
            <p className="text-[15px] text-[#8B95A7] leading-relaxed italic">
              Messaivo (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </div>

          <Section title="1. Information We Collect">
            <p>We collect information you provide directly to us, including:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Account registration details (name, email address)</li>
              <li>Business information (business name, connected Facebook Page details)</li>
              <li>Payment information (processed by our payment provider — we do not store full payment details)</li>
              <li>Communications and customer data you manage through the platform</li>
            </ul>
            <p>We also collect information automatically when you use Messaivo, including usage data, device information, and logs.</p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Provide, maintain, and improve the Messaivo platform</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze usage trends</li>
            </ul>
            <p>We do not sell your personal information or your customers&apos; data to third parties.</p>
          </Section>

          <Section title="3. Facebook and Meta Platform Data">
            <p>When you connect a Facebook Page to Messaivo, you authorize us to access certain data from the Meta platform through their official APIs, as permitted by your authorization. This may include:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Messages sent to your Page via Messenger</li>
              <li>Basic profile information of users who message your Page (as permitted by Meta)</li>
              <li>Page activity data relevant to the features you&apos;ve enabled</li>
            </ul>
            <p>We handle this data in accordance with Meta&apos;s Platform Terms and applicable data policies. We do not use data obtained from Meta&apos;s platform for any purpose beyond powering the features you have explicitly enabled.</p>
          </Section>

          <Section title="4. Data Storage and Security">
            <p>We take reasonable administrative, technical, and physical measures to protect your information. [Specific storage locations, infrastructure details, and security certifications to be added as applicable.]</p>
            <p>No method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.</p>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your information for as long as your account is active or as needed to provide our services. You may request deletion of your account and associated data at any time. See the Data Deletion section or contact us at the email below.</p>
          </Section>

          <Section title="6. Third-Party Services">
            <p>Messaivo may use third-party services for analytics, payment processing, and infrastructure. These services have their own privacy policies. [Specific third-party service list to be finalized.]</p>
          </Section>

          <Section title="7. Your Rights">
            <p>Depending on your location, you may have rights including:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Access to your personal data</li>
              <li>Correction of inaccurate data</li>
              <li>Deletion of your data</li>
              <li>Objection to or restriction of processing</li>
              <li>Data portability</li>
            </ul>
            <p>To exercise these rights, contact us at hello@messaivo.com.</p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>Messaivo is not directed to individuals under the age of 16. We do not knowingly collect personal information from children.</p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our platform or by email. Continued use of Messaivo after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="10. Contact">
            <p>If you have questions about this Privacy Policy, please contact us at:</p>
            <p>
              <a href="mailto:hello@messaivo.com" className="text-[#6C63FF] hover:underline">
                hello@messaivo.com
              </a>
            </p>
            <p>[Company legal name, registered address — to be added.]</p>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  );
}
