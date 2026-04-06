import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | KAIROX",
  description: "KAIROX Terms of Service — Japan Luggage Freedom",
};

export default function TermsPage() {
  const lastUpdated = "2026-04-05";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <a href="/narita" className="text-sm text-blue-600 hover:underline">← Back to KAIROX</a>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Terms of Service</h1>
          <p className="text-sm text-gray-500 mt-1">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Service Overview</h2>
            <p>
              KAIROX (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides door-to-door luggage delivery services
              for travelers in Japan, available at{" "}
              <a href="https://kairox.jp" className="text-blue-600 hover:underline">kairox.jp</a>.
              By using our services, you agree to these Terms of Service.
            </p>
            <p className="mt-2 text-xs text-gray-400">
              運営者: KAIROX（個人事業主） / Operator: KAIROX (Sole Proprietor), Japan
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Booking & Payment</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Bookings are confirmed upon successful payment via Stripe</li>
              <li>Prices are shown in Japanese Yen (JPY) and are inclusive of all fees</li>
              <li>Cancellations made more than 24 hours before pickup are fully refunded</li>
              <li>Cancellations within 24 hours of pickup may incur a cancellation fee</li>
              <li>We accept major credit/debit cards processed securely by Stripe</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Luggage & Liability</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maximum luggage size: 160cm total (length + width + height)</li>
              <li>Maximum weight per piece: 30kg</li>
              <li>Prohibited items: liquids over 100ml, fragile valuables, perishables, hazardous materials</li>
              <li>We are not responsible for items prohibited by Japanese customs regulations</li>
              <li>Liability for lost or damaged luggage is limited to ¥10,000 per piece unless additional insurance is purchased</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Delivery Service</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Pickup and delivery times are estimates and may vary due to traffic or weather</li>
              <li>Delivery to hotels and accommodations requires a valid booking confirmation</li>
              <li>We will notify you via the contact information provided at booking</li>
              <li>In cases of severe weather or force majeure, delivery may be rescheduled</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. User Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate pickup location and contact information</li>
              <li>You must be present or designate a representative at the pickup location</li>
              <li>You agree not to ship prohibited or illegal items</li>
              <li>You are responsible for proper packaging of your luggage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. TikTok Integration</h2>
            <p>
              KAIROX uses TikTok&apos;s Content Posting API to manage our official TikTok channel
              (<a href="https://www.tiktok.com/@channel.yari" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">@channel.yari</a>).
              This integration is used solely for publishing travel content related to our luggage delivery service.
              We do not collect or process TikTok user data beyond what is required for our own account management.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p>
              All content on kairox.jp including text, images, logos, and software is owned by KAIROX
              and protected under applicable intellectual property laws. Unauthorized use is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Governing Law</h2>
            <p>
              These Terms are governed by the laws of Japan. Any disputes shall be resolved in the
              courts of Chiba Prefecture, Japan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of our service after changes
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. Contact</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
              <p><strong>KAIROX</strong></p>
              <p>Email: <a href="mailto:support@kairox.jp" className="text-blue-600 hover:underline">support@kairox.jp</a></p>
              <p>Website: <a href="https://kairox.jp" className="text-blue-600 hover:underline">https://kairox.jp</a></p>
              <p className="mt-2 text-xs text-gray-400">千葉県 成田市 / Narita, Chiba, Japan</p>
            </div>
          </section>

          {/* 日本語サマリー */}
          <section className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">利用規約（日本語概要）</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              KAIROXは成田空港・都内ホテル間の手荷物配送サービスです。
              予約確定後のキャンセルは24時間以上前であれば全額返金いたします。
              荷物サイズは3辺合計160cm・30kg以内。危険物・高額品は対象外です。
              配送遅延は交通状況・悪天候により発生する場合があります。
              本規約は日本法に準拠し、千葉県を管轄裁判所とします。
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
