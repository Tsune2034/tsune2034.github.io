"use client";

import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Step = "pickup" | "destination" | "luggage" | "confirm" | "matching" | "live";
type Locale = "en" | "ja" | "zh" | "ko";
type PayMethod = "credit" | "jpyc" | "usdc";

interface Destination {
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

interface GpsCoord {
  lat: number;
  lng: number;
}

// ─────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────
// Narita airport coordinates
const NARITA_LAT = 35.7648;
const NARITA_LNG = 140.3861;

interface TerminalSpot {
  id: string;
  en: string; ja: string; zh: string; ko: string;
  icon: string;
}

const NARITA_TERMINALS = [
  {
    id: "T1", labelEn: "Terminal 1", labelJa: "第1ターミナル", hint: "JAL / Korean Air / Air China",
    lat: 35.7665, lng: 140.3847,
    spots: [
      { id: "t1-arrival", en: "Arrivals Hall (Central)",      ja: "到着ロビー（中央）",          zh: "到达大厅（中央）",   ko: "도착 로비（중앙）",         icon: "🚪" },
      { id: "t1-starbucks", en: "Starbucks (B1 South)",       ja: "スターバックス（B1南）",       zh: "星巴克（B1南）",    ko: "스타벅스（B1 남쪽）",      icon: "☕" },
      { id: "t1-711",   en: "7-Eleven (1F South Wing)",       ja: "セブンイレブン（1F南ウイング）",zh: "7-11（1F南翼）",    ko: "세븐일레븐（1F 남쪽）",     icon: "🏪" },
      { id: "t1-bus",   en: "Bus Terminal (1F)",              ja: "バス乗り場（1F出口）",         zh: "大巴站（1F出口）",  ko: "버스 터미널（1F）",         icon: "🚌" },
      { id: "t1-taxi",  en: "Taxi Stand (1F Exit 2)",         ja: "タクシー乗り場（1F 2番出口）", zh: "出租车（1F 2号出口）",ko: "택시 승강장（1F 2번 출구）", icon: "🚕" },
    ] as TerminalSpot[],
  },
  {
    id: "T2", labelEn: "Terminal 2", labelJa: "第2ターミナル", hint: "ANA / United / Lufthansa",
    lat: 35.7636, lng: 140.3862,
    spots: [
      { id: "t2-arrival", en: "Arrivals Hall (Central)",      ja: "到着ロビー（中央）",          zh: "到达大厅（中央）",   ko: "도착 로비（중앙）",         icon: "🚪" },
      { id: "t2-mcd",   en: "McDonald's (1F East)",           ja: "マクドナルド（1F東）",         zh: "麦当劳（1F东）",    ko: "맥도날드（1F 동쪽）",      icon: "🍔" },
      { id: "t2-lawson",en: "Lawson (B1 North)",              ja: "ローソン（B1北）",             zh: "罗森（B1北）",      ko: "로손（B1 북쪽）",           icon: "🏪" },
      { id: "t2-bus",   en: "Bus Terminal (1F North Exit)",   ja: "バス乗り場（1F北口）",         zh: "大巴站（1F北出口）",ko: "버스 터미널（1F 북쪽 출구）",icon: "🚌" },
      { id: "t2-taxi",  en: "Taxi Stand (1F Exit 4)",         ja: "タクシー乗り場（1F 4番出口）", zh: "出租车（1F 4号出口）",ko: "택시 승강장（1F 4번 출구）", icon: "🚕" },
    ] as TerminalSpot[],
  },
  {
    id: "T3", labelEn: "Terminal 3 (LCC)", labelJa: "第3ターミナル", hint: "Peach / Jetstar / Spring",
    lat: 35.7600, lng: 140.3890,
    spots: [
      { id: "t3-arrival", en: "Arrivals Exit (1F)",           ja: "到着口（1F）",                 zh: "到达出口（1F）",    ko: "도착 출구（1F）",           icon: "🚪" },
      { id: "t3-fm",    en: "FamilyMart (1F)",                ja: "ファミリーマート（1F）",        zh: "全家（1F）",        ko: "패밀리마트（1F）",          icon: "🏪" },
      { id: "t3-food",  en: "Food Court (1F)",                ja: "フードコート（1F）",            zh: "美食广场（1F）",    ko: "푸드코트（1F）",            icon: "🍜" },
      { id: "t3-bus",   en: "Bus Terminal (1F)",              ja: "バス乗り場（1F）",              zh: "大巴站（1F）",      ko: "버스 터미널（1F）",         icon: "🚌" },
    ] as TerminalSpot[],
  },
];

const DESTINATIONS: Destination[] = [
  // ── 成田近郊 ──
  { id: "narita_city", nameJa: "成田市内ホテル", nameEn: "Narita City Hotel",    nameZh: "成田市区酒店",   nameKo: "나리타 시내 호텔", area: "Narita",           distanceKm: 10,  etaMin: 20,  priceJpy: 1800, emoji: "🏨", lat: 35.7720, lng: 140.3188 },
  // ── 千葉 ──
  { id: "chiba",       nameJa: "千葉市内",       nameEn: "Chiba City",           nameZh: "千叶市区",       nameKo: "지바시",           area: "Chiba",            distanceKm: 35,  etaMin: 45,  priceJpy: 3700, emoji: "🌊", lat: 35.6073, lng: 140.1063 },
  { id: "makuhari",    nameJa: "幕張・海浜幕張", nameEn: "Makuhari / Mihama",    nameZh: "幕张新都心",     nameKo: "마쿠하리",         area: "Chiba",            distanceKm: 40,  etaMin: 50,  priceJpy: 4200, emoji: "🏟️", lat: 35.6488, lng: 140.0432 },
  // ── 東京東側 ──
  { id: "asakusa",     nameJa: "浅草・上野",     nameEn: "Asakusa / Ueno",       nameZh: "浅草/上野",      nameKo: "아사쿠사/우에노",  area: "East Tokyo",       distanceKm: 58,  etaMin: 65,  priceJpy: 5200, emoji: "⛩️", lat: 35.7147, lng: 139.7967 },
  { id: "akihabara",   nameJa: "秋葉原・神田",   nameEn: "Akihabara / Kanda",    nameZh: "秋叶原/神田",    nameKo: "아키하바라/간다",  area: "East Tokyo",       distanceKm: 60,  etaMin: 68,  priceJpy: 5400, emoji: "🎮", lat: 35.6984, lng: 139.7731 },
  // ── 東京中心 ──
  { id: "ginza",       nameJa: "銀座・東京駅",   nameEn: "Ginza / Tokyo Sta.",   nameZh: "银座/东京站",    nameKo: "긴자/도쿄역",      area: "Central Tokyo",    distanceKm: 63,  etaMin: 70,  priceJpy: 5700, emoji: "🗼", lat: 35.6762, lng: 139.7649 },
  { id: "odaiba",      nameJa: "お台場・有明",   nameEn: "Odaiba / Ariake",      nameZh: "台场/有明",      nameKo: "오다이바/아리아케", area: "Central Tokyo",    distanceKm: 67,  etaMin: 75,  priceJpy: 5900, emoji: "🌉", lat: 35.6268, lng: 139.7754 },
  // ── 東京西側 ──
  { id: "shinjuku",    nameJa: "新宿・渋谷",     nameEn: "Shinjuku / Shibuya",   nameZh: "新宿/涩谷",      nameKo: "신주쿠/시부야",    area: "West Tokyo",       distanceKm: 68,  etaMin: 75,  priceJpy: 6200, emoji: "🏙️", lat: 35.6896, lng: 139.6921 },
  { id: "roppongi",    nameJa: "六本木・麻布",   nameEn: "Roppongi / Azabu",     nameZh: "六本木/麻布",    nameKo: "롯폰기/아자부",    area: "West Tokyo",       distanceKm: 65,  etaMin: 72,  priceJpy: 5800, emoji: "🌃", lat: 35.6628, lng: 139.7314 },
  { id: "ikebukuro",   nameJa: "池袋・板橋",     nameEn: "Ikebukuro / Itabashi", nameZh: "池袋/板桥",      nameKo: "이케부쿠로/이타바시", area: "North Tokyo",     distanceKm: 70,  etaMin: 78,  priceJpy: 6300, emoji: "🎡", lat: 35.7295, lng: 139.7109 },
  // ── 埼玉・神奈川 ──
  { id: "saitama",     nameJa: "さいたま・川越", nameEn: "Saitama / Kawagoe",    nameZh: "埼玉/川越",      nameKo: "사이타마/가와고에", area: "Saitama",          distanceKm: 80,  etaMin: 90,  priceJpy: 7300, emoji: "🌿", lat: 35.8617, lng: 139.6455 },
  { id: "yokohama",    nameJa: "横浜",           nameEn: "Yokohama",             nameZh: "横滨",           nameKo: "요코하마",          area: "Kanagawa",         distanceKm: 90,  etaMin: 100, priceJpy: 7800, emoji: "🚢", lat: 35.4437, lng: 139.6380 },
  // ── 空港間エクスプレス（プレミアム） ──
  { id: "haneda1",     nameJa: "羽田空港 T1 (JAL)",  nameEn: "Haneda T1 — JAL",  nameZh: "羽田机场 T1 (JAL)",  nameKo: "하네다 T1 (JAL)",   area: "Airport Express",  distanceKm: 90,  etaMin: 95,  priceJpy: 12000, emoji: "✈️", lat: 35.5533, lng: 139.7811 },
  { id: "haneda2",     nameJa: "羽田空港 T2 (ANA)",  nameEn: "Haneda T2 — ANA",  nameZh: "羽田机场 T2 (ANA)",  nameKo: "하네다 T2 (ANA)",   area: "Airport Express",  distanceKm: 90,  etaMin: 95,  priceJpy: 12000, emoji: "✈️", lat: 35.5494, lng: 139.7798 },
  { id: "haneda3",     nameJa: "羽田空港 T3 (国際)",  nameEn: "Haneda T3 — Intl", nameZh: "羽田机场 T3 (国际)", nameKo: "하네다 T3 (국제선)", area: "Airport Express",  distanceKm: 91,  etaMin: 97,  priceJpy: 12000, emoji: "🌏", lat: 35.5456, lng: 139.7802 },
];

// ─────────────────────────────────────────────
// Major Hotels static list (Phase 1.5 — 50 hotels)
// ─────────────────────────────────────────────
const HOTELS: Destination[] = [
  // ── 成田近郊 ──
  { id: "h-narita-excel",    nameJa: "成田エクセルホテル東急",            nameEn: "Narita Excel Hotel Tokyu",            nameZh: "成田东急卓越酒店",        nameKo: "나리타 엑셀 호텔 도큐",           area: "Narita",         distanceKm: 10,  etaMin: 20,  priceJpy: 1800,  emoji: "🏨", lat: 35.7695, lng: 140.3185 },
  { id: "h-narita-hilton",   nameJa: "ヒルトン成田",                      nameEn: "Hilton Tokyo Narita Airport",         nameZh: "成田希尔顿酒店",          nameKo: "힐튼 나리타 공항",                area: "Narita",         distanceKm: 8,   etaMin: 18,  priceJpy: 1800,  emoji: "🏨", lat: 35.7820, lng: 140.3650 },
  { id: "h-narita-apa",      nameJa: "アパホテル成田",                    nameEn: "APA Hotel Narita",                    nameZh: "APA酒店成田",             nameKo: "APA 호텔 나리타",                 area: "Narita",         distanceKm: 10,  etaMin: 20,  priceJpy: 1800,  emoji: "🏨", lat: 35.7710, lng: 140.3198 },
  { id: "h-narita-monterey", nameJa: "ホテルモントレ成田",                nameEn: "Hotel Monterey Narita",               nameZh: "成田蒙特雷酒店",          nameKo: "호텔 몬테레이 나리타",            area: "Narita",         distanceKm: 10,  etaMin: 20,  priceJpy: 1800,  emoji: "🏨", lat: 35.7720, lng: 140.3188 },
  // ── 千葉・舞浜 ──
  { id: "h-hilton-tokyobay", nameJa: "ヒルトン東京ベイ",                  nameEn: "Hilton Tokyo Bay",                    nameZh: "东京湾希尔顿酒店",        nameKo: "힐튼 도쿄 베이",                  area: "Chiba",          distanceKm: 50,  etaMin: 60,  priceJpy: 4200,  emoji: "🏨", lat: 35.6300, lng: 139.8900 },
  { id: "h-sheraton-tb",     nameJa: "シェラトン・グランデ・トーキョーベイ", nameEn: "Sheraton Grande Tokyo Bay",          nameZh: "东京湾喜来登大酒店",      nameKo: "셰라톤 그란데 도쿄 베이",         area: "Chiba",          distanceKm: 51,  etaMin: 62,  priceJpy: 4200,  emoji: "🏨", lat: 35.6296, lng: 139.8873 },
  { id: "h-apa-makuhari",    nameJa: "アパホテル幕張",                    nameEn: "APA Hotel Makuhari",                  nameZh: "APA酒店幕张",             nameKo: "APA 호텔 마쿠하리",               area: "Chiba",          distanceKm: 40,  etaMin: 50,  priceJpy: 3700,  emoji: "🏨", lat: 35.6488, lng: 140.0432 },
  // ── 浅草・上野 ──
  { id: "h-asakusa-view",    nameJa: "浅草ビューホテル",                  nameEn: "Asakusa View Hotel",                  nameZh: "浅草观景酒店",            nameKo: "아사쿠사 뷰 호텔",                area: "East Tokyo",     distanceKm: 58,  etaMin: 65,  priceJpy: 5200,  emoji: "🏨", lat: 35.7189, lng: 139.7956 },
  { id: "h-gate-kaminarimon",nameJa: "ザ・ゲートホテル雷門",              nameEn: "The Gate Hotel Kaminarimon",          nameZh: "雷门之门酒店",            nameKo: "더 게이트 호텔 가미나리몬",       area: "East Tokyo",     distanceKm: 58,  etaMin: 65,  priceJpy: 5200,  emoji: "🏨", lat: 35.7107, lng: 139.7963 },
  { id: "h-ueno-tobu",       nameJa: "上野東武ホテル",                    nameEn: "Ueno Tobu Hotel",                     nameZh: "上野东武酒店",            nameKo: "우에노 도부 호텔",                area: "East Tokyo",     distanceKm: 58,  etaMin: 65,  priceJpy: 5200,  emoji: "🏨", lat: 35.7116, lng: 139.7764 },
  // ── 秋葉原・神田 ──
  { id: "h-dormy-akihabara", nameJa: "ドーミーイン秋葉原",                nameEn: "Dormy Inn Akihabara",                 nameZh: "多米旅馆秋叶原",          nameKo: "도미 인 아키하바라",              area: "East Tokyo",     distanceKm: 60,  etaMin: 68,  priceJpy: 5400,  emoji: "🏨", lat: 35.6989, lng: 139.7731 },
  { id: "h-remm-akihabara",  nameJa: "レム秋葉原",                        nameEn: "Remm Plus Akihabara",                 nameZh: "Remm Plus秋叶原",         nameKo: "렘 플러스 아키하바라",            area: "East Tokyo",     distanceKm: 60,  etaMin: 68,  priceJpy: 5400,  emoji: "🏨", lat: 35.6991, lng: 139.7713 },
  // ── 銀座・丸の内・日本橋 ──
  { id: "h-peninsula",       nameJa: "ザ・ペニンシュラ東京",              nameEn: "The Peninsula Tokyo",                 nameZh: "东京半岛酒店",            nameKo: "더 페닌슐라 도쿄",                area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6755, lng: 139.7600 },
  { id: "h-aman-tokyo",      nameJa: "アマン東京",                        nameEn: "Aman Tokyo",                          nameZh: "东京安缦",                nameKo: "아만 도쿄",                       area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6841, lng: 139.7639 },
  { id: "h-mandarin",        nameJa: "マンダリン オリエンタル 東京",      nameEn: "Mandarin Oriental Tokyo",             nameZh: "东京文华东方酒店",        nameKo: "만다린 오리엔탈 도쿄",            area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6892, lng: 139.7729 },
  { id: "h-palace-tokyo",    nameJa: "パレスホテル東京",                  nameEn: "Palace Hotel Tokyo",                  nameZh: "东京皇宫大酒店",          nameKo: "팰리스 호텔 도쿄",                area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6848, lng: 139.7565 },
  { id: "h-andaz",           nameJa: "アンダーズ 東京",                   nameEn: "Andaz Tokyo Toranomon Hills",         nameZh: "东京虎之门安达仕酒店",    nameKo: "안다즈 도쿄 토라노몬",            area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6684, lng: 139.7494 },
  { id: "h-park-hotel",      nameJa: "パークホテル東京",                  nameEn: "Park Hotel Tokyo",                    nameZh: "东京公园酒店",            nameKo: "파크 호텔 도쿄",                  area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6642, lng: 139.7582 },
  { id: "h-conrad",          nameJa: "コンラッド東京",                    nameEn: "Conrad Tokyo",                        nameZh: "东京康莱德酒店",          nameKo: "콘래드 도쿄",                     area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6628, lng: 139.7568 },
  // ── お台場・有明 ──
  { id: "h-hilton-odaiba",   nameJa: "ヒルトン東京お台場",               nameEn: "Hilton Tokyo Odaiba",                 nameZh: "东京台场希尔顿酒店",      nameKo: "힐튼 도쿄 오다이바",              area: "Central Tokyo",  distanceKm: 67,  etaMin: 75,  priceJpy: 5900,  emoji: "🏨", lat: 35.6272, lng: 139.7762 },
  { id: "h-intercontinental-tb", nameJa: "インターコンチネンタル東京ベイ", nameEn: "InterContinental Tokyo Bay",        nameZh: "东京湾洲际酒店",          nameKo: "인터컨티넨탈 도쿄 베이",          area: "Central Tokyo",  distanceKm: 67,  etaMin: 75,  priceJpy: 5900,  emoji: "🏨", lat: 35.6435, lng: 139.7635 },
  // ── 新宿 ──
  { id: "h-park-hyatt",      nameJa: "パークハイアット東京",              nameEn: "Park Hyatt Tokyo",                    nameZh: "东京柏悦酒店",            nameKo: "파크 하얏트 도쿄",                area: "West Tokyo",     distanceKm: 68,  etaMin: 75,  priceJpy: 6200,  emoji: "🏨", lat: 35.6889, lng: 139.6917 },
  { id: "h-hyatt-regency",   nameJa: "ハイアット リージェンシー 東京",   nameEn: "Hyatt Regency Tokyo",                 nameZh: "东京凯悦酒店",            nameKo: "하얏트 리젠시 도쿄",              area: "West Tokyo",     distanceKm: 68,  etaMin: 75,  priceJpy: 6200,  emoji: "🏨", lat: 35.6950, lng: 139.6915 },
  { id: "h-hilton-shinjuku",  nameJa: "ヒルトン東京",                    nameEn: "Hilton Tokyo (Shinjuku)",             nameZh: "东京希尔顿酒店",          nameKo: "힐튼 도쿄 (신주쿠)",              area: "West Tokyo",     distanceKm: 68,  etaMin: 75,  priceJpy: 6200,  emoji: "🏨", lat: 35.6931, lng: 139.6909 },
  { id: "h-gracery",         nameJa: "ホテルグレイスリー新宿",            nameEn: "Hotel Gracery Shinjuku",              nameZh: "新宿格雷斯利酒店",        nameKo: "호텔 그레이서리 신주쿠",          area: "West Tokyo",     distanceKm: 68,  etaMin: 75,  priceJpy: 6200,  emoji: "🏨", lat: 35.6942, lng: 139.7005 },
  { id: "h-keio-plaza",      nameJa: "京王プラザホテル",                  nameEn: "Keio Plaza Hotel Tokyo",              nameZh: "东京京王广场大酒店",      nameKo: "게이오 플라자 호텔 도쿄",         area: "West Tokyo",     distanceKm: 68,  etaMin: 75,  priceJpy: 6200,  emoji: "🏨", lat: 35.6934, lng: 139.6970 },
  // ── 渋谷 ──
  { id: "h-cerulean",        nameJa: "セルリアンタワー東急ホテル",        nameEn: "Cerulean Tower Tokyu Hotel",          nameZh: "涩谷东急蔚蓝塔酒店",     nameKo: "세루리안 타워 도큐 호텔",         area: "West Tokyo",     distanceKm: 68,  etaMin: 75,  priceJpy: 6200,  emoji: "🏨", lat: 35.6543, lng: 139.6997 },
  { id: "h-trunk",           nameJa: "トランクホテル",                    nameEn: "Trunk Hotel",                         nameZh: "Trunk酒店",               nameKo: "트렁크 호텔",                     area: "West Tokyo",     distanceKm: 68,  etaMin: 75,  priceJpy: 6200,  emoji: "🏨", lat: 35.6622, lng: 139.7079 },
  // ── 六本木・麻布 ──
  { id: "h-ritz-carlton",    nameJa: "ザ・リッツ・カールトン東京",        nameEn: "The Ritz-Carlton Tokyo",              nameZh: "东京丽思卡尔顿酒店",      nameKo: "더 리츠칼튼 도쿄",                area: "West Tokyo",     distanceKm: 65,  etaMin: 72,  priceJpy: 5800,  emoji: "🏨", lat: 35.6658, lng: 139.7307 },
  { id: "h-grand-hyatt",     nameJa: "グランドハイアット東京",            nameEn: "Grand Hyatt Tokyo",                   nameZh: "东京君悦大酒店",          nameKo: "그랜드 하얏트 도쿄",              area: "West Tokyo",     distanceKm: 65,  etaMin: 72,  priceJpy: 5800,  emoji: "🏨", lat: 35.6601, lng: 139.7308 },
  // ── 品川・港南 ──
  { id: "h-tokyo-marriott",  nameJa: "東京マリオットホテル",              nameEn: "Tokyo Marriott Hotel",                nameZh: "东京万豪酒店",            nameKo: "도쿄 메리어트 호텔",              area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6360, lng: 139.7150 },
  { id: "h-shinagawa-prince",nameJa: "品川プリンスホテル",                nameEn: "Shinagawa Prince Hotel",              nameZh: "品川王子大饭店",          nameKo: "시나가와 프린스 호텔",            area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6291, lng: 139.7388 },
  { id: "h-grand-prince-tk", nameJa: "グランドプリンスホテル高輪",        nameEn: "Grand Prince Hotel Takanawa",         nameZh: "高輪格兰王子大酒店",      nameKo: "그랜드 프린스 호텔 다카나와",     area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6356, lng: 139.7330 },
  { id: "h-strings",         nameJa: "ストリングスホテル東京",            nameEn: "The Strings by InterContinental",     nameZh: "东京洲际弦酒店",          nameKo: "더 스트링스 인터컨티넨탈",        area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6273, lng: 139.7403 },
  // ── 目黒・恵比寿 ──
  { id: "h-westin-tokyo",    nameJa: "ウェスティンホテル東京",            nameEn: "The Westin Tokyo",                    nameZh: "东京威斯汀酒店",          nameKo: "더 웨스틴 도쿄",                  area: "West Tokyo",     distanceKm: 66,  etaMin: 73,  priceJpy: 5800,  emoji: "🏨", lat: 35.6461, lng: 139.7145 },
  { id: "h-gajoen",          nameJa: "ホテル雅叙園東京",                  nameEn: "Hotel Gajoen Tokyo",                  nameZh: "雅叙园东京酒店",          nameKo: "호텔 가죠엔 도쿄",                area: "West Tokyo",     distanceKm: 66,  etaMin: 73,  priceJpy: 5800,  emoji: "🏨", lat: 35.6341, lng: 139.7047 },
  // ── 池袋 ──
  { id: "h-metropolitan-ik", nameJa: "ホテルメトロポリタン東京池袋",      nameEn: "Hotel Metropolitan Tokyo Ikebukuro", nameZh: "东京池袋大都会酒店",      nameKo: "호텔 메트로폴리탄 도쿄 이케부쿠로", area: "North Tokyo",  distanceKm: 70,  etaMin: 78,  priceJpy: 6300,  emoji: "🏨", lat: 35.7287, lng: 139.7122 },
  { id: "h-sunshine-prince", nameJa: "サンシャインシティプリンスホテル",  nameEn: "Sunshine City Prince Hotel",          nameZh: "阳光城市王子大饭店",      nameKo: "선샤인 시티 프린스 호텔",         area: "North Tokyo",    distanceKm: 70,  etaMin: 78,  priceJpy: 6300,  emoji: "🏨", lat: 35.7298, lng: 139.7191 },
  // ── 水道橋・後楽園 ──
  { id: "h-tokyo-dome",      nameJa: "東京ドームホテル",                  nameEn: "Tokyo Dome Hotel",                    nameZh: "东京巨蛋酒店",            nameKo: "도쿄 돔 호텔",                    area: "East Tokyo",     distanceKm: 61,  etaMin: 69,  priceJpy: 5400,  emoji: "🏨", lat: 35.7068, lng: 139.7516 },
  // ── 汐留・新橋 ──
  { id: "h-courtyard-new-tbashi", nameJa: "コートヤード・バイ・マリオット東京銀座",  nameEn: "Courtyard Tokyo Ginza Hotel",    nameZh: "东京银座万怡酒店",        nameKo: "코트야드 도쿄 긴자 호텔",         area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6682, lng: 139.7660 },
  // ── 埼玉 ──
  { id: "h-omiya-washington",nameJa: "大宮ワシントンホテル",              nameEn: "Omiya Washington Hotel",              nameZh: "大宫华盛顿大酒店",        nameKo: "오미야 워싱턴 호텔",              area: "Saitama",        distanceKm: 80,  etaMin: 90,  priceJpy: 7300,  emoji: "🏨", lat: 35.9062, lng: 139.6241 },
  { id: "h-ana-crowne-omiya",nameJa: "ANAクラウンプラザホテル大宮",       nameEn: "ANA Crowne Plaza Omiya",              nameZh: "大宫全日空皇冠假日酒店",  nameKo: "ANA 크라운 플라자 오미야",        area: "Saitama",        distanceKm: 80,  etaMin: 90,  priceJpy: 7300,  emoji: "🏨", lat: 35.9088, lng: 139.6247 },
  // ── 横浜 ──
  { id: "h-intercontinental-yh", nameJa: "ヨコハマ グランド インターコンチネンタル", nameEn: "Yokohama Grand InterContinental", nameZh: "横滨洲际大酒店",        nameKo: "요코하마 그랜드 인터컨티넨탈",    area: "Kanagawa",       distanceKm: 90,  etaMin: 100, priceJpy: 7800,  emoji: "🏨", lat: 35.4525, lng: 139.6367 },
  { id: "h-yokohama-royal",  nameJa: "横浜ロイヤルパークホテル",          nameEn: "Yokohama Royal Park Hotel",           nameZh: "横滨皇家公园大酒店",      nameKo: "요코하마 로얄 파크 호텔",         area: "Kanagawa",       distanceKm: 90,  etaMin: 100, priceJpy: 7800,  emoji: "🏨", lat: 35.4554, lng: 139.6317 },
  { id: "h-yokohama-sheraton", nameJa: "横浜ベイシェラトン ホテル&タワーズ", nameEn: "Yokohama Bay Sheraton Hotel",      nameZh: "横滨湾喜来登酒店",        nameKo: "요코하마 베이 셰라톤 호텔",       area: "Kanagawa",       distanceKm: 90,  etaMin: 100, priceJpy: 7800,  emoji: "🏨", lat: 35.4663, lng: 139.6254 },
  { id: "h-new-otani-yh",    nameJa: "ホテルニューグランド",              nameEn: "Hotel New Grand Yokohama",            nameZh: "横滨新格兰大饭店",        nameKo: "호텔 뉴 그랜드 요코하마",         area: "Kanagawa",       distanceKm: 90,  etaMin: 100, priceJpy: 7800,  emoji: "🏨", lat: 35.4451, lng: 139.6436 },
  // ── 追加4件（合計50件） ──
  { id: "h-tokyo-station",   nameJa: "東京ステーションホテル",            nameEn: "The Tokyo Station Hotel",             nameZh: "东京车站大酒店",          nameKo: "더 도쿄 스테이션 호텔",           area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6812, lng: 139.7671 },
  { id: "h-okura-tokyo",     nameJa: "ホテルオークラ東京",                nameEn: "Hotel Okura Tokyo",                   nameZh: "东京大仓酒店",            nameKo: "호텔 오쿠라 도쿄",                area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6698, lng: 139.7424 },
  { id: "h-new-otani-tokyo", nameJa: "ホテルニューオータニ東京",          nameEn: "Hotel New Otani Tokyo",               nameZh: "东京新大谷大饭店",        nameKo: "호텔 뉴 오타니 도쿄",             area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6861, lng: 139.7313 },
  { id: "h-imperial-tokyo",  nameJa: "帝国ホテル 東京",                   nameEn: "Imperial Hotel Tokyo",                nameZh: "东京帝国大酒店",          nameKo: "임페리얼 호텔 도쿄",              area: "Central Tokyo",  distanceKm: 63,  etaMin: 70,  priceJpy: 5700,  emoji: "🏨", lat: 35.6732, lng: 139.7584 },
];

// ─────────────────────────────────────────────
// Rideshare (乗り合わせ) simulated activity
// ─────────────────────────────────────────────
interface RideshareActivity {
  destId: string;
  riders: number;
  savings: number; // JPY
}
const RIDESHARE: RideshareActivity[] = [
  { destId: "shinjuku",  riders: 3, savings: 1800 },
  { destId: "ginza",     riders: 2, savings: 1200 },
  { destId: "asakusa",   riders: 2, savings: 1000 },
  { destId: "akihabara", riders: 1, savings: 600  },
  { destId: "yokohama",  riders: 4, savings: 2400 },
  { destId: "haneda1",   riders: 2, savings: 3000 },
  { destId: "ikebukuro", riders: 1, savings: 700  },
  { destId: "makuhari",  riders: 3, savings: 1400 },
];

// ─────────────────────────────────────────────
// Google Maps helpers
// ─────────────────────────────────────────────
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// ロケール → Google Maps hl パラメーター
const LOCALE_TO_HL: Record<Locale, string> = {
  en: "en", ja: "ja", zh: "zh-CN", ko: "ko",
};

function embedMapUrl(lat: number, lng: number, locale: Locale, zoom = 15): string {
  const hl = LOCALE_TO_HL[locale];
  if (MAPS_API_KEY) {
    return `https://www.google.com/maps/embed/v1/place?key=${MAPS_API_KEY}&q=${lat},${lng}&zoom=${zoom}&language=${hl}`;
  }
  return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&hl=${hl}&output=embed`;
}

function embedRouteUrl(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  locale: Locale,
): string {
  const hl = LOCALE_TO_HL[locale];
  if (MAPS_API_KEY) {
    return `https://www.google.com/maps/embed/v1/directions?key=${MAPS_API_KEY}&origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&language=${hl}`;
  }
  return `https://maps.google.com/maps?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&dirflg=d&hl=${hl}&output=embed`;
}

