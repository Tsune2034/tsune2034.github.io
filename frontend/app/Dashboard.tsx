"use client";

import { useState, useEffect } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { t, LOCALES, type Locale, type Translation } from "./i18n";
import TrackingView from "./TrackingView";
import ChatWidget from "./ChatWidget";
import BusinessView from "./BusinessView";
import DriverView from "./DriverView";

// ───────────────────────── Types ─────────────────────────
type Step = "contact" | "luggage" | "delivery" | "payment" | "confirm";

interface MatchResult {
  match_count: number;
  group_id?: string;
  route_order?: number[];
  estimated_minutes?: number;
  route_reason?: string;
}
const STEPS: Step[] = ["contact", "luggage", "delivery", "payment", "confirm"];

type LuggageType = "bag" | "suitcase" | "box";
type LuggageSize = "s" | "m" | "l";
type Destination = "hotel" | "new_chitose" | "narita" | "haneda";
type PayMethod = "credit" | "jpyc" | "usdc";
type Plan = "solo" | "pair" | "family";
// MVP エリア（千歳・札幌近郊・小樽・富良野）
type Zone = "chitose" | "sapporo" | "otaru" | "furano";

// ───────────────────────── Pricing（MVP版） ─────────────────────────
const PLAN_PRICES: Record<Plan, Record<Zone, number>> = {
  solo:   { chitose: 3500, sapporo: 5000, otaru: 6500,  furano: 5500  },
  pair:   { chitose: 6000, sapporo: 8000, otaru: 11000, furano: 9000  },
  family: { chitose: 10000, sapporo: 14000, otaru: 18000, furano: 15000 },
};
const EXTRA_BAG_PRICE = 1500;
const EXPRESS_FEE = 1000;        // 急行保証料（スロット選択時のみ）
const SHARE_RIDE_RATE = 0.15;    // 相乗り割引率
const CARD_SURCHARGE_RATE = 0.10; // クレジットカード手数料率
const GPS_AIRPORT_DISCOUNT = 500; // 新千歳空港周辺割引
const GPS_RADIUS_KM = 15;
const CHITOSE_AIRPORT = { lat: 42.7753, lng: 141.6922 };
const USDC_RATE = 153; // JPY per USDC
const DRIVER_NEARBY_DISCOUNT = 300; // 近接ドライバー即時予約割引
const DRIVER_NEARBY_RADIUS_KM = 30; // サービスゾーン30km圏内
const ZONE_CENTERS = [
  { lat: 42.8193, lng: 141.6488 }, // chitose
  { lat: 43.0621, lng: 141.3544 }, // sapporo
  { lat: 43.1907, lng: 140.9947 }, // otaru
  { lat: 43.3499, lng: 142.3834 }, // furano
];
const KAIROX_JPYC_WALLET = "0x742d35Cc6634C0532925a3b8D4C9F2E71c9B3456"; // Polygon — 要変更

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const KAIROX_WALLET = "7xKsD4mVnPqR8wYjB2cFhT9eNbLuA3GiZoC6pW5sE1X";

function calcPrice(plan: Plan, zone: Zone, destination: Destination): number {
  // 空港配送は新千歳ゾーン料金。ホテル配送はゾーン料金
  const z: Zone = destination === "hotel" ? zone : "chitose";
  return PLAN_PRICES[plan][z];
}

function calcTotal(form: FormData, gpsDiscount: number): number {
  const base     = calcPrice(form.plan, form.zone, form.destination);
  const express  = form.preferredSlot !== null ? EXPRESS_FEE : 0;
  const extra    = form.extraBags * EXTRA_BAG_PRICE;
  const subtotal = base + express + extra;
  const share    = form.shareRide ? Math.floor(subtotal * SHARE_RIDE_RATE) : 0;
  const afterDiscount = subtotal - share - gpsDiscount;
  const cardFee  = form.payMethod === "credit" ? Math.floor(afterDiscount * CARD_SURCHARGE_RATE) : 0;
  return afterDiscount + cardFee;
}

// ───────────────────────── Spot data ─────────────────────────
interface Spot {
  id: string;
  icon: string;
  label: string;
  hint: string;
  floor?: string; // "1F" | "2F" | "B1"
}

// 集荷クイックスポット（ゾーン別）
const PICKUP_SPOTS: Record<Zone, Spot[]> = {
  chitose: [
    { id: "cts_intl_arrival",  icon: "✈️", label: "新千歳 国際線 到着ロビー",    hint: "インフォメーション前",        floor: "1F" },
    { id: "cts_intl_baggage",  icon: "🛄", label: "新千歳 国際線 手荷物受取",    hint: "ターンテーブル出口付近",      floor: "1F" },
    { id: "cts_dom_muji",      icon: "🏪", label: "新千歳 国内線 無印良品前",    hint: "2F 中央エリア",              floor: "2F" },
    { id: "cts_lera",          icon: "🛍️", label: "三井アウトレット レラ",        hint: "正面入口 案内所前",          floor: "1F" },
    { id: "cts_hotel_front",   icon: "🏨", label: "ホテルフロント前",            hint: "「KAIROX」とスタッフへ"              },
  ],
  sapporo: [
    { id: "sap_stella",        icon: "🏬", label: "ステラプレイス 正面入口",      hint: "JR札幌駅 南口すぐ",         floor: "1F" },
    { id: "sap_odori",         icon: "🌳", label: "大通公園 観光案内所前",        hint: "西2丁目出口付近"                    },
    { id: "sap_tanuki",        icon: "🦝", label: "狸小路 4丁目アーケード入口",   hint: "中央付近"                           },
    { id: "sap_hotel_front",   icon: "🏨", label: "ホテルフロント前",            hint: "「KAIROX」とスタッフへ"              },
  ],
  otaru: [
    { id: "ota_canal",         icon: "🚢", label: "小樽運河 観光案内所前",        hint: "中央橋横"                           },
    { id: "ota_sakaimachi",    icon: "🏮", label: "堺町通り メルヘン交差点",      hint: "オルゴール堂前"                     },
    { id: "ota_hotel_front",   icon: "🏨", label: "ホテルフロント前",            hint: "「KAIROX」とスタッフへ"              },
  ],
  furano: [
    { id: "akj_arrival",       icon: "✈️", label: "旭川空港 到着ロビー",          hint: "インフォメーション前",               floor: "1F" },
    { id: "asahikawa_st",      icon: "🚃", label: "旭川駅 観光案内所前",          hint: "北口すぐ"                           },
    { id: "furano_st",         icon: "🚃", label: "富良野駅 観光協会前",          hint: "駅舎すぐ隣"                         },
    { id: "fur_hotel_front",   icon: "🏨", label: "ホテルフロント前",            hint: "「KAIROX」とスタッフへ"              },
  ],
};

