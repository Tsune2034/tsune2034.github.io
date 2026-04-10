import BookingApp from "@/components/BookingApp";
import CHITOSE_CONFIG from "@/lib/zones/chitose";

export default function ChitosePage() {
  return <BookingApp zone={CHITOSE_CONFIG} />;
}
