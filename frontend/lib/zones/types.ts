// ─────────────────────────────────────────────
// Zone Config Types — KAIROX Multi-Airport
// ─────────────────────────────────────────────

export type ZoneId = "narita" | "chitose";
export type Locale = "en" | "ja" | "zh" | "ko";

export interface Destination {
  id: string;
  nameJa: string;
  nameEn: string;
  nameZh: string;
  nameKo: string;
  area: string;
  distanceKm: number;
  etaMin: number;
  priceJpy: number;
  emoji: string;
  lat: number;
  lng: number;
}

export interface TerminalSpot {
  id: string;
  en: string;
  ja: string;
  zh: string;
  ko: string;
  icon: string;
}

export interface Terminal {
  id: string;
  labelEn: string;
  labelJa: string;
  hint: string;
  lat: number;
  lng: number;
  spots: TerminalSpot[];
}

export interface RideshareActivity {
  destId: string;
  riders: number;
  savings: number;
}

export interface ZoneConfig {
  id: ZoneId;
  bookingPrefix: string;         // e.g. "NRT-" | "CTS-"
  airportLat: number;
  airportLng: number;
  terminals: Terminal[];
  destinations: Destination[];
  hotels: Destination[];
  rideshare: RideshareActivity[];
  i18n: {
    badge: Record<Locale, string>;
    hero: Record<Locale, string>;
    hero_sub: Record<Locale, string>;
  };
}