// 受け取りスポット — ホテル内
const HOTEL_DELIVERY_SPOTS: Spot[] = [
  { id: "hotel_front",   icon: "🏨", label: "フロントカウンター前", hint: "ベルサービスにお預けします" },
  { id: "hotel_bell",    icon: "🔔", label: "ベルデスク",           hint: "荷物一時預かりカウンター"   },
  { id: "hotel_entrance",icon: "🚪", label: "ホテル正面玄関",       hint: "エントランスでお受け取り"   },
  { id: "hotel_room",    icon: "🛏️", label: "客室前",               hint: "部屋番号を事前にご連絡"     },
];

// 受け取りスポット — 新千歳空港
const AIRPORT_DELIVERY_SPOTS: Spot[] = [
  { id: "cts_intl_ck",   icon: "✈️", label: "国際線 チェックインカウンター前", hint: "KAL・CI・CX 付近",       floor: "2F" },
  { id: "cts_intl_muji", icon: "🏪", label: "国際線 無印良品前",              hint: "待合エリア中央",          floor: "2F" },
  { id: "cts_intl_sbx",  icon: "☕", label: "国際線 スターバックス前",        hint: "出発ゲート手前",          floor: "2F" },
  { id: "cts_dom_ana",   icon: "🛫", label: "国内線 ANAカウンター前",         hint: "北ウィング側",            floor: "2F" },
  { id: "cts_dom_jal",   icon: "🛬", label: "国内線 JALカウンター前",         hint: "南ウィング側",            floor: "2F" },
  { id: "cts_arrival_info",icon:"🛒",label: "到着ロビー インフォメーション前",hint: "カートエリア横",          floor: "1F" },
];

// ───────────────────────── Hotel list per zone ─────────────────────────
const HOTELS_BY_ZONE: Record<Zone, string[]> = {
  chitose: [
    "ルートイングランティア千歳",
    "ホテルグリーンヒル千歳",
    "リッチモンドホテル千歳",
    "東横INN 新千歳空港",
    "APA ホテル千歳駅前",
    "ホテルビスタ千歳",
    "千歳ステーションホテル",
    // 北広島・苫小牧・東札幌
    "三井ガーデンホテル北広島",
    "ホテルエミシア札幌（東札幌）",
    "ドーミーイン苫小牧",
    "ホテルルートイン苫小牧駅前",
  ],
  sapporo: [
    "JWマリオット・ホテル札幌",
    "ヒルトン札幌",
    "ダブルツリーbyヒルトン札幌",
    "札幌グランドホテル",
    "三井ガーデンホテル札幌西",
    "ホテルモントレ札幌",
    "プレミアホテル中島公園札幌",
    "ストリングスホテル札幌",
    "クロスホテル札幌",
    "ラ・ジェント・ステイ札幌大通",
    "センチュリーロイヤルホテル",
    "ホテルオークラ札幌",
  ],
  otaru: [
    "ドーミーイン小樽",
    "ホテルソニア小樽",
    "小樽グランドホテルクラシック",
    "小樽朝里クラッセホテル",
    "ホテルノイシュロス小樽",
    "銀鱗荘",
    "小樽ふる川",
    "OMO5小樽（星野リゾート）",
  ],
  furano: [
    "新富良野プリンスホテル",
    "フラノ寶亭留",
    "ラ・テール富良野",
    "ホテルナトゥールヴァルト富良野",
    "ぱれっとの丘リゾート",
    "フラノ寶亭留",
    "ホテル日航旭川",
    "OMO7旭川（星野リゾート）",
    "旭川グランドホテル",
    "ホテルWBFグランデ旭川",
    // 美瑛
    "ホテルパークヒルズ（美瑛）",
    "びえい白金温泉ホテル（美瑛）",
  ],
};

function toUsdc(jpy: number): string {
  return (jpy / USDC_RATE).toFixed(2);
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  plan: Plan;
  extraBags: number;
  luggageType: LuggageType;
  quantity: number;
  size: LuggageSize;
  pickupLocation: string;
  pickupDate: string;
  destination: Destination;
  zone: Zone;
  hotelName: string;
  roomNumber: string;
  payMethod: PayMethod;
  shareRide: boolean;
  flightNumber: string;
  preferredSlot: number | null;
  pickupSpot: string;
  deliverySpot: string;
}

const DEFAULT_FORM: FormData = {
  name: "",
  email: "",
  phone: "",
  plan: "pair",
  extraBags: 0,
  luggageType: "suitcase",
  quantity: 2,
  size: "m",
  pickupLocation: "",
  pickupDate: "",
  destination: "hotel",
  zone: "chitose",
  hotelName: "",
  roomNumber: "",
  payMethod: "credit",
  shareRide: true,
  flightNumber: "",
  preferredSlot: null,
  pickupSpot: "",
  deliverySpot: "",
};

