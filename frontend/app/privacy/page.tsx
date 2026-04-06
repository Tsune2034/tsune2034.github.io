import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | KAIROX",
  description: "KAIROX Privacy Policy — Japan Luggage Freedom",
};

export default function PrivacyPage() {
  const lastUpdated = "2026-04-05";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <a href="/narita" className="text-sm text-blue-600 hover:underline">← Back to KAIROX</a>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. About Us</h2>
            <p>
              KAIROX ("we", "us", "our") operates the luggage delivery service available at{" "}
              <a href="https://kairox.jp" className="text-blue-600 hover:underline">kairox.jp</a>.
              This Privacy Policy explains how we collect, use, and protect your personal information
              when you use our services.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              運営者: KAIROX（個人事業主） / Operator: KAIROX (Sole Proprietor), Japan
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Booking information:</strong> Name, phone number, email address, pickup location, delivery destination</li>
              <li><strong>Payment information:</strong> Processed securely via Stripe. We do not store card numbers.</li>
              <li><strong>Location data:</strong> GPS coordinates collected only during active pickup with your explicit consent</li>
              <li><strong>Usage data:</strong> Pages visited, browser type, device type (via anonymized analytics)</li>
              <li><strong>Communications:</strong> Messages sent via our chat or email support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To process and fulfill your luggage delivery booking</li>
              <li>To communicate delivery status and driver location</li>
              <li>To send booking confirmations and receipts</li>
              <li>To improve our service quality and routes</li>
              <li>To comply with legal obligations in Japan</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Data Sharing</h2>
            <p>We share your data only with:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Assigned driver:</strong> Name, pickup location, destination (for delivery purposes only)</li>
              <li><strong>Stripe:</strong> Payment processing (<a href="https://stripe.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a>)</li>
              <li><strong>Vercel:</strong> Hosting infrastructure (<a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Vercel Privacy Policy</a>)</li>
            </ul>
            <p className="mt-2">We do <strong>not</strong> sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Booking records: retained for 3 years (Japanese accounting law)</li>
              <li>GPS location data: deleted within 24 hours of delivery completion</li>
              <li>Chat logs: retained for 90 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Cookies & Analytics</h2>
            <p>
              We use Google Analytics 4 (anonymized IP) to understand how visitors use our site.
              No personally identifiable information is collected through analytics.
              You may opt out via{" "}
              <a href="https://tools.google.com/dlpage/gaoptout" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Google Analytics Opt-out
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. TikTok Integration</h2>
            <p>
              Our trend analysis tools may use the TikTok API to display publicly available content.
              We do not collect or store TikTok user data beyond what is publicly accessible.
              See{" "}
              <a href="https://www.tiktok.com/legal/page/global/privacy-policy/en" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                TikTok's Privacy Policy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Your Rights</h2>
            <p>Under Japanese Personal Information Protection Act (個人情報保護法) and GDPR (for EU residents), you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Access your personal data</li>
              <li>Request correction or deletion</li>
              <li>Withdraw consent at any time</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, contact us at:{" "}
              <a href="mailto:support@kairox.jp" className="text-blue-600 hover:underline">support@kairox.jp</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. Security</h2>
            <p>
              All data is transmitted via HTTPS. Payment data is processed by Stripe (PCI DSS compliant).
              We implement industry-standard security measures to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy. Significant changes will be notified via our website.
              Continued use of our service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">11. Contact</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
              <p><strong>KAIROX</strong></p>
              <p>Email: <a href="mailto:support@kairox.jp" className="text-blue-600 hover:underline">support@kairox.jp</a></p>
              <p>Website: <a href="https://kairox.jp" className="text-blue-600 hover:underline">https://kairox.jp</a></p>
              <p className="mt-2 text-xs text-gray-400">千葉県 成田市 / Narita, Chiba, Japan</p>
            </div>
          </section>

          {/* 日本語サマリー */}
          <section className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">プライバシーポリシー（日本語概要）</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              KAIROXは、お客様の氏名・連絡先・配送先情報を配送サービスの提供目的のみに使用します。
              決済情報はStripeが管理し、当社はカード番号を保持しません。
              GPS位置情報は配送完了後24時間以内に削除します。
              個人情報の開示・訂正・削除のご要望は support@kairox.jp までご連絡ください。
              本ポリシーは個人情報保護法に基づき運用されます。
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
