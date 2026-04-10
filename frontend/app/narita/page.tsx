import BookingApp from "@/components/BookingApp";
import NARITA_CONFIG from "@/lib/zones/narita";

export default function NaritaPage() {
  return <BookingApp zone={NARITA_CONFIG} />;
}