function genTrackingNumber() {
  return "KRX-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ───────────────────────── Flight slots ─────────────────────────
const FLIGHT_SLOTS = [
  { slot: 1, label: "便① 6:00〜7:00集荷 → 8:00着",  flights: ["仁川 KE 09:35", "仁川 OZ 10:00"] },
  { slot: 2, label: "便② 9:00〜11:00集荷 → 13:00着", flights: ["香港 CX 14:45", "香港 UO 15:20"] },
  { slot: 3, label: "便③ 11:00〜13:00集荷 → 15:00着",flights: ["台北 BR 15:45", "台北 CI 16:30", "仁川 KE 15:40"] },
  { slot: 4, label: "便④ 14:00〜16:00集荷 → 18:00着", flights: ["夜間便・翌日フライト前泊"] },
] as const;

// フライト番号→推奨slotを返す
function suggestSlot(flightTime: string): number | null {
  const match = flightTime.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = parseInt(match[1]);
  if (h >= 9  && h < 11) return 1;
  if (h >= 13 && h < 16) return 2;
  if (h >= 15 && h < 18) return 3;
  if (h >= 18)            return 4;
  return null;
}

// ───────────────────────── Spot Picker ─────────────────────────
function SpotPicker({
  spots,
  selected,
  onSelect,
  label,
}: {
  spots: Spot[];
  selected: string;
  onSelect: (spot: Spot) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-400">{label}</label>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {spots.map((spot) => {
          const active = selected === spot.id;
          return (
            <button
              key={spot.id}
              type="button"
              onClick={() => onSelect(spot)}
              className={`flex-shrink-0 flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 w-36 text-left transition-all ${
                active
                  ? "border-amber-500 bg-amber-950/40"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xl">{spot.icon}</span>
                {spot.floor && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    active ? "bg-amber-500 text-gray-950" : "bg-gray-700 text-gray-400"
                  }`}>
                    {spot.floor}
                  </span>
                )}
              </div>
              <p className={`text-xs font-semibold leading-tight ${active ? "text-amber-300" : "text-gray-200"}`}>
                {spot.label}
              </p>
              <p className="text-[10px] text-gray-500 leading-tight">{spot.hint}</p>
              {active && (
                <span className="text-[10px] text-amber-500 font-bold">✓ 選択中</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Hotel Search ─────────────────────────
// 全ホテルリスト（全ゾーン結合 → 検索対象）
const ALL_HOTELS = Object.entries(HOTELS_BY_ZONE).flatMap(([zone, hotels]) =>
  hotels.map((name) => ({ name, zone: zone as Zone }))
);

function HotelSearch({
  zone,
  value,
  onChange,
  tr,
}: {
  zone: Zone;
  value: string;
  onChange: (v: string) => void;
  tr: Translation;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  // ゾーン変更時にqueryをリセット
  const prevZone = useState(zone)[0];
  if (prevZone !== zone && query !== value) {
    setQuery("");
  }

  const candidates = query.trim().length === 0
    ? HOTELS_BY_ZONE[zone]           // 未入力 → ゾーンの全ホテル
    : ALL_HOTELS                      // 入力あり → 全ゾーン横断検索
        .filter((h) =>
          h.name.toLowerCase().includes(query.toLowerCase()) ||
          h.name.includes(query)
        )
        .map((h) => h.name);

  function select(name: string) {
    setQuery(name);
    onChange(name);
    setOpen(false);
  }

  function handleChange(v: string) {
    setQuery(v);
    onChange(v);
    setOpen(true);
  }

  return (
    <div className="space-y-1 relative">
      <label className="flex items-center gap-1 text-xs text-gray-400">
        {tr.hotel_name}
        <span className="text-amber-500 text-[10px] font-semibold">{tr.required}</span>
      </label>
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={tr.hotel_search_placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
      />
      {open && candidates.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {candidates.map((name) => (
            <li
              key={name}
              onMouseDown={() => select(name)}
              className="px-4 py-2.5 text-sm text-gray-200 hover:bg-amber-950/60 hover:text-amber-300 cursor-pointer transition-colors"
            >
              {name}
            </li>
          ))}
          {query.trim().length > 0 && !candidates.includes(query) && (
            <li
              onMouseDown={() => select(query)}
              className="px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-700 cursor-pointer border-t border-gray-700"
            >
              ✏️ {tr.hotel_use_input}: &ldquo;{query}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Small UI pieces ─────────────────────────
function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs text-gray-400">
        {label}
        {required && (
          <span className="text-amber-500 text-[10px] font-semibold">{required}</span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
      />
    </div>
  );
}

function SelectCard({
  selected,
  onClick,
  icon,
  label,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all w-full ${
        selected
          ? "border-amber-500 bg-amber-950/40 text-amber-300"
          : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      {selected && <span className="ml-auto text-amber-500">✓</span>}
    </button>
  );
}

function TabBtn({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
        selected
          ? "bg-amber-500 text-gray-950"
          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

// ───────────────────────── Steps ─────────────────────────
function StepContact({
  form,
  set,
  tr,
}: {
  form: FormData;
  set: (k: keyof FormData, v: string | number | boolean | null) => void;
  tr: Translation;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">{tr.contact_title}</h2>
      <Input
        label={tr.name}
        placeholder={tr.name_placeholder}
        value={form.name}
        onChange={(v) => set("name", v)}
        required={tr.required}
      />
      <Input
        label={tr.email}
        placeholder={tr.email_placeholder}
        value={form.email}
        onChange={(v) => set("email", v)}
        type="email"
        required={tr.required}
      />
      <Input
        label={tr.phone}
        placeholder={tr.phone_placeholder}
        value={form.phone}
        onChange={(v) => set("phone", v)}
        type="tel"
      />
    </div>
  );
}

const PLAN_META: Array<{
  plan: Plan;
  icon: string;
  labelKey: "plan_solo" | "plan_pair" | "plan_family";
  descKey: "plan_solo_desc" | "plan_pair_desc" | "plan_family_desc";
}> = [
  { plan: "solo",   icon: "🧳",         labelKey: "plan_solo",   descKey: "plan_solo_desc"   },
  { plan: "pair",   icon: "🧳🧳",       labelKey: "plan_pair",   descKey: "plan_pair_desc"   },
  { plan: "family", icon: "🧳🧳🧳🧳",   labelKey: "plan_family", descKey: "plan_family_desc" },
];

function StepLuggage({
  form,
  set,
  tr,
}: {
  form: FormData;
  set: (k: keyof FormData, v: string | number | boolean | null) => void;
  tr: Translation;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-white">{tr.plan_title}</h2>

      <div className="space-y-2">
        {PLAN_META.map(({ plan, icon, labelKey, descKey }) => (
          <SelectCard
            key={plan}
            selected={form.plan === plan}
            onClick={() => set("plan", plan)}
            icon={icon}
            label={tr[labelKey]}
            desc={tr[descKey]}
          />
        ))}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">{tr.extra_bag}</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => set("extraBags", Math.max(0, form.extraBags - 1))}
            className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-lg hover:bg-gray-700 transition-colors"
          >
            −
          </button>
          <span className="text-xl font-bold text-white tabular-nums w-8 text-center">
            {form.extraBags}
          </span>
          <button
            type="button"
            onClick={() => set("extraBags", Math.min(20, form.extraBags + 1))}
            className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-lg hover:bg-gray-700 transition-colors"
          >
            ＋
          </button>
          {form.extraBags > 0 && (
            <span className="text-xs text-amber-500 font-semibold">
              +¥{(form.extraBags * EXTRA_BAG_PRICE).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* 相乗りオプション */}
      <button
        type="button"
        onClick={() => set("shareRide", !form.shareRide)}
        className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${
          form.shareRide
            ? "border-green-500 bg-green-950/30"
            : "border-gray-700 bg-gray-800/50"
        }`}
      >
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          form.shareRide ? "border-green-500 bg-green-500" : "border-gray-600"
        }`}>
          {form.shareRide && <span className="text-[10px] text-white font-bold">✓</span>}
        </div>
        <div className="text-left flex-1">
          <p className={`text-sm font-semibold ${form.shareRide ? "text-green-400" : "text-gray-300"}`}>
            {tr.share_ride_label}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{tr.share_ride_desc}</p>
        </div>
        {form.shareRide && (
          <span className="text-xs bg-green-950 border border-green-700 text-green-400 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
            {tr.share_ride_save}
          </span>
        )}
      </button>
    </div>
  );
}

function StepDelivery({
  form,
  set,
  tr,
}: {
  form: FormData;
  set: (k: keyof FormData, v: string | number | boolean | null) => void;
  tr: Translation;
}) {
  const suggestedSlot = suggestSlot(form.flightNumber);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-white">{tr.delivery_title}</h2>

      {/* フライト番号入力 */}
      <div className="space-y-1">
        <label className="text-xs text-gray-400">{tr.flight_number}</label>
        <input
          type="text"
          value={form.flightNumber}
          onChange={(e) => {
            set("flightNumber", e.target.value);
            const s = suggestSlot(e.target.value);
            if (s) set("preferredSlot", s);
          }}
          placeholder={tr.flight_placeholder}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors font-mono"
        />
      </div>

      {/* 便選択 */}
      <div className="space-y-1.5">
        <label className="text-xs text-gray-400">{tr.slot_title}</label>
        {FLIGHT_SLOTS.map(({ slot, label, flights }) => {
          const isSelected = form.preferredSlot === slot;
          const isSuggested = suggestedSlot === slot;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => set("preferredSlot", slot)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                isSelected
                  ? "border-amber-500 bg-amber-950/40"
                  : "border-gray-700 hover:border-gray-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${isSelected ? "text-amber-300" : "text-gray-300"}`}>
                  {label}
                </p>
                {isSuggested && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-gray-950 font-bold">
                    {tr.slot_recommended}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{flights.join(" / ")}</p>
            </button>
          );
        })}
      </div>

      {/* 集荷スポット */}
      <div className="space-y-3">
        <SpotPicker
          spots={PICKUP_SPOTS[form.zone]}
          selected={form.pickupSpot}
          onSelect={(spot) => {
            set("pickupSpot", spot.id);
            set("pickupLocation", spot.label + (spot.hint ? `（${spot.hint}）` : ""));
          }}
          label={tr.pickup_spot_label}
        />
        <Input
          label={tr.pickup_location}
          placeholder={tr.pickup_placeholder}
          value={form.pickupLocation}
          onChange={(v) => { set("pickupLocation", v); set("pickupSpot", ""); }}
          required={tr.required}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400">{tr.deliver_to}</label>
        <div className="flex gap-2 flex-wrap">
          <TabBtn selected={form.destination === "hotel"} onClick={() => set("destination", "hotel")}>
            {tr.dest_hotel}
          </TabBtn>
          <TabBtn selected={form.destination === "new_chitose"} onClick={() => set("destination", "new_chitose")}>
            {tr.dest_new_chitose}
          </TabBtn>
          {(["narita", "haneda"] as Destination[]).map((d) => (
            <div key={d} className="relative">
              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-xl border border-gray-800 text-gray-600 text-sm cursor-not-allowed opacity-60"
              >
                {d === "narita" ? tr.dest_narita : tr.dest_haneda}
              </button>
              <span className="absolute -top-2 -right-1 text-[9px] font-bold bg-amber-500 text-gray-950 px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
                近日公開
              </span>
            </div>
          ))}
        </div>
      </div>

      {form.destination === "hotel" && (
        <div className="space-y-3 pt-1">
          {/* Zone selector */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400">{tr.zone_title}</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["chitose","sapporo","otaru","furano"] as Zone[]).map((z) => {
                const labels: Record<Zone, string> = {
                  chitose: tr.zone_chitose,
                  sapporo: tr.zone_sapporo,
                  otaru:   tr.zone_otaru,
                  furano:  tr.zone_furano,
                };
                return (
                  <button
                    key={z}
                    type="button"
                    onClick={() => { set("zone", z); set("hotelName", ""); set("deliverySpot", ""); }}
                    className={`px-3 py-2.5 rounded-xl border text-sm transition-all text-left ${
                      form.zone === z
                        ? "border-amber-500 bg-amber-950/40 text-amber-300 font-semibold"
                        : "border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {labels[z]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hotel search */}
          <HotelSearch
            zone={form.zone}
            value={form.hotelName}
            onChange={(v) => set("hotelName", v)}
            tr={tr}
          />

          {/* ホテル内受け取りスポット */}
          <SpotPicker
            spots={HOTEL_DELIVERY_SPOTS}
            selected={form.deliverySpot}
            onSelect={(spot) => set("deliverySpot", spot.id)}
            label={tr.delivery_spot_label}
          />

          <Input
            label={tr.room_number}
            placeholder={tr.room_placeholder}
            value={form.roomNumber}
            onChange={(v) => set("roomNumber", v)}
          />
        </div>
      )}

      {/* 新千歳空港配送スポット */}
      {form.destination === "new_chitose" && (
        <div className="pt-1">
          <SpotPicker
            spots={AIRPORT_DELIVERY_SPOTS}
            selected={form.deliverySpot}
            onSelect={(spot) => set("deliverySpot", spot.id)}
            label={tr.delivery_spot_label}
          />
        </div>
      )}
    </div>
  );
}

function UsdcQR({ address, amount }: { address: string; amount: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  // Simple CSS QR pattern (decorative)
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 w-24 h-24 bg-white rounded-lg p-1.5 grid grid-cols-7 gap-0.5">
        {Array.from({ length: 49 }).map((_, i) => {
          const pat = [0,1,2,3,4,5,6,7,13,14,20,21,27,28,29,30,31,34,37,40,42,43,44,48];
          const dark = pat.includes(i) || (Math.sin(i * 7.3) > 0.2);
          return <div key={i} className={`rounded-sm ${dark ? "bg-gray-900" : "bg-white"}`} />;
        })}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-xs text-gray-500 font-mono break-all leading-relaxed">
          {address}
        </p>
        <button
          type="button"
          onClick={copy}
          className="px-3 py-1 rounded-lg bg-gray-700 text-xs text-gray-300 hover:bg-gray-600 transition-colors font-medium"
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function StepPayment({
  form,
  set,
  tr,
  gpsDiscount,
  nearbyDiscount,
  stripeError,
}: {
  form: FormData;
  set: (k: keyof FormData, v: string | number | boolean | null) => void;
  tr: Translation;
  gpsDiscount: number;
  nearbyDiscount: number;
  stripeError: string;
}) {
  const basePrice = calcPrice(form.plan, form.zone, form.destination);
  const expressFee = form.preferredSlot !== null ? EXPRESS_FEE : 0;
  const extraCost = form.extraBags * EXTRA_BAG_PRICE;
  const subtotal = basePrice + expressFee + extraCost;
  const shareDiscount = form.shareRide ? Math.floor(subtotal * SHARE_RIDE_RATE) : 0;
  const afterDiscount = subtotal - shareDiscount - gpsDiscount - nearbyDiscount;
  const cardFee = form.payMethod === "credit" ? Math.floor(afterDiscount * CARD_SURCHARGE_RATE) : 0;
  const total = afterDiscount + cardFee;
  const usdcAmount = toUsdc(afterDiscount); // USDC/JPYCは割引後・手数料なし

  const selectedSlot = FLIGHT_SLOTS.find((s) => s.slot === form.preferredSlot);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-white">{tr.payment_title}</h2>

      {/* Price breakdown */}
      <div className="bg-gray-800/60 border border-amber-800/50 rounded-xl p-4 space-y-3">

        {/* 内訳 */}
        <div className="space-y-2 text-sm">
          {/* 基本料金 */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400">{tr.price_base}</span>
            <span className="text-gray-200 font-medium">¥{basePrice.toLocaleString()}</span>
          </div>

          {/* 急行保証料（スロット選択時のみ） */}
          {expressFee > 0 && (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-amber-400 font-semibold flex items-center gap-1">
                  ⚡ {tr.price_express}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{selectedSlot?.label}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">{tr.price_express_badge}</p>
              </div>
              <span className="text-amber-400 font-semibold whitespace-nowrap">
                +¥{expressFee.toLocaleString()}
              </span>
            </div>
          )}

          {/* 追加荷物 */}
          {form.extraBags > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">{tr.extra_bag} ×{form.extraBags}</span>
              <span className="text-gray-200 font-medium">+¥{extraCost.toLocaleString()}</span>
            </div>
          )}

          {/* 区切り線 */}
          <div className="border-t border-gray-700 pt-2" />

          {/* 相乗り割引 */}
          {shareDiscount > 0 && (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-green-400 font-semibold flex items-center gap-1">
                  🤝 {tr.price_share_discount}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{tr.price_share_desc}</p>
              </div>
              <span className="text-green-400 font-bold whitespace-nowrap">
                −¥{shareDiscount.toLocaleString()}
              </span>
            </div>
          )}

          {/* GPS空港割引 */}
          {gpsDiscount > 0 && (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sky-400 font-semibold flex items-center gap-1">
                  📍 {tr.price_gps_discount}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{tr.price_gps_desc}</p>
              </div>
              <span className="text-sky-400 font-bold whitespace-nowrap">
                −¥{gpsDiscount.toLocaleString()}
              </span>
            </div>
          )}

          {/* 近接ドライバー即時割引 */}
          {nearbyDiscount > 0 && (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-green-400 font-semibold flex items-center gap-1">
                  🚐 {tr.price_nearby_discount}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{tr.price_nearby_desc}</p>
              </div>
              <span className="text-green-400 font-bold whitespace-nowrap">
                −¥{nearbyDiscount.toLocaleString()}
              </span>
            </div>
          )}

          {/* クレジットカード手数料 */}
          {cardFee > 0 && (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-red-400 font-semibold flex items-center gap-1">
                  💳 カード決済手数料
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  JPYC / USDC なら手数料 0円
                </p>
              </div>
              <span className="text-red-400 font-bold whitespace-nowrap">
                +¥{cardFee.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* 合計 */}
        <div className="border-t border-amber-800/50 pt-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-amber-500/80 font-semibold uppercase tracking-wide">
                {tr.price_total}
              </p>
              <p className="text-3xl font-bold text-white mt-0.5">
                ¥{total.toLocaleString()}
              </p>
              {(shareDiscount + gpsDiscount + nearbyDiscount) > 0 && (
                <p className="text-xs text-green-400 mt-0.5">
                  {tr.price_saved} ¥{(shareDiscount + gpsDiscount + nearbyDiscount).toLocaleString()}
                </p>
              )}
            </div>
            {/* 支払い方法別の等価額 */}
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[10px] text-violet-400 font-bold">JPYC</span>
                <span className="text-base font-bold text-violet-300">{total.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[10px] text-amber-400 font-bold">USDC</span>
                <span className="text-base font-bold text-amber-300">{usdcAmount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 相乗りマッチングステータス */}
      {form.shareRide && (
        <div className="flex items-center gap-3 bg-green-950/30 border border-green-800/60 rounded-xl px-4 py-3">
          <div className="relative flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping opacity-50" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-green-400">{tr.price_matching}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{tr.price_matching_candidates}</p>
          </div>
          <span className="text-[10px] bg-green-900 border border-green-700 text-green-400 px-2 py-0.5 rounded-full font-bold">
            AI
          </span>
        </div>
      )}

      {/* Payment method — 3択 */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => set("payMethod", "credit")}
          className={`relative py-2.5 text-sm font-medium rounded-lg transition-all ${
            form.payMethod === "credit"
              ? "bg-amber-500 text-gray-950"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          {tr.pay_credit}
          <span className="absolute -top-2 -right-1 text-[8px] font-bold bg-red-500 text-white px-1 py-0.5 rounded-full leading-none">
            +10%
          </span>
        </button>
        <button
          type="button"
          onClick={() => set("payMethod", "jpyc")}
          className={`relative py-2.5 text-sm font-medium rounded-lg transition-all ${
            form.payMethod === "jpyc"
              ? "bg-violet-500 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          {tr.pay_jpyc}
          <span className="absolute -top-2 -right-1 text-[8px] font-bold bg-green-500 text-white px-1 py-0.5 rounded-full leading-none">
            0%
          </span>
        </button>
        <button
          type="button"
          onClick={() => set("payMethod", "usdc")}
          className={`relative py-2.5 text-sm font-medium rounded-lg transition-all ${
            form.payMethod === "usdc"
              ? "bg-amber-500 text-gray-950"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          {tr.pay_usdc}
          <span className="absolute -top-2 -right-1 text-[8px] font-bold bg-green-500 text-white px-1 py-0.5 rounded-full leading-none">
            0%
          </span>
        </button>
      </div>

      {/* クレジットカード — Stripe CardElement */}
      {form.payMethod === "credit" && (
        <div className="space-y-3">
          <label className="text-xs text-gray-400">{tr.card_number}</label>
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 focus-within:border-amber-500 transition-colors">
            <CardElement
              options={{
                style: {
                  base: {
                    color: "#f3f4f6",
                    fontFamily: "ui-sans-serif, system-ui, sans-serif",
                    fontSize: "14px",
                    "::placeholder": { color: "#4b5563" },
                  },
                  invalid: { color: "#f87171" },
                },
                hidePostalCode: true,
              }}
            />
          </div>
          {stripeError && (
            <p className="text-xs text-red-400 mt-1">{stripeError}</p>
          )}
          <p className="text-[10px] text-gray-600">
            🔒 Powered by Stripe — PCI DSS準拠・カード番号は当社サーバーに保存されません
          </p>
        </div>
      )}

      {/* JPYC on Polygon */}
      {form.payMethod === "jpyc" && (
        <div className="bg-gray-800 border border-violet-800/60 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">JPYC on Polygon</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{tr.jpyc_desc}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs bg-green-950 border border-green-800 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                0% fee
              </span>
              <span className="text-xs bg-violet-950 border border-violet-700 text-violet-300 px-2 py-0.5 rounded-full font-semibold">
                {tr.jpyc_badge}
              </span>
            </div>
          </div>

          <div className="bg-violet-950/30 border border-violet-800/40 rounded-xl p-3">
            <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wide mb-1">
              {tr.jpyc_amount_label}
            </p>
            <p className="text-3xl font-bold text-violet-200">
              {total.toLocaleString()} <span className="text-lg text-violet-400">JPYC</span>
            </p>
            <p className="text-[10px] text-gray-500 mt-1">{tr.jpyc_rate_note}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">
              {tr.jpyc_scan}
            </p>
            <UsdcQR address={KAIROX_JPYC_WALLET} amount={String(total)} />
          </div>

          <div className="bg-gray-900 rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-gray-500 font-semibold uppercase">
              {tr.jpyc_address} (Polygon)
            </p>
            <p className="text-xs font-mono text-gray-400 break-all">{KAIROX_JPYC_WALLET}</p>
          </div>

          <p className="text-[11px] text-gray-600">{tr.jpyc_note}</p>
        </div>
      )}

      {/* USDC on Solana */}
      {form.payMethod === "usdc" && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">USDC on Solana</p>
            <span className="text-xs bg-green-950 border border-green-800 text-green-400 px-2 py-0.5 rounded-full font-semibold">
              0% fee
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">
              {tr.usdc_scan} — {usdcAmount} USDC
            </p>
            <UsdcQR address={KAIROX_WALLET} amount={usdcAmount} />
          </div>

          <div className="bg-gray-900 rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-gray-500 font-semibold uppercase">
              {tr.usdc_address}
            </p>
            <p className="text-xs font-mono text-gray-400 break-all">{KAIROX_WALLET}</p>
          </div>

          <p className="text-[11px] text-gray-600">{tr.usdc_note}</p>
        </div>
      )}

      <p className="text-xs text-gray-600">{tr.price_note}</p>
    </div>
  );
}

function StepConfirm({
  trackingNumber,
  tr,
  onNewBooking,
  onTrack,
  matchResult,
}: {
  trackingNumber: string;
  tr: Translation;
  onNewBooking: () => void;
  onTrack: (num: string) => void;
  matchResult: MatchResult | null;
}) {
  return (
    <div className="space-y-6 text-center py-4">
      <div className="text-6xl">🎉</div>
      <div>
        <h2 className="text-2xl font-bold text-white">{tr.confirm_title}</h2>
        <p className="text-sm text-gray-400 mt-2">{tr.confirm_desc}</p>
      </div>

      <div className="bg-amber-950/40 border border-amber-700 rounded-xl p-5">
        <p className="text-xs text-amber-400 mb-1">{tr.confirm_subtitle}</p>
        <p className="text-2xl font-bold text-amber-300 tracking-widest font-mono">
          {trackingNumber}
        </p>
      </div>

      {/* AIマッチング結果 */}
      {matchResult && matchResult.match_count >= 2 && (
        <div className="bg-green-950/30 border border-green-800 rounded-xl p-4 text-left space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-lg">🤝</span>
            <p className="text-sm font-bold text-green-400">
              {tr.match_confirmed.replace("{n}", String(matchResult.match_count))}
            </p>
          </div>
          {matchResult.estimated_minutes && (
            <p className="text-xs text-gray-400">
              {tr.match_eta.replace("{min}", String(matchResult.estimated_minutes))}
            </p>
          )}
          {matchResult.route_reason && (
            <p className="text-xs text-gray-500 italic">{matchResult.route_reason}</p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] bg-green-900 border border-green-700 text-green-400 px-2 py-0.5 rounded-full font-bold">
              AI最適化済み
            </span>
            <span className="text-[10px] text-gray-600">by Claude</span>
          </div>
        </div>
      )}

      {/* キャンセルポリシー */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-left space-y-2">
        <p className="text-xs font-semibold text-gray-300">{tr.cancel_policy_title}</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-green-400 font-bold flex-shrink-0">✓</span>
            <span className="text-gray-400">{tr.cancel_policy_free}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold flex-shrink-0">△</span>
            <span className="text-gray-400">{tr.cancel_policy_partial}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 font-bold flex-shrink-0">✗</span>
            <span className="text-gray-400">{tr.cancel_policy_none}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="w-full py-3 rounded-xl bg-amber-500 text-gray-950 font-semibold text-sm hover:bg-amber-400 transition-colors"
          onClick={() => onTrack(trackingNumber)}
        >
          {tr.go_track}
        </button>
        <button
          type="button"
          className="w-full py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 font-medium text-sm hover:bg-gray-700 transition-colors"
          onClick={onNewBooking}
        >
          {tr.book_another}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Progress bar ─────────────────────────
function ProgressBar({
  currentStep,
  tr,
}: {
  currentStep: Step;
  tr: Translation;
}) {
  const idx = STEPS.indexOf(currentStep);
  const labels = [
    tr.step_contact,
    tr.step_luggage,
    tr.step_delivery,
    tr.step_payment,
    tr.step_confirm,
  ];

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done
                    ? "bg-amber-500 text-gray-950"
                    : active
                    ? "bg-amber-500 text-gray-950 ring-4 ring-amber-500/30"
                    : "bg-gray-800 border border-gray-700 text-gray-600"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-[10px] mt-1 whitespace-nowrap ${
                  active ? "text-amber-400 font-semibold" : "text-gray-600"
                }`}
              >
                {labels[i]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mb-4 mx-1 transition-all ${
                  done ? "bg-amber-500" : "bg-gray-800"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── Driver Nearby Ticker ─────────────────────────
function DriverNearbyTicker({ discount, locale }: { discount: number; locale: Locale }) {
  const messages: Record<Locale, string> = {
    en: `🚐 A driver is nearby! Book now for ¥${discount.toLocaleString()} OFF  ·  Limited time offer  ·  `,
    ja: `🚐 近くにドライバーがいます！今すぐ予約で ¥${discount.toLocaleString()} OFF  ·  空き時間に対応可能  ·  `,
    zh: `🚐 附近有司機！立即預訂享 ¥${discount.toLocaleString()} 折扣  ·  限時優惠  ·  `,
    ko: `🚐 근처에 드라이버가 있습니다！지금 예약 시 ¥${discount.toLocaleString()} 할인  ·  한정 혜택  ·  `,
  };
  const msg = messages[locale];
  const doubled = msg + msg; // marquee 折り返し用

  return (
    <div className="bg-green-950 border border-green-700/60 rounded-2xl px-4 py-2.5 flex items-center gap-3 overflow-hidden">
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <div className="overflow-hidden flex-1">
        <p
          className="text-xs font-bold text-green-300 whitespace-nowrap"
          style={{ animation: "marquee 20s linear infinite", display: "inline-block" }}
        >
          {doubled}
        </p>
      </div>
      <span className="flex-shrink-0 text-[10px] font-bold bg-green-700 text-green-100 px-2 py-0.5 rounded-full">
        LIVE
      </span>
    </div>
  );
}

// ───────────────────────── Main Component ─────────────────────────
type View = "book" | "track" | "business" | "driver";

export default function Dashboard() {
  const stripe = useStripe();
  const elements = useElements();

  const [locale, setLocale] = useState<Locale>("en");
  const [view, setView] = useState<View>("book");
  const [step, setStep] = useState<Step>("contact");
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingForView, setTrackingForView] = useState<string | undefined>();
  const [gpsDiscount, setGpsDiscount] = useState(0);
  const [driverNearby, setDriverNearby] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stripeError, setStripeError] = useState("");

  const tr = t[locale];
  const nearbyDiscount = driverNearby ? DRIVER_NEARBY_DISCOUNT : 0;

  // GPS: 新千歳空港15km圏内 → 空港割引 / サービスゾーン30km圏内 → 近接ドライバー割引
  useEffect(() => {
    if (!navigator.geolocation) return;
    const now = new Date().getHours();
    const inOperatingHours = now >= 6 && now <= 22;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // 新千歳空港割引
        if (haversineKm(lat, lng, CHITOSE_AIRPORT.lat, CHITOSE_AIRPORT.lng) <= GPS_RADIUS_KM) {
          setGpsDiscount(GPS_AIRPORT_DISCOUNT);
        }
        // ゾーン近接 → ドライバー即時割引
        if (inOperatingHours) {
          const nearZone = ZONE_CENTERS.some((z) => haversineKm(lat, lng, z.lat, z.lng) <= DRIVER_NEARBY_RADIUS_KM);
          if (nearZone) setDriverNearby(true);
        }
      },
      () => {},
      { timeout: 5000 },
    );
  }, []);

  function setField(k: keyof FormData, v: string | number | boolean | null) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function submitBooking(paymentIntentId?: string) {
    const total = calcTotal(form, gpsDiscount + nearbyDiscount);
    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:               form.name,
        email:              form.email,
        phone:              form.phone,
        plan:               form.plan,
        extra_bags:         form.extraBags,
        pickup_location:    form.pickupLocation,
        pickup_date:        form.pickupDate,
        destination:        form.destination,
        zone:               form.zone,
        hotel_name:         form.hotelName,
        room_number:        form.roomNumber,
        pay_method:         form.payMethod,
        total_amount:       total,
        share_ride:         form.shareRide,
        preferred_slot:     form.preferredSlot,
        flight_number:      form.flightNumber,
        payment_intent_id:  paymentIntentId ?? null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTrackingNumber(data.booking_id);
      setMatchResult(data.match ?? null);
    } else {
      setTrackingNumber(genTrackingNumber());
      setMatchResult(null);
    }
  }

  async function next() {
    const idx = STEPS.indexOf(step);
    if (idx >= STEPS.length - 1) return;

    if (step === "payment") {
      setSubmitting(true);
      setStripeError("");
      try {
        const total = calcTotal(form, gpsDiscount + nearbyDiscount);

        if (form.payMethod === "credit") {
          // Stripe: PaymentIntent作成 → カード決済確定
          if (!stripe || !elements) {
            setStripeError("決済システムの初期化中です。しばらくお待ちください。");
            setSubmitting(false);
            return;
          }
          const cardElement = elements.getElement(CardElement);
          if (!cardElement) {
            setStripeError("カード情報を入力してください。");
            setSubmitting(false);
            return;
          }

          // バックエンドでPaymentIntentを作成
          const intentRes = await fetch("/api/payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: total }),
          });
          const { client_secret } = await intentRes.json();

          // Stripeでカード決済を確定
          const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
            payment_method: { card: cardElement },
          });

          if (error) {
            setStripeError(error.message ?? "決済に失敗しました。カード情報を確認してください。");
            setSubmitting(false);
            return;
          }

          await submitBooking(paymentIntent?.id);
        } else {
          // JPYC / USDC は送金確認後に予約記録のみ作成
          await submitBooking();
        }
      } catch {
        setTrackingNumber(genTrackingNumber());
        setMatchResult(null);
      } finally {
        setSubmitting(false);
      }
    }

    setStep(STEPS[idx + 1]);
  }

  function back() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }

  function reset() {
    setForm(DEFAULT_FORM);
    setStep("contact");
    setTrackingNumber("");
  }

  function goTrack(num: string) {
    setTrackingForView(num);
    setView("track");
  }

  const isFirst = step === "contact";
  const isLast = step === "payment";
  const isConfirm = step === "confirm";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-wider text-white">{tr.brand}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-400">
                  {tr.domestic_badge}
                </span>
              </div>
              <p className="text-[11px] text-amber-500/80 mt-0.5">{tr.tagline}</p>
            </div>
            <div className="flex items-center gap-1">
              {LOCALES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLocale(l.value)}
                  className={`px-2 py-1 rounded-md text-xs transition-all ${
                    locale === l.value
                      ? "bg-amber-500 text-gray-950 font-semibold"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          {/* Nav tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setView("book")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === "book"
                  ? "bg-gray-700 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tr.nav_book}
            </button>
            <button
              onClick={() => { setTrackingForView(undefined); setView("track"); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === "track"
                  ? "bg-gray-700 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tr.nav_track}
            </button>
            <button
              onClick={() => setView("business")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === "business"
                  ? "bg-amber-500 text-gray-950"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tr.nav_business}
            </button>
            <button
              onClick={() => setView("driver")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === "driver"
                  ? "bg-sky-500 text-white"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              🚐
            </button>
          </div>
        </div>
      </header>

      <ChatWidget tr={tr} />

      {/* Main */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        {view === "driver" ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <DriverView tr={tr} />
          </div>
        ) : view === "business" ? (
          <BusinessView tr={tr} />
        ) : view === "track" ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <TrackingView tr={tr} initialNumber={trackingForView} />
          </div>
        ) : (
          <>
            {/* ドライバー近接テロップ */}
            {driverNearby && !isConfirm && (
              <DriverNearbyTicker discount={DRIVER_NEARBY_DISCOUNT} locale={locale} />
            )}

            {/* Progress */}
            {!isConfirm && (
              <ProgressBar currentStep={step} tr={tr} />
            )}

            {/* Step content */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              {step === "contact" && (
                <StepContact form={form} set={setField} tr={tr} />
              )}
              {step === "luggage" && (
                <StepLuggage form={form} set={setField} tr={tr} />
              )}
              {step === "delivery" && (
                <StepDelivery form={form} set={setField} tr={tr} />
              )}
              {step === "payment" && (
                <StepPayment form={form} set={setField} tr={tr} gpsDiscount={gpsDiscount} nearbyDiscount={nearbyDiscount} stripeError={stripeError} />
              )}
              {step === "confirm" && (
                <StepConfirm
                  trackingNumber={trackingNumber}
                  tr={tr}
                  onNewBooking={reset}
                  onTrack={goTrack}
                  matchResult={matchResult}
                />
              )}
            </div>

            {/* Nav buttons */}
            {!isConfirm && (
              <div className="flex gap-3">
                {!isFirst && (
                  <button
                    type="button"
                    onClick={back}
                    className="px-5 py-3 rounded-xl border border-gray-700 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                  >
                    {tr.back}
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-gray-950 font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-gray-950/30 border-t-gray-950 rounded-full animate-spin" />
                      {tr.submitting}
                    </span>
                  ) : (
                    isLast ? tr.submit : tr.next
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
