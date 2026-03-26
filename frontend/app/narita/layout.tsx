import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KAIROX Japan Luggage Freedom — Travel Japan Hands-Free",
  description:
    "Land at Narita. Start exploring immediately. Your luggage meets you at the hotel. No counter, no cut-off time.",
  openGraph: {
    title: "KAIROX — Japan Luggage Freedom",
    description:
      "Land at Narita. Start exploring. Your luggage meets you at the hotel.",
    url: "https://kairox.jp/narita",
    siteName: "KAIROX",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "KAIROX — Japan Luggage Freedom",
    description:
      "Land at Narita. Start exploring. Your luggage meets you at the hotel.",
    site: "@kairox_jp",
  },
  alternates: {
    canonical: "https://kairox.jp/narita",
  },
};

export default function NaritaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