// ドライバー用: Google Maps ナビ起動 URL（スマホアプリが開く）
function driverNavUrl(
  pickupLat: number, pickupLng: number,
  destLat: number, destLng: number
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${pickupLat},${pickupLng}&destination=${destLat},${destLng}&travelmode=driving`;
}

// AIルート最適化（シミュレーション：実際はGoogle Directions API）
interface RouteSegment {
  from: string;
  to: string;
  distanceKm: number;
  etaMin: number;
  icon: string;
}
function calcAiRoute(
  pickupLat: number, pickupLng: number, pickupLabel: string,
  dest: Destination
): RouteSegment[] {
  // Phase 1: Driver → Pickup (simulated ~3-8 min within Narita)
  const driverToPickup: RouteSegment = {
    from: "Driver current position",
    to: pickupLabel,
    distanceKm: parseFloat((Math.random() * 3 + 1.5).toFixed(1)),
    etaMin: Math.round(Math.random() * 5 + 3),
    icon: "🚐",
  };
  // Phase 2: Pickup → Destination (actual route)
  const pickupToDest: RouteSegment = {
    from: pickupLabel,
    to: dest.nameEn,
    distanceKm: dest.distanceKm,
    etaMin: dest.etaMin,
    icon: "📦",
  };
  return [driverToPickup, pickupToDest];
}

// ─────────────────────────────────────────────
// i18n
// ─────────────────────────────────────────────
const TR = {
  en: {
    brand: "KAIROX", tagline: "Travel Japan hands-free.",
    narita_badge: "Japan Luggage Freedom",
    hero: "Land at Narita. Start exploring. Your luggage meets you at the hotel.",
    hero_sub: "No counter, no cut-off time.",
    step_pickup: "Pickup", step_dest: "Dest.", step_luggage: "Luggage", step_live: "Live",
    pickup_title: "Where are you right now?",
    gps_btn: "Use my GPS location", gps_detecting: "Detecting…", gps_success: "Location detected", gps_fail: "GPS unavailable — choose terminal below",
    or_choose: "Or choose your terminal",
    manual_hint: "Or type any location",
    manual_placeholder: "e.g. T1 Arrivals Hall, Narita Excel Hotel…",
    map_label: "Your pickup location",
    spot_title: "Where exactly are you?",
    spot_hint: "Select your spot",
    dest_title: "Deliver to?",
    dest_from: "from", dest_eta: "est.",
    luggage_title: "Luggage & Payment",
    bags_label: "Number of pieces",
    per_extra: "/ extra piece",
    name_label: "Name", phone_label: "Phone / WhatsApp",
    pay_title: "Payment method",
    pay_credit: "Credit Card", pay_jpyc: "JPYC", pay_usdc: "USDC",
    card_fee_note: "Standard rate — no extra fees", crypto_note: "JPYC / USDC: −5% discount applied",
    summary_pickup: "Pickup", summary_dest: "Delivery", summary_bags: "Pieces", summary_total: "Total",
    total_incl: "Tax included",
    confirm_title: "Confirm & Book",
    confirm_sub: "Tell us where to reach you",
    confirm_book: "Find My Driver",
    confirm_recap: "Order Summary",
    book_btn: "Find Driver",
    matching_title: "Matching your driver…", matching_sub: "AI is calculating the optimal route",
    ai_route_title: "AI Route Plan",
    ai_route_seg1: "Driver → Your location",
    ai_route_seg2: "Pickup → Destination",
    ai_route_total: "Total estimated time",
    matched_title: "Driver matched!", matched_sub: "On the way to your location",
    driver_eta_label: "ETA to pickup",
    pickup_instruction: "Show QR to driver on arrival",
    open_maps: "Open in Google Maps",
    live_title: "Live Tracking",
    live_to_pickup: "Heading to pickup",
    live_loaded: "Luggage loaded — en route to hotel",
    live_done: "Delivered ✓",
    cancel_btn: "Cancel booking", new_btn: "New booking",
    cancel_confirm_title: "Cancel this booking?",
    cancel_confirm_sub: "This cannot be undone.",
    cancel_confirm_yes: "Yes, cancel",
    cancel_confirm_no: "Go back",
    back: "Back", next: "Next",
    pieces: "piece(s)",
    chat_btn: "Chat",
    chat_title: "Support Chat",
    chat_placeholder: "Ask about pickup, pricing, delivery…",
    chat_send: "Send",
    chat_welcome: "Hi! I'm the KAIROX assistant. Ask me anything about pickup spots, pricing, or delivery.",
    closed_title: "Service Hours: 10:00 – 20:00",
    closed_sub: "We're currently outside service hours. Please book again tomorrow from 10:00 AM.",
    closed_chat: "You can still use the chat below for questions.",
    rs_riders: "riders", rs_save: "Save", rs_badge: "Shared", rs_available: "Shared ride available!",
    name_ph: "Your name", phone_ph: "e.g. +1 234 567 8900",
  },
  ja: {
    brand: "KAIROX", tagline: "日本を、手ぶらで。",
    narita_badge: "Japan Luggage Freedom",
    hero: "着いた瞬間から、旅が始まる。",
    hero_sub: "荷物はホテルへ先着。カウンター不要・〆切なし。",
    step_pickup: "場所", step_dest: "届け先", step_luggage: "荷物", step_live: "追跡",
    pickup_title: "今どこにいますか？",
    gps_btn: "GPS で現在地を使う", gps_detecting: "検出中…", gps_success: "現在地を取得しました", gps_fail: "GPS が使えません — 下からターミナルを選択",
    or_choose: "またはターミナルを選択",
    manual_hint: "または場所を直接入力",
    manual_placeholder: "例：第1ターミナル到着口・成田エクセルホテルなど",
    map_label: "集荷場所",
    spot_title: "詳しい場所を教えてください",
    spot_hint: "場所を選択",
    dest_title: "どこへ届けますか？",
    dest_from: "から", dest_eta: "目安",
    luggage_title: "荷物と支払い",
    bags_label: "個数",
    per_extra: "/ 追加1個",
    name_label: "お名前", phone_label: "電話 / WhatsApp",
    pay_title: "お支払い方法",
    pay_credit: "クレジットカード", pay_jpyc: "JPYC", pay_usdc: "USDC",
    card_fee_note: "標準料金 — 追加手数料なし", crypto_note: "JPYC / USDC：−5%割引適用",
    summary_pickup: "集荷場所", summary_dest: "配達先", summary_bags: "個数", summary_total: "合計",
    total_incl: "税込み",
    confirm_title: "確認と予約",
    confirm_sub: "ご連絡先を教えてください",
    confirm_book: "ドライバーを探す",
    confirm_recap: "注文内容",
    book_btn: "ドライバーを探す",
    matching_title: "ドライバーを探しています…", matching_sub: "AIが最適ルートを計算中",
    ai_route_title: "AI ルート最適化",
    ai_route_seg1: "ドライバー → 集荷場所",
    ai_route_seg2: "集荷 → 目的地",
    ai_route_total: "合計予想時間",
    matched_title: "マッチしました！", matched_sub: "ドライバーが向かっています",
    driver_eta_label: "集荷までの目安",
    pickup_instruction: "到着時にQRコードをドライバーに提示",
    open_maps: "Google マップで開く",
    live_title: "ライブ追跡",
    live_to_pickup: "集荷場所へ移動中",
    live_loaded: "積み込み完了 — 目的地へ向かっています",
    live_done: "配達完了 ✓",
    cancel_btn: "予約をキャンセル", new_btn: "新しい予約",
    cancel_confirm_title: "予約をキャンセルしますか？",
    cancel_confirm_sub: "この操作は元に戻せません。",
    cancel_confirm_yes: "キャンセルする",
    cancel_confirm_no: "戻る",
    back: "戻る", next: "次へ",
    pieces: "個",
    chat_btn: "チャット",
    chat_title: "サポートチャット",
    chat_placeholder: "集荷場所・料金・配達についてご質問どうぞ",
    chat_send: "送信",
    chat_welcome: "こんにちは！KAIROXサポートです。集荷場所・料金・配達など何でもお気軽にどうぞ。",
    closed_title: "受付時間：10:00 〜 20:00",
    closed_sub: "現在は受付時間外です。明日10:00以降に再度お試しください。",
    closed_chat: "ご質問はチャットでお気軽にどうぞ。",
    rs_riders: "人相乗り", rs_save: "節約", rs_badge: "相乗り", rs_available: "相乗りチャンス！",
    name_ph: "お名前を入力", phone_ph: "例）+81 90-0000-0000",
  },
  zh: {
    brand: "KAIROX", tagline: "畅游日本，轻装出行。",
    narita_badge: "Japan Luggage Freedom",
    hero: "抵达成田，立刻出发。行李先到酒店。", hero_sub: "无需柜台，无截止时间。",
    step_pickup: "取件", step_dest: "目的地", step_luggage: "行李", step_live: "追踪",
    pickup_title: "您现在在哪里？",
    gps_btn: "使用GPS定位", gps_detecting: "定位中…", gps_success: "已获取位置", gps_fail: "GPS不可用 — 请选择航站楼",
    or_choose: "或选择航站楼",
    manual_hint: "或手动输入位置",
    manual_placeholder: "如：T1到达大厅、成田万怡酒店…",
    map_label: "取件地点",
    spot_title: "您具体在哪里？",
    spot_hint: "选择地点",
    dest_title: "送往哪里？",
    dest_from: "起", dest_eta: "预计",
    luggage_title: "行李与付款", bags_label: "件数", per_extra: "/ 每增加1件",
    name_label: "姓名", phone_label: "电话 / WhatsApp",
    pay_title: "支付方式", pay_credit: "信用卡", pay_jpyc: "JPYC", pay_usdc: "USDC",
    card_fee_note: "标准费率 — 无额外手续费", crypto_note: "JPYC / USDC：享受−5%折扣",
    summary_pickup: "取件地点", summary_dest: "送达地点", summary_bags: "件数", summary_total: "合计",
    total_incl: "含税",
    confirm_title: "确认预订",
    confirm_sub: "请提供您的联系方式",
    confirm_book: "寻找司机",
    confirm_recap: "订单摘要",
    book_btn: "寻找司机",
    matching_title: "正在寻找司机…", matching_sub: "AI正在计算最优路线",
    ai_route_title: "AI 路线优化",
    ai_route_seg1: "司机 → 取件地点",
    ai_route_seg2: "取件 → 目的地",
    ai_route_total: "预计总用时",
    matched_title: "匹配成功！", matched_sub: "司机正在赶来",
    driver_eta_label: "预计取件时间",
    pickup_instruction: "司机到达时出示二维码",
    open_maps: "在谷歌地图中打开",
    live_title: "实时追踪", live_to_pickup: "前往取件地点", live_loaded: "行李已装车 — 前往酒店", live_done: "已送达 ✓",
    cancel_btn: "取消预订", new_btn: "新的预订",
    cancel_confirm_title: "确认取消预订？",
    cancel_confirm_sub: "此操作无法撤销。",
    cancel_confirm_yes: "确认取消",
    cancel_confirm_no: "返回",
    back: "返回", next: "下一步", pieces: "件",
    chat_btn: "聊天",
    chat_title: "客服聊天",
    chat_placeholder: "询问取件地点、价格、配送…",
    chat_send: "发送",
    chat_welcome: "您好！我是KAIROX助手。关于取件地点、价格或配送，有什么需要帮助的吗？",
    closed_title: "服务时间：10:00 〜 20:00",
    closed_sub: "当前不在服务时间内。请明天10:00后再试。",
    closed_chat: "如有疑问，欢迎使用下方聊天功能。",
    rs_riders: "人拼车", rs_save: "省", rs_badge: "拼车", rs_available: "可拼车！",
    name_ph: "请输入姓名", phone_ph: "例如 +86 138 0000 0000",
  },
  ko: {
    brand: "KAIROX", tagline: "일본을 손 가볍게.",
    narita_badge: "Japan Luggage Freedom",
    hero: "나리타 도착, 바로 여행 시작. 짐은 호텔에서 만나요.", hero_sub: "카운터 불필요, 마감 없음.",
    step_pickup: "위치", step_dest: "목적지", step_luggage: "짐", step_live: "추적",
    pickup_title: "지금 어디 계세요?",
    gps_btn: "GPS 위치 사용", gps_detecting: "감지 중…", gps_success: "위치 감지 완료", gps_fail: "GPS 사용 불가 — 터미널을 선택하세요",
    or_choose: "또는 터미널 선택",
    manual_hint: "또는 직접 입력",
    manual_placeholder: "예: 제1터미널 도착 로비, 나리타 호텔…",
    map_label: "픽업 위치",
    spot_title: "정확히 어디 계세요?",
    spot_hint: "장소 선택",
    dest_title: "어디로 배송할까요?",
    dest_from: "부터", dest_eta: "예상",
    luggage_title: "짐 & 결제", bags_label: "개수", per_extra: "/ 추가 1개당",
    name_label: "이름", phone_label: "전화 / WhatsApp",
    pay_title: "결제 방법", pay_credit: "신용카드", pay_jpyc: "JPYC", pay_usdc: "USDC",
    card_fee_note: "기본 요금 — 추가 수수료 없음", crypto_note: "JPYC / USDC：−5% 할인 적용",
    summary_pickup: "픽업 장소", summary_dest: "배송지", summary_bags: "개수", summary_total: "합계",
    total_incl: "세금 포함",
    confirm_title: "확인 및 예약",
    confirm_sub: "연락처를 알려주세요",
    confirm_book: "드라이버 찾기",
    confirm_recap: "주문 요약",
    book_btn: "드라이버 찾기",
    matching_title: "드라이버 매칭 중…", matching_sub: "AI가 최적 경로 계산 중",
    ai_route_title: "AI 경로 최적화",
    ai_route_seg1: "드라이버 → 픽업 위치",
    ai_route_seg2: "픽업 → 목적지",
    ai_route_total: "예상 총 시간",
    matched_title: "매칭 완료!", matched_sub: "드라이버가 오고 있습니다",
    driver_eta_label: "픽업까지 예상 시간",
    pickup_instruction: "드라이버 도착 시 QR 코드 제시",
    open_maps: "구글 지도로 열기",
    live_title: "실시간 추적", live_to_pickup: "픽업 장소로 이동 중", live_loaded: "짐 적재 완료 — 호텔로 이동 중", live_done: "배송 완료 ✓",
    cancel_btn: "예약 취소", new_btn: "새 예약",
    cancel_confirm_title: "예약을 취소할까요?",
    cancel_confirm_sub: "이 작업은 되돌릴 수 없습니다.",
    cancel_confirm_yes: "취소하기",
    cancel_confirm_no: "돌아가기",
    back: "뒤로", next: "다음", pieces: "개",
    chat_btn: "채팅",
    chat_title: "고객 지원 채팅",
    chat_placeholder: "픽업 장소, 요금, 배송에 대해 문의하세요…",
    chat_send: "전송",
    chat_welcome: "안녕하세요! KAIROX 어시스턴트입니다. 픽업 장소, 요금, 배송에 대해 무엇이든 물어보세요.",
    closed_title: "운영 시간: 10:00 〜 20:00",
    closed_sub: "현재 운영 시간이 아닙니다. 내일 10:00 이후에 다시 시도해 주세요.",
    closed_chat: "질문이 있으시면 아래 채팅을 이용해 주세요.",
    rs_riders: "명 합승", rs_save: "절약", rs_badge: "합승", rs_available: "합승 가능!",
    name_ph: "이름을 입력하세요", phone_ph: "예) +82 10-0000-0000",
  },
} as const;

type Tr = { [K in keyof typeof TR.en]: string };

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ja", label: "JA" },
  { value: "zh", label: "中" },
  { value: "ko", label: "한" },
];

const EXTRA_BAG = 1500;
const CARD_FEE = 0;
const CRYPTO_DISC = 0.05;

const OPERATOR = { name: "KAIROX Driver", car: "Toyota HiAce", rating: "5.0", initial: "K" };

const SERVICE_OPEN_HOUR = 10;
const SERVICE_CLOSE_HOUR = 20;

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function PulseDots() {
  return (
    <span className="inline-flex gap-1 ml-1 align-middle">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"
          style={{ animation: `kxPulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
      ))}
    </span>
  );
}

