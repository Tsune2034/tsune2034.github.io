"use client";

import dynamic from "next/dynamic";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

// SSRを無効化してhydration mismatch（Google翻訳などによるDOM書き換え）を防ぐ
const Dashboard = dynamic(() => import("./Dashboard"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-gray-950" />,
});

export default function Page() {
  return (
    <Elements stripe={stripePromise}>
      <Dashboard />
    </Elements>
  );
}
