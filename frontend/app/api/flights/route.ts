import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.AVIATIONSTACK_API_KEY ?? "";
const BASE_URL = "https://api.aviationstack.com/v1/flights";

// キャッシュ（空港全便は60秒、フライト個別は30秒）
const cache = new Map<string, { data: unknown; ts: number }>();

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    // APIキー未設定 → モックデータを返す（開発・プロト用）
    return NextResponse.json(mockFlights());
  }

  const { searchParams } = req.nextUrl;
  const flight = searchParams.get("flight"); // 例: NH847
  const airport = searchParams.get("airport") ?? "NRT";
  const status = searchParams.get("status"); // active | landed | scheduled

  const cacheKey = flight ? `flight:${flight}` : `arr:${airport}:${status}`;
  const ttl = flight ? 30_000 : 60_000;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < ttl) {
    return NextResponse.json(cached.data);
  }

  const params = new URLSearchParams({ access_key: API_KEY });
  if (flight) {
    params.set("flight_iata", flight.toUpperCase());
  } else {
    params.set("arr_iata", airport);
    if (status) params.set("flight_status", status);
    params.set("limit", "20");
  }

  try {
    const res = await fetch(`${BASE_URL}?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Aviationstack ${res.status}`);
    const json = await res.json();
    const data = normalizeFlights(json);
    cache.set(cacheKey, { data, ts: Date.now() });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[flights API]", err);
    // フォールバック: モックデータ
    return NextResponse.json(mockFlights());
  }
}

// ─── Normalize Aviationstack response ───
interface AvFlight {
  flight_date: string;
  flight_status: string;
  departure: { airport: string; iata: string; scheduled: string; estimated: string | null; actual: string | null; delay: number | null };
  arrival: { airport: string; iata: string; scheduled: string; estimated: string | null; actual: string | null; delay: number | null; terminal?: string; gate?: string };
  airline: { name: string; iata: string };
  flight: { iata: string; number: string };
}

export interface FlightInfo {
  flightIata: string;
  airline: string;
  origin: string;
  originIata: string;
  scheduledArrival: string;
  estimatedArrival: string | null;
  actualArrival: string | null;
  delayMin: number | null;
  status: string;
  terminal: string | null;
  gate: string | null;
}

function normalizeFlights(json: { data?: AvFlight[] }): FlightInfo[] {
  return (json.data ?? []).map((f) => ({
    flightIata: f.flight.iata,
    airline: f.airline.name,
    origin: f.departure.airport,
    originIata: f.departure.iata,
    scheduledArrival: f.arrival.scheduled,
    estimatedArrival: f.arrival.estimated,
    actualArrival: f.arrival.actual,
    delayMin: f.arrival.delay,
    status: f.flight_status,
    terminal: f.arrival.terminal ?? null,
    gate: f.arrival.gate ?? null,
  }));
}

// ─── Mock data（APIキー未設定時） ───
function mockFlights(): FlightInfo[] {
  const now = new Date();
  function addMin(min: number): string {
    return new Date(now.getTime() + min * 60_000).toISOString();
  }
  return [
    { flightIata: "NH847",  airline: "ANA",           origin: "Bangkok Suvarnabhumi", originIata: "BKK", scheduledArrival: addMin(15),  estimatedArrival: addMin(18),  actualArrival: null,         delayMin: 3,   status: "active",    terminal: "2", gate: "34" },
    { flightIata: "JL717",  airline: "Japan Airlines", origin: "Singapore Changi",     originIata: "SIN", scheduledArrival: addMin(30),  estimatedArrival: addMin(30),  actualArrival: null,         delayMin: null, status: "active",   terminal: "2", gate: "41" },
    { flightIata: "KE705",  airline: "Korean Air",     origin: "Seoul Incheon",        originIata: "ICN", scheduledArrival: addMin(5),   estimatedArrival: null,        actualArrival: addMin(-2),   delayMin: null, status: "landed",   terminal: "1", gate: "12" },
    { flightIata: "CA921",  airline: "Air China",      origin: "Beijing Capital",      originIata: "PEK", scheduledArrival: addMin(60),  estimatedArrival: addMin(75),  actualArrival: null,         delayMin: 15,   status: "active",   terminal: "1", gate: null },
    { flightIata: "CX536",  airline: "Cathay Pacific", origin: "Hong Kong",            originIata: "HKG", scheduledArrival: addMin(90),  estimatedArrival: addMin(90),  actualArrival: null,         delayMin: null, status: "scheduled",terminal: "2", gate: null },
    { flightIata: "SQ634",  airline: "Singapore Air",  origin: "Singapore Changi",     originIata: "SIN", scheduledArrival: addMin(120), estimatedArrival: addMin(115), actualArrival: null,         delayMin: null, status: "active",   terminal: "1", gate: null },
    { flightIata: "MH88",   airline: "Malaysia Air",   origin: "Kuala Lumpur",         originIata: "KUL", scheduledArrival: addMin(-20), estimatedArrival: null,        actualArrival: addMin(-22),  delayMin: null, status: "landed",   terminal: "1", gate: "8" },
    { flightIata: "TG681",  airline: "Thai Airways",   origin: "Bangkok Suvarnabhumi", originIata: "BKK", scheduledArrival: addMin(150), estimatedArrival: addMin(150), actualArrival: null,         delayMin: null, status: "scheduled",terminal: "1", gate: null },
  ];
}