function StepBar({ step, tr }: { step: Step; tr: Tr }) {
  const STEPS: Step[] = ["pickup", "destination", "luggage", "live"];
  const labels = [tr.step_pickup, tr.step_dest, tr.step_luggage, tr.step_live];
  const idx = (step === "matching" || step === "confirm") ? 2 : STEPS.indexOf(step);
  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((s, i) => {
        const done = i < idx, active = i === idx;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${done ? "bg-amber-500 text-gray-950" : active ? "bg-amber-500 text-gray-950 ring-4 ring-amber-500/30" : "bg-gray-800 border border-gray-700 text-gray-600"}`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[9px] mt-0.5 whitespace-nowrap ${active ? "text-amber-400 font-semibold" : "text-gray-600"}`}>{labels[i]}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mb-3.5 mx-1 ${done ? "bg-amber-500" : "bg-gray-800"}`} />}
          </div>
        );
      })}
    </div>
  );
}

// Google Map embed — pickup location
function MapPickup({ lat, lng, label, locale }: { lat: number; lng: number; label: string; locale: Locale }) {
  const src = embedMapUrl(lat, lng, locale, 16);
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold flex items-center gap-1">
        📍 {label}
        {!MAPS_API_KEY && (
          <span className="text-[9px] text-amber-600/70 normal-case">(APIキー未設定 — プロト表示)</span>
        )}
      </p>
      <div className="rounded-xl overflow-hidden border border-gray-700 h-44">
        <iframe
          src={src}
          className="w-full h-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Pickup location map"
        />
      </div>
    </div>
  );
}

// Google Map embed — route
function MapRoute({
  pickupLat, pickupLng,
  destLat, destLng,
  label,
  locale,
}: {
  pickupLat: number; pickupLng: number;
  destLat: number; destLng: number;
  label: string;
  locale: Locale;
}) {
  const src = embedRouteUrl(pickupLat, pickupLng, destLat, destLng, locale);
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">🗺 {label}</p>
      <div className="rounded-xl overflow-hidden border border-gray-700 h-52">
        <iframe
          src={src}
          className="w-full h-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Delivery route map"
        />
      </div>
    </div>
  );
}

// Radar animation for matching
function RadarPulse() {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center mx-auto">
      {[1, 2, 3].map((ring) => (
        <div key={ring} className="absolute rounded-full border border-amber-500/40"
          style={{ width: `${ring * 40}px`, height: `${ring * 40}px`, animation: `kxPing ${1 + ring * 0.3}s ease-out infinite`, opacity: 1 / ring }} />
      ))}
      <div className="relative z-10 w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-2xl">🚐</div>
    </div>
  );
}

// AI Route Plan card
function AiRoutePlan({ route, tr }: { route: RouteSegment[]; tr: Tr }) {
  const totalMin = route.reduce((a, s) => a + s.etaMin, 0);
  return (
    <div className="bg-gray-800/60 border border-amber-800/40 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
          <span className="text-sm">🤖</span> {tr.ai_route_title}
        </p>
        <span className="text-[9px] bg-amber-950 border border-amber-700 text-amber-400 px-2 py-0.5 rounded-full font-bold">AI</span>
      </div>
      {route.map((seg, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">{seg.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-300 font-medium truncate">{i === 0 ? tr.ai_route_seg1 : tr.ai_route_seg2}</p>
            <p className="text-[10px] text-gray-600 truncate">{seg.from} → {seg.to}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold text-white">{seg.etaMin}min</p>
            <p className="text-[10px] text-gray-600">{seg.distanceKm}km</p>
          </div>
        </div>
      ))}
      <div className="border-t border-gray-700 pt-2 flex items-center justify-between">
        <p className="text-[11px] text-gray-500">{tr.ai_route_total}</p>
        <p className="text-sm font-bold text-amber-300">~{totalMin} min</p>
      </div>
    </div>
  );
}

// Live Tracker
function LiveTracker({ dest, pickupLat, pickupLng, pickupLabel, locale, tr, onReset, onCancel }: {
  dest: Destination; pickupLat: number; pickupLng: number; pickupLabel: string;
  locale: Locale; tr: Tr; onReset: () => void; onCancel: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const destName = locale === "ja" ? dest.nameJa : locale === "zh" ? dest.nameZh : locale === "ko" ? dest.nameKo : dest.nameEn;

  useEffect(() => {
    const iv = setInterval(() => setProgress((p) => Math.min(100, p + 0.6)), 150);
    return () => clearInterval(iv);
  }, []);

  const phase = progress < 33 ? 0 : progress < 66 ? 1 : progress < 100 ? 2 : 3;
  const routeSteps = [
    { label: tr.live_to_pickup, icon: "🚐" },
    { label: tr.live_loaded, icon: "📦" },
    { label: tr.live_done, icon: "🏨" },
  ];

  const navUrl = driverNavUrl(pickupLat, pickupLng, dest.lat, dest.lng);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{tr.live_title}</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900 border border-green-700 text-green-400 font-bold" style={{ animation: "kxPulse 2s ease-in-out infinite" }}>LIVE</span>
      </div>

      {/* Route map */}
      <MapRoute pickupLat={pickupLat} pickupLng={pickupLng} destLat={dest.lat} destLng={dest.lng} label={`${pickupLabel} → ${destName}`} locale={locale} />

      {/* Driver nav button */}
      <a href={navUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-blue-700/60 bg-blue-950/30 text-blue-300 text-sm font-semibold hover:bg-blue-950/50 transition-colors">
        <span>🗺</span> {tr.open_maps}
      </a>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-600">
          <span>{pickupLabel}</span>
          <span>{destName}</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {routeSteps.map((s, i) => {
          const done = i < phase, active = i === phase && phase < 3;
          return (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${done ? "border-gray-700 bg-gray-800/30 opacity-50" : active ? "border-amber-500 bg-amber-950/40" : "border-gray-800 bg-gray-900/30 opacity-30"}`}>
              <span className="text-xl">{s.icon}</span>
              <p className={`text-sm flex-1 ${done ? "line-through text-gray-600" : "text-white font-medium"}`}>{s.label}</p>
              {done && <span className="text-amber-500 font-bold">✓</span>}
              {active && <PulseDots />}
            </div>
          );
        })}
      </div>

      {phase >= 3 ? (
        <div className="text-center space-y-4 py-2">
          <div className="text-5xl">🎉</div>
          <p className="text-lg font-bold text-white">{tr.live_done}</p>
          <button onClick={onReset} className="w-full py-3 rounded-xl bg-amber-500 text-gray-950 font-bold text-sm hover:bg-amber-400 transition-colors">{tr.new_btn}</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">{tr.driver_eta_label}</span>
            <span className="text-xl font-bold text-white tabular-nums">~{Math.max(1, Math.ceil((100 - progress) / 2))} min</span>
          </div>
          <button type="button" onClick={onCancel}
            className="w-full py-2.5 rounded-xl border border-red-800/50 text-red-400 text-xs font-semibold hover:bg-red-950/30 transition-colors">
            {tr.cancel_btn}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Rideshare Ticker (横スクロールテロップ)
// ─────────────────────────────────────────────
function RideShareTicker({ locale, tr }: { locale: Locale; tr: Tr }) {
  const items = RIDESHARE.map((rs) => {
    const dest = DESTINATIONS.find((d) => d.id === rs.destId);
    if (!dest) return null;
    const name = locale === "ja" ? dest.nameJa : locale === "zh" ? dest.nameZh : locale === "ko" ? dest.nameKo : dest.nameEn;
    return `🚐 ${rs.riders}${tr.rs_riders} · ${name} · ${tr.rs_save} ¥${rs.savings.toLocaleString()}`;
  }).filter(Boolean) as string[];

  const text = items.join("  　  ");

  return (
    <div className="bg-amber-950/40 border-b border-amber-800/30 overflow-hidden h-7 flex items-center">
      <div className="flex whitespace-nowrap" style={{ animation: "kxTicker 28s linear infinite" }}>
        <span className="text-[11px] text-amber-300/80 pr-16">{text}</span>
        <span className="text-[11px] text-amber-300/80 pr-16">{text}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Rideshare Toast (フローティング通知)
// ─────────────────────────────────────────────
function RideshareToast({ locale, tr, onJoin }: { locale: Locale; tr: Tr; onJoin?: (destId: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // 最初は5秒後、その後10秒ごとに次のアイテムを表示
    const show = () => {
      setVisible(true);
      const hide = setTimeout(() => setVisible(false), 5000);
      return hide;
    };

    const first = setTimeout(() => {
      show();
      const interval = setInterval(() => {
        setIdx((i) => (i + 1) % RIDESHARE.length);
        show();
      }, 12000);
      return () => clearInterval(interval);
    }, 5000);

    return () => clearTimeout(first);
  }, []);

  const rs = RIDESHARE[idx];
  const dest = DESTINATIONS.find((d) => d.id === rs.destId);
  if (!dest) return null;
  const name = locale === "ja" ? dest.nameJa : locale === "zh" ? dest.nameZh : locale === "ko" ? dest.nameKo : dest.nameEn;

  return (
    <div
      className="fixed bottom-24 left-4 z-40 max-w-[220px] transition-all duration-500"
      style={{ transform: visible ? "translateY(0)" : "translateY(140%)", opacity: visible ? 1 : 0 }}
    >
      <div className="bg-gray-900 border border-amber-700/60 rounded-2xl p-3 shadow-xl space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🚐</span>
          <p className="text-[11px] font-bold text-amber-300">{tr.rs_available}</p>
        </div>
        <p className="text-xs text-white font-semibold">{name}</p>
        <p className="text-[10px] text-gray-400">
          {rs.riders}{tr.rs_riders} · {tr.rs_save} <span className="text-green-400 font-bold">¥{rs.savings.toLocaleString()}</span>
        </p>
        {onJoin && (
          <button
            type="button"
            onClick={() => { setVisible(false); onJoin(rs.destId); }}
            className="w-full py-1.5 rounded-lg bg-amber-500 text-gray-950 text-[11px] font-bold hover:bg-amber-400 transition-colors"
          >
            {tr.rs_badge} →
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Chat Widget
// ─────────────────────────────────────────────
interface ChatMessage { role: "user" | "assistant"; content: string }

function ChatWidget({ locale, tr }: { locale: Locale; tr: Tr }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useCallback((el: HTMLDivElement | null) => { el?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.text ?? "Sorry, something went wrong." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry, chat is temporarily unavailable." }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-amber-500 text-gray-950 shadow-lg flex items-center justify-center text-2xl hover:bg-amber-400 transition-all"
        aria-label="Open chat"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "420px" }}>
          {/* Header */}
          <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700 flex-shrink-0">
            <span className="text-amber-400 text-lg">🤖</span>
            <p className="text-sm font-bold text-white">{tr.chat_title}</p>
            <span className="ml-auto text-[9px] bg-green-900 border border-green-700 text-green-400 px-2 py-0.5 rounded-full font-bold">AI</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {/* Welcome message */}
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🤖</div>
              <div className="bg-gray-800 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                <p className="text-xs text-gray-200 leading-relaxed">{tr.chat_welcome}</p>
              </div>
            </div>

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🤖</div>
                )}
                <div className={`rounded-xl px-3 py-2 max-w-[85%] ${m.role === "user" ? "bg-amber-500 text-gray-950 rounded-tr-sm" : "bg-gray-800 text-gray-200 rounded-tl-sm"}`}>
                  <p className="text-xs leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
                <div className="bg-gray-800 rounded-xl rounded-tl-sm px-3 py-2">
                  <PulseDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-700 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={tr.chat_placeholder}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <button type="button" onClick={send} disabled={!input.trim() || loading}
              className="px-3 py-2 rounded-xl bg-amber-500 text-gray-950 text-xs font-bold hover:bg-amber-400 transition-colors disabled:opacity-40 flex-shrink-0">
              {tr.chat_send}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
export default function NaritaApp() {
  const [locale, setLocale] = useState<Locale>("en");
  const [step, setStep] = useState<Step>("pickup");

  // Service hours check
  const nowHour = new Date().getHours();
  const isOpen = nowHour >= SERVICE_OPEN_HOUR && nowHour < SERVICE_CLOSE_HOUR;

  // Pickup
  const [gpsStatus, setGpsStatus] = useState<"idle" | "detecting" | "ok" | "fail">("idle");
  const [gpsCoord, setGpsCoord] = useState<GpsCoord | null>(null);
  const [terminal, setTerminal] = useState("T1");
  const [spot, setSpot] = useState<string>("t1-arrival");
  const [manualLoc, setManualLoc] = useState("");

  // Destination
  const [dest, setDest] = useState<Destination | null>(null);
  const [destMode, setDestMode] = useState<"area" | "hotel">("area");
  const [hotelSearch, setHotelSearch] = useState("");

  // Active drivers
  const [activeDrivers, setActiveDrivers] = useState<number | null>(null);
  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/drivers-active`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.count !== undefined) setActiveDrivers(d.count); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Luggage + payment
  const [bags, setBags] = useState(1);
  const [payMethod, setPayMethod] = useState<PayMethod>("credit");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Cancel
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Matching
  const [matchPhase, setMatchPhase] = useState<"searching" | "found">("searching");
  const [aiRoute, setAiRoute] = useState<RouteSegment[]>([]);
  const [bookingId, setBookingId] = useState("NRT-" + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [bookingLoading, setBookingLoading] = useState(false);
  const [aiConfirmMsg, setAiConfirmMsg] = useState("");

  const tr = TR[locale];
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

  // Derived pickup coords + label
  const terminalData = NARITA_TERMINALS.find((t) => t.id === terminal) ?? NARITA_TERMINALS[0];
  const pickupLat = gpsCoord?.lat ?? terminalData.lat;
  const pickupLng = gpsCoord?.lng ?? terminalData.lng;
  const terminalSpot = terminalData.spots.find((s) => s.id === spot) ?? terminalData.spots[0];
  const spotLabel = locale === "ja" ? terminalSpot.ja : locale === "zh" ? terminalSpot.zh : locale === "ko" ? terminalSpot.ko : terminalSpot.en;
  const pickupLabel =
    gpsStatus === "ok" && gpsCoord ? `GPS (${gpsCoord.lat.toFixed(4)}, ${gpsCoord.lng.toFixed(4)})` :
    manualLoc.trim() ? manualLoc.trim() :
    `${terminalData.labelEn} — ${spotLabel}`;

  // Price
  const base = dest ? dest.priceJpy + (bags - 1) * EXTRA_BAG : 0;
  const cryptoDisc = payMethod !== "credit" ? Math.floor(base * CRYPTO_DISC) : 0;
  const afterDisc = base - cryptoDisc;
  const cardFee = payMethod === "credit" ? Math.floor(afterDisc * CARD_FEE) : 0;
  const total = afterDisc + cardFee;

  // GPS
  function handleGps() {
    if (!navigator.geolocation) { setGpsStatus("fail"); return; }
    setGpsStatus("detecting");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsCoord({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus("ok"); },
      () => setGpsStatus("fail"),
      { timeout: 8000 }
    );
  }

  // Matching timer + AI route calc
  useEffect(() => {
    if (step !== "matching") return;
    setMatchPhase("searching");
    if (dest) {
      const route = calcAiRoute(pickupLat, pickupLng, pickupLabel, dest);
      setAiRoute(route);
    }
    const t = setTimeout(() => setMatchPhase("found"), 3500);
    return () => clearTimeout(t);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const canNext =
    step === "pickup" ? true :
    step === "destination" ? !!dest :
    step === "luggage" ? bags > 0 :
    step === "confirm" ? name.trim().length > 0 :
    step === "matching" ? matchPhase === "found" :
    false;

  function next() {
    if (step === "pickup") setStep("destination");
    else if (step === "destination") setStep("luggage");
    else if (step === "luggage") setStep("confirm");
    else if (step === "matching" && matchPhase === "found") setStep("live");
  }
  function back() {
    if (step === "destination") setStep("pickup");
    else if (step === "luggage") setStep("destination");
    else if (step === "confirm") setStep("luggage");
  }
  function reset() {
    setStep("pickup"); setGpsStatus("idle"); setGpsCoord(null); setManualLoc(""); setTerminal("T1"); setSpot("t1-arrival");
    setDest(null); setDestMode("area"); setHotelSearch(""); setBags(1); setPayMethod("credit"); setName(""); setPhone(""); setMatchPhase("searching");
    setBookingId("NRT-" + Math.random().toString(36).slice(2, 8).toUpperCase());
  }

  async function cancelBooking() {
    setCancelLoading(true);
    try {
      await fetch(`/api/booking?id=${encodeURIComponent(bookingId)}`, { method: "DELETE" });
    } catch {
      // フォールバック: フロントエンドのみリセット
    }
    setCancelLoading(false);
    setShowCancelModal(false);
    reset();
  }

  async function submitBooking() {
    if (!dest || bookingLoading) return;
    setBookingLoading(true);
    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Guest",
          email: "",
          phone,
          locale,
          plan: "solo",
          extra_bags: Math.max(0, bags - 1),
          pickup_location: pickupLabel,
          destination: destName,
          zone: "narita",
          hotel_name: destName,
          pay_method: payMethod,
          total_amount: total,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.booking_id) setBookingId(data.booking_id);
        if (data.ai_message) setAiConfirmMsg(data.ai_message);
      }
    } catch {
      // Keep frontend-generated ID as fallback
    }
    setBookingLoading(false);
    setStep("matching");
  }

  const destName = dest ? (locale === "ja" ? dest.nameJa : locale === "zh" ? dest.nameZh : locale === "ko" ? dest.nameKo : dest.nameEn) : "";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Header */}
      <header className="bg-[#0A0F1C] border-b border-white/10 sticky top-0 z-20" style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.4)" }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-wider text-white">{tr.brand}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">{tr.narita_badge}</span>
            </div>
            <p className="text-[10px] text-amber-400/70 leading-none mt-0.5">{tr.tagline}</p>
          </div>
          <div className="flex items-center gap-0.5">
            {LOCALES.map((l) => (
              <button key={l.value} type="button" onClick={() => setLocale(l.value)}
                className={`px-2 py-1 rounded-md text-xs transition-all ${locale === l.value ? "bg-amber-500 text-gray-950 font-semibold" : "text-gray-500 hover:text-gray-300"}`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Rideshare Ticker */}
      <RideShareTicker locale={locale} tr={tr} />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5">

        {/* Hero */}
        {step === "pickup" && (
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white leading-tight">{tr.hero}</h1>
            <p className="text-sm text-gray-400">{tr.hero_sub}</p>
          </div>
        )}

        {/* Closed banner */}
        {!isOpen && step === "pickup" && (
          <div className="bg-gray-800 border border-gray-600 rounded-2xl p-5 space-y-2 text-center">
            <p className="text-2xl">🌙</p>
            <p className="text-base font-bold text-white">{tr.closed_title}</p>
            <p className="text-sm text-gray-400">{tr.closed_sub}</p>
            <p className="text-xs text-amber-400 mt-1">{tr.closed_chat}</p>
          </div>
        )}

        {/* Step bar */}
        {step !== "live" && <StepBar step={step} tr={tr} />}

        {/* ─── STEP: PICKUP ─── */}
        {step === "pickup" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-white">{tr.pickup_title}</h2>
            </div>

            {/* Active drivers */}
            {activeDrivers !== null && (
              <div className="flex items-center justify-center gap-2 text-[11px] rounded-full px-3 py-1.5 border border-green-800/40 bg-green-950/30 text-green-300">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" style={{ animation: "kxPulse 2s ease-in-out infinite" }} />
                {activeDrivers > 0
                  ? `${activeDrivers} driver${activeDrivers > 1 ? "s" : ""} active nearby`
                  : "Connecting drivers — please wait"}
              </div>
            )}

            {/* GPS button */}
            <button type="button" onClick={handleGps} disabled={gpsStatus === "detecting"}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                gpsStatus === "ok" ? "border-green-500 bg-green-950/30 text-green-300" :
                gpsStatus === "fail" ? "border-gray-700 bg-gray-800/50 text-gray-500" :
                gpsStatus === "detecting" ? "border-amber-600 bg-amber-950/20 text-amber-300 cursor-wait" :
                "border-amber-500 bg-amber-950/30 text-amber-200 hover:bg-amber-950/50"
              }`}>
              <span className="text-xl">{gpsStatus === "ok" ? "✅" : gpsStatus === "fail" ? "📵" : gpsStatus === "detecting" ? "🔍" : "📍"}</span>
              <span>{gpsStatus === "detecting" ? tr.gps_detecting : gpsStatus === "ok" ? tr.gps_success : gpsStatus === "fail" ? tr.gps_fail : tr.gps_btn}</span>
              {gpsStatus === "detecting" && <PulseDots />}
            </button>

            {/* Map: show when GPS detected */}
            {gpsStatus === "ok" && gpsCoord && (
              <MapPickup lat={gpsCoord.lat} lng={gpsCoord.lng} label={tr.map_label} locale={locale} />
            )}

            {/* Terminal selector */}
            {gpsStatus !== "ok" && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">{tr.or_choose}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {NARITA_TERMINALS.map((t) => (
                    <button key={t.id} type="button" onClick={() => { setTerminal(t.id); setSpot(t.spots[0].id); setManualLoc(""); }}
                      className={`px-2 py-2.5 rounded-xl border text-left transition-all ${terminal === t.id ? "border-amber-500 bg-amber-950/40" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"}`}>
                      <p className={`text-xs font-semibold leading-tight ${terminal === t.id ? "text-amber-300" : "text-gray-300"}`}>{t.labelEn}</p>
                      <p className="text-[9px] text-gray-600 mt-0.5 leading-tight">{t.hint}</p>
                    </button>
                  ))}
                </div>

                {/* Spot selector */}
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500">{tr.spot_title}</p>
                  <div className="space-y-1.5">
                    {terminalData.spots.map((s) => {
                      const label = locale === "ja" ? s.ja : locale === "zh" ? s.zh : locale === "ko" ? s.ko : s.en;
                      const active = spot === s.id;
                      return (
                        <button key={s.id} type="button" onClick={() => { setSpot(s.id); setManualLoc(""); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${active ? "border-amber-500 bg-amber-950/40" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"}`}>
                          <span className="text-base flex-shrink-0">{s.icon}</span>
                          <span className={`text-xs font-medium leading-tight ${active ? "text-amber-300" : "text-gray-300"}`}>{label}</span>
                          {active && <span className="ml-auto text-amber-500 text-xs flex-shrink-0">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Manual input */}
            <div className="space-y-1">
              <p className="text-xs text-gray-500">{tr.manual_hint}</p>
              <input type="text" value={manualLoc}
                onChange={(e) => { setManualLoc(e.target.value); setGpsStatus("idle"); setGpsCoord(null); }}
                placeholder={tr.manual_placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* ─── STEP: DESTINATION ─── */}
        {step === "destination" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-bold text-white">{tr.dest_title}</h2>

            {/* エリア / ホテル名 タブ */}
            <div className="flex gap-1.5 bg-gray-800 p-1 rounded-xl">
              {(["area", "hotel"] as const).map((mode) => (
                <button key={mode} type="button"
                  onClick={() => { setDestMode(mode); setHotelSearch(""); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${destMode === mode ? "bg-amber-500 text-gray-950" : "text-gray-400 hover:text-gray-200"}`}>
                  {mode === "area"
                    ? (locale === "ja" ? "エリアで選ぶ" : locale === "zh" ? "按区域" : locale === "ko" ? "지역 선택" : "By Area")
                    : (locale === "ja" ? "ホテル名で検索" : locale === "zh" ? "按酒店名" : locale === "ko" ? "호텔 검색" : "Hotel Search")}
                </button>
              ))}
            </div>

            {/* ホテル検索 */}
            {destMode === "hotel" && (
              <input
                type="text"
                value={hotelSearch}
                onChange={(e) => setHotelSearch(e.target.value)}
                placeholder={locale === "ja" ? "ホテル名を入力…" : locale === "zh" ? "输入酒店名…" : locale === "ko" ? "호텔명 입력…" : "Search hotel name…"}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
                autoFocus
              />
            )}

            {/* リスト */}
            {(destMode === "area" ? DESTINATIONS : HOTELS.filter((h) => {
              if (!hotelSearch.trim()) return true;
              const q = hotelSearch.toLowerCase();
              return h.nameEn.toLowerCase().includes(q) || h.nameJa.includes(hotelSearch) || h.nameZh.includes(hotelSearch) || h.nameKo.includes(hotelSearch) || h.area.toLowerCase().includes(q);
            })).map((d) => {
              const active = dest?.id === d.id;
              const dName = locale === "ja" ? d.nameJa : locale === "zh" ? d.nameZh : locale === "ko" ? d.nameKo : d.nameEn;
              const rs = destMode === "area" ? RIDESHARE.find((r) => r.destId === d.id) : null;
              return (
                <button key={d.id} type="button" onClick={() => setDest(d)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${active ? "border-amber-500 bg-amber-950/40" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"}`}>
                  <span className="text-2xl flex-shrink-0">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-sm font-semibold leading-tight ${active ? "text-amber-300" : "text-gray-200"}`}>{dName}</p>
                      {rs && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-900/60 border border-green-700/50 text-green-300 whitespace-nowrap">
                          🚐 {rs.riders}{tr.rs_riders}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">{d.area} · {d.distanceKm}km</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${active ? "text-amber-300" : "text-gray-300"}`}>{tr.dest_from} ¥{d.priceJpy.toLocaleString()}</p>
                    {rs ? (
                      <p className="text-[10px] text-green-400">{tr.rs_save} ¥{rs.savings.toLocaleString()}</p>
                    ) : (
                      <p className="text-[10px] text-gray-600">{tr.dest_eta} {d.etaMin}min</p>
                    )}
                  </div>
                  {active && <span className="text-amber-500 flex-shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── STEP: LUGGAGE + PAYMENT ─── */}
        {step === "luggage" && dest && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
            <h2 className="text-base font-bold text-white">{tr.luggage_title}</h2>

            {/* Bag counter */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400">{tr.bags_label}</label>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setBags((b) => Math.max(1, b - 1))}
                  className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-xl hover:bg-gray-700 transition-colors">−</button>
                <span className="text-3xl font-black text-white tabular-nums w-10 text-center">{bags}</span>
                <button type="button" onClick={() => setBags((b) => Math.min(10, b + 1))}
                  className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-xl hover:bg-gray-700 transition-colors">＋</button>
                {bags > 1 && <p className="text-xs text-amber-500">+¥{((bags - 1) * EXTRA_BAG).toLocaleString()} ({tr.per_extra})</p>}
              </div>
            </div>

            {/* Payment */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400">{tr.pay_title}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["credit", "jpyc", "usdc"] as PayMethod[]).map((m) => {
                  const labels = { credit: tr.pay_credit, jpyc: tr.pay_jpyc, usdc: tr.pay_usdc };
                  return (
                    <button key={m} type="button" onClick={() => setPayMethod(m)}
                      className={`relative py-2.5 text-xs font-semibold rounded-xl transition-all ${payMethod === m ? (m === "jpyc" ? "bg-violet-500 text-white" : "bg-amber-500 text-gray-950") : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                      {labels[m]}
                      {m !== "credit" && (
                        <span className="absolute -top-1.5 -right-1 text-[8px] font-bold text-white bg-green-500 px-1 py-0.5 rounded-full leading-none">
                          −5%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-600">{payMethod === "credit" ? tr.card_fee_note : tr.crypto_note}</p>
            </div>

            {/* Price summary */}
            <div className="bg-gray-800/60 border border-amber-800/40 rounded-xl p-4 space-y-2 text-sm">
              {[
                { label: tr.summary_pickup, val: pickupLabel, small: true },
                { label: tr.summary_dest, val: destName, small: true },
                { label: tr.summary_bags, val: `${bags} ${tr.pieces}`, small: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-gray-400">{row.label}</span>
                  <span className={`text-gray-300 ${row.small ? "text-xs max-w-[160px] truncate text-right" : ""}`}>{row.val}</span>
                </div>
              ))}
              {cryptoDisc > 0 && <div className="flex items-center justify-between"><span className="text-green-400">JPYC/USDC discount</span><span className="text-green-400">−¥{cryptoDisc.toLocaleString()}</span></div>}
              <div className="border-t border-gray-700 pt-2 flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-amber-500/80 uppercase tracking-wide font-semibold">{tr.summary_total}</p>
                  <p className="text-[10px] text-gray-600">{tr.total_incl}</p>
                </div>
                <p className="text-3xl font-black text-white">¥{total.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP: CONFIRM ─── */}
        {step === "confirm" && dest && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
            <div>
              <h2 className="text-base font-bold text-white">{tr.confirm_title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{tr.confirm_sub}</p>
            </div>

            {/* Name + Phone */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: tr.name_label, val: name, set: setName, ph: tr.name_ph, type: "text" },
                { label: tr.phone_label, val: phone, set: setPhone, ph: tr.phone_ph, type: "tel" },
              ].map((f) => (
                <div key={f.label} className="space-y-1">
                  <label className="text-xs text-gray-400">{f.label}</label>
                  <input type={f.type} value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500" />
                </div>
              ))}
            </div>

            {/* Order recap */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 space-y-1.5 text-xs">
              <p className="text-[10px] text-amber-500/80 uppercase tracking-wide font-semibold mb-2">{tr.confirm_recap}</p>
              <div className="flex justify-between"><span className="text-gray-400">{tr.summary_pickup}</span><span className="text-gray-300 max-w-[160px] truncate text-right">{pickupLabel}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{tr.summary_dest}</span><span className="text-gray-300">{destName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{tr.summary_bags}</span><span className="text-gray-300">{bags} {tr.pieces}</span></div>
              {cryptoDisc > 0 && <div className="flex justify-between"><span className="text-green-400">JPYC/USDC −5%</span><span className="text-green-400">−¥{cryptoDisc.toLocaleString()}</span></div>}
              <div className="border-t border-gray-700 pt-2 flex justify-between items-center">
                <span className="text-gray-400">{tr.summary_total}</span>
                <span className="text-2xl font-black text-white">¥{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex gap-2 flex-wrap">
              {["🔒 SSL Secured", "📦 Insured ¥100K", "24h Support"].map((b) => (
                <span key={b} className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-1 rounded-full">{b}</span>
              ))}
            </div>

            {/* Book button */}
            <button type="button" onClick={submitBooking} disabled={!name.trim() || bookingLoading /* || !isOpen (テスト中は無効化) */}
              className="w-full py-4 rounded-xl bg-amber-500 text-gray-950 font-black text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {bookingLoading ? <><PulseDots /> {tr.matching_sub}</> : <>{tr.confirm_book} →</>}
            </button>
          </div>
        )}

        {/* ─── STEP: MATCHING ─── */}
        {step === "matching" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            {matchPhase === "searching" ? (
              <div className="py-6 space-y-6 text-center">
                <RadarPulse />
                <div>
                  <h2 className="text-lg font-bold text-white">{tr.matching_title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{tr.matching_sub}</p>
                </div>
                {aiRoute.length > 0 && <AiRoutePlan route={aiRoute} tr={tr} />}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {["Locating drivers", "Calc route", "Optimizing ETA"].map((s, i) => (
                    <div key={i} className="bg-gray-800/60 rounded-xl py-3 px-1">
                      <p className="text-[9px] text-gray-500 leading-tight">{s}</p>
                      <PulseDots />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-5">
                <div className="text-center space-y-1">
                  <div className="text-4xl mb-2">✅</div>
                  <h2 className="text-xl font-bold text-white">{tr.matched_title}</h2>
                  <p className="text-sm text-gray-400">{tr.matched_sub}</p>
                </div>

                {/* AI confirmation message */}
                {aiConfirmMsg && (
                  <div className="bg-gray-800/60 border border-green-800/40 rounded-xl px-4 py-3 space-y-1">
                    <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">🤖 AI Confirmation</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{aiConfirmMsg}</p>
                  </div>
                )}

                {/* AI route (after match) */}
                {aiRoute.length > 0 && <AiRoutePlan route={aiRoute} tr={tr} />}

                {/* Route map preview */}
                {dest && <MapRoute pickupLat={pickupLat} pickupLng={pickupLng} destLat={dest.lat} destLng={dest.lng} label={`${pickupLabel} → ${destName}`} locale={locale} />}

                {/* Driver card */}
                <div className="bg-gray-800 border border-green-700/50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center text-xl font-black text-white flex-shrink-0">
                      {OPERATOR.initial}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{OPERATOR.name}</p>
                      <p className="text-xs text-gray-500">{OPERATOR.car}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-400">★ {OPERATOR.rating}</p>
                      <p className="text-[10px] text-gray-600">Verified</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-900 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-gray-500">{tr.driver_eta_label}</p>
                      <p className="text-lg font-bold text-white">~{aiRoute[0]?.etaMin ?? 7} min</p>
                    </div>
                    <a href={`/narita/status/${bookingId}`} target="_blank" rel="noopener noreferrer"
                      className="bg-gray-900 rounded-xl px-3 py-2 block hover:bg-gray-800 transition-colors">
                      <p className="text-[10px] text-gray-500">Booking ID ↗</p>
                      <p className="text-sm font-bold text-amber-300 font-mono">{bookingId}</p>
                    </a>
                  </div>
                </div>

                {/* Pickup instruction + QR */}
                <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-xs text-amber-300 font-semibold">📍 {tr.summary_pickup}</p>
                  <p className="text-sm text-white font-medium">{pickupLabel}</p>
                  <p className="text-[10px] text-gray-500">{tr.pickup_instruction}</p>
                  <div className="flex justify-center pt-1">
                    <div className="w-16 h-16 bg-white rounded-lg p-1 grid grid-cols-7 gap-0.5">
                      {Array.from({ length: 49 }).map((_, i) => {
                        const dark = [0,1,2,3,4,5,6,7,13,14,20,21,28,35,42,43,44,48].includes(i) || (Math.sin(i * 5.7) > 0.3);
                        return <div key={i} className={`rounded-sm ${dark ? "bg-gray-900" : "bg-white"}`} />;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP: LIVE ─── */}
        {step === "live" && dest && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <LiveTracker
              dest={dest} pickupLat={pickupLat} pickupLng={pickupLng}
              pickupLabel={pickupLabel} locale={locale} tr={tr} onReset={reset}
              onCancel={() => setShowCancelModal(true)}
            />
          </div>
        )}

        {/* Nav buttons */}
        {step !== "live" && step !== "confirm" && (
          <div className="flex gap-3">
            {(step === "destination" || step === "luggage") && (
              <button type="button" onClick={back}
                className="px-5 py-3 rounded-xl border border-gray-700 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                {tr.back}
              </button>
            )}
            {step !== "matching" && (
              <button type="button" onClick={next} disabled={!canNext}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-gray-950 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {tr.next}
              </button>
            )}
            {step === "matching" && matchPhase === "found" && (
              <button type="button" onClick={next}
                className="flex-1 py-3 rounded-xl bg-green-500 text-gray-950 font-bold text-sm hover:bg-green-400 transition-colors">
                {tr.live_title} →
              </button>
            )}
            {step === "matching" && (
              <button type="button" onClick={() => setShowCancelModal(true)}
                className="px-5 py-3 rounded-xl border border-red-800/60 text-red-400 text-sm hover:bg-red-950/30 transition-colors">
                {tr.cancel_btn}
              </button>
            )}
          </div>
        )}


      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-8 py-6 px-4 max-w-lg mx-auto w-full">
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mb-3">
          {["📦 Luggage insured up to ¥100,000", "🔒 Secure payment", "24h support"].map((b) => (
            <span key={b} className="text-[10px] text-gray-600">{b}</span>
          ))}
        </div>
        <p className="text-center text-[10px] text-gray-700">
          © 2025 KAIROX · Narita Beta · contact@kairox.jp
        </p>
        <p className="text-center text-[10px] text-gray-800 mt-1">
          {locale === "ja" ? "荷物の紛失・破損は最大¥100,000まで補償" :
           locale === "zh" ? "行李丢失或损坏最高赔偿¥100,000" :
           locale === "ko" ? "수하물 분실·파손 시 최대 ¥100,000 보상" :
           "Lost or damaged luggage covered up to ¥100,000"}
        </p>
      </footer>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 bg-gray-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-gray-900 border border-red-800/50 rounded-2xl p-6 space-y-4">
            <div className="text-center space-y-1">
              <p className="text-2xl">⚠️</p>
              <h3 className="text-base font-bold text-white">{tr.cancel_confirm_title}</h3>
              <p className="text-xs text-gray-500">{tr.cancel_confirm_sub}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowCancelModal(false)}
                className="py-3 rounded-xl border border-gray-700 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                {tr.cancel_confirm_no}
              </button>
              <button type="button" onClick={cancelBooking} disabled={cancelLoading}
                className="py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 transition-colors disabled:opacity-40">
                {cancelLoading ? "…" : tr.cancel_confirm_yes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rideshare Toast */}
      <RideshareToast
        locale={locale}
        tr={tr}
        onJoin={(destId) => {
          const d = DESTINATIONS.find((x) => x.id === destId);
          if (d) { setDest(d); setStep("destination"); }
        }}
      />

      {/* Floating Chat */}
      <ChatWidget locale={locale} tr={tr} />

      <style jsx global>{`
        @keyframes kxPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes kxPing {
          0% { transform: scale(0.8); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes kxTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
