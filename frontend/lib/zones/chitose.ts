import type { ZoneConfig } from "./types";

const CHITOSE_CONFIG: ZoneConfig = {
  id: "chitose",
  bookingPrefix: "CTS-",
  airportLat: 42.7752,
  airportLng: 141.6921,

  terminals: [
    {
      id: "INTL", labelEn: "International Terminal", labelJa: "国際線ターミナル",
      hint: "Air Do / ANA / JAL international",
      lat: 42.7752, lng: 141.6921,
      spots: [
        { id: "intl-arrival", en: "Arrivals Hall (1F)",          ja: "到着ロビー（1F）",          zh: "到达大厅（1F）",      ko: "도착 로비（1F）",         icon: "🚪" },
        { id: "intl-711",     en: "7-Eleven (1F)",               ja: "セブンイレブン（1F）",       zh: "7-11（1F）",          ko: "세븐일레븐（1F）",        icon: "🏪" },
        { id: "intl-bus",     en: "Bus Terminal (1F North Exit)", ja: "バス乗り場（1F北口）",       zh: "大巴站（1F北出口）",   ko: "버스 터미널（1F 북쪽）",   icon: "🚌" },
        { id: "intl-taxi",    en: "Taxi Stand (1F Exit)",        ja: "タクシー乗り場（1F出口）",   zh: "出租车（1F出口）",     ko: "택시 승강장（1F 출구）",   icon: "🚕" },
      ],
    },
    {
      id: "DOM", labelEn: "Domestic Terminal", labelJa: "国内線ターミナル",
      hint: "ANA / JAL / Peach domestic",
      lat: 42.7750, lng: 141.6930,
      spots: [
        { id: "dom-arrival", en: "Arrivals Hall (1F)",           ja: "到着ロビー（1F）",          zh: "到达大厅（1F）",      ko: "도착 로비（1F）",         icon: "🚪" },
        { id: "dom-lawson",  en: "Lawson (1F)",                  ja: "ローソン（1F）",             zh: "罗森（1F）",          ko: "로손（1F）",              icon: "🏪" },
        { id: "dom-bus",     en: "Bus Terminal (1F)",            ja: "バス乗り場（1F）",           zh: "大巴站（1F）",         ko: "버스 터미널（1F）",        icon: "🚌" },
        { id: "dom-taxi",    en: "Taxi Stand (1F)",              ja: "タクシー乗り場（1F）",       zh: "出租车（1F）",         ko: "택시 승강장（1F）",        icon: "🚕" },
      ],
    },
  ],

  destinations: [
    // ── 千歳・苫小牧 ──
    { id: "chitose_city",  nameJa: "千歳市内",         nameEn: "Chitose City",       nameZh: "千岁市区",     nameKo: "치토세 시내",     area: "Chitose",   distanceKm: 10,  etaMin: 20,  priceJpy: 2000,  emoji: "🏙️", lat: 42.8192, lng: 141.6502 },
    { id: "tomakomai",     nameJa: "苫小牧市内",       nameEn: "Tomakomai City",     nameZh: "苫小牧市区",   nameKo: "도마코마이",      area: "Tomakomai", distanceKm: 30,  etaMin: 35,  priceJpy: 3000,  emoji: "🏭", lat: 42.6367, lng: 141.6044 },
    // ── 札幌 ──
    { id: "sapporo_c",     nameJa: "札幌（中心部）",   nameEn: "Sapporo Central",    nameZh: "札幌市中心",   nameKo: "삿포로 중심부",   area: "Sapporo",   distanceKm: 47,  etaMin: 50,  priceJpy: 4500,  emoji: "🌆", lat: 43.0617, lng: 141.3544 },
    { id: "susukino",      nameJa: "すすきの・中島公園",nameEn: "Susukino / Nakajima",nameZh: "薄野/中岛公园",nameKo: "스스키노",        area: "Sapporo",   distanceKm: 48,  etaMin: 52,  priceJpy: 4500,  emoji: "🎶", lat: 43.0534, lng: 141.3566 },
    { id: "sapporo_s",     nameJa: "札幌駅・北区",     nameEn: "Sapporo Station",    nameZh: "札幌站/北区",  nameKo: "삿포로역",        area: "Sapporo",   distanceKm: 50,  etaMin: 55,  priceJpy: 4800,  emoji: "🚉", lat: 43.0687, lng: 141.3508 },
    // ── 小樽 ──
    { id: "otaru",         nameJa: "小樽",             nameEn: "Otaru",              nameZh: "小樽",         nameKo: "오타루",          area: "Otaru",     distanceKm: 70,  etaMin: 75,  priceJpy: 6500,  emoji: "⚓", lat: 43.1907, lng: 140.9947 },
  ],

  hotels: [
    // ── 千歳 ──
    { id: "h-cts-airinn",      nameJa: "新千歳空港エアターミナルホテル", nameEn: "New Chitose Airport Terminal Hotel", nameZh: "新千岁机场航站楼酒店", nameKo: "신치토세 공항 터미널 호텔", area: "Chitose",  distanceKm: 1,   etaMin: 5,   priceJpy: 1500,  emoji: "🏨", lat: 42.7752, lng: 141.6921 },
    { id: "h-cts-apa",         nameJa: "アパホテル千歳駅前",             nameEn: "APA Hotel Chitose",                  nameZh: "APA酒店千岁站前",    nameKo: "APA 호텔 치토세역 앞",     area: "Chitose",  distanceKm: 10,  etaMin: 20,  priceJpy: 2000,  emoji: "🏨", lat: 42.8192, lng: 141.6502 },
    // ── 苫小牧 ──
    { id: "h-toma-daiwa",      nameJa: "ダイワロイネットホテル苫小牧",   nameEn: "Daiwa Roynet Hotel Tomakomai",       nameZh: "大和路内特酒店苫小牧", nameKo: "다이와 로이넷 호텔 도마코마이", area: "Tomakomai",distanceKm: 30,  etaMin: 35,  priceJpy: 3000,  emoji: "🏨", lat: 42.6367, lng: 141.6044 },
    // ── 札幌 ──
    { id: "h-jrinn-sapporo",   nameJa: "JRイン札幌",                     nameEn: "JR Inn Sapporo",                     nameZh: "JR旅馆札幌",         nameKo: "JR 인 삿포로",             area: "Sapporo",  distanceKm: 47,  etaMin: 50,  priceJpy: 4500,  emoji: "🏨", lat: 43.0686, lng: 141.3508 },
    { id: "h-ana-sapporo",     nameJa: "ANAクラウンプラザホテル札幌",     nameEn: "ANA Crowne Plaza Sapporo",           nameZh: "札幌全日空皇冠假日",   nameKo: "ANA 크라운 플라자 삿포로",  area: "Sapporo",  distanceKm: 47,  etaMin: 50,  priceJpy: 5500,  emoji: "🏨", lat: 43.0617, lng: 141.3544 },
    { id: "h-jal-sapporo",     nameJa: "ザ・ロイヤルパークホテル 札幌",  nameEn: "The Royal Park Hotel Sapporo",       nameZh: "皇家公园酒店札幌",    nameKo: "더 로열 파크 호텔 삿포로",  area: "Sapporo",  distanceKm: 47,  etaMin: 50,  priceJpy: 5500,  emoji: "🏨", lat: 43.0558, lng: 141.3567 },
    { id: "h-north-grand",     nameJa: "ホテルノースグランド",            nameEn: "Hotel North Grand Sapporo",          nameZh: "北方大饭店",          nameKo: "호텔 노스 그랜드 삿포로",   area: "Sapporo",  distanceKm: 47,  etaMin: 50,  priceJpy: 4500,  emoji: "🏨", lat: 43.0614, lng: 141.3559 },
    { id: "h-sapporo-excel",   nameJa: "エクセルホテル東急札幌",         nameEn: "Excel Hotel Tokyu Sapporo",          nameZh: "东急卓越大酒店札幌",  nameKo: "엑셀 호텔 도큐 삿포로",     area: "Sapporo",  distanceKm: 47,  etaMin: 50,  priceJpy: 5000,  emoji: "🏨", lat: 43.0557, lng: 141.3482 },
    // ── 小樽 ──
    { id: "h-otaru-gr",        nameJa: "小樽グランドホテル クラシック",  nameEn: "Otaru Grand Hotel Classic",          nameZh: "小樽大饭店经典",      nameKo: "오타루 그랜드 호텔 클래식",  area: "Otaru",    distanceKm: 70,  etaMin: 75,  priceJpy: 6500,  emoji: "🏨", lat: 43.1907, lng: 140.9947 },
    { id: "h-otaru-dormy",     nameJa: "ドーミーイン小樽",               nameEn: "Dormy Inn Otaru",                    nameZh: "多米旅馆小樽",        nameKo: "도미 인 오타루",            area: "Otaru",    distanceKm: 70,  etaMin: 75,  priceJpy: 6000,  emoji: "🏨", lat: 43.1920, lng: 140.9940 },
  ],

  rideshare: [
    { destId: "sapporo_c", riders: 3, savings: 1800 },
    { destId: "susukino",  riders: 2, savings: 1200 },
    { destId: "otaru",     riders: 2, savings: 2000 },
    { destId: "tomakomai", riders: 2, savings: 1000 },
  ],

  i18n: {
    badge: {
      ja: "北海道 手ぶら旅",
      en: "Hokkaido Luggage Freedom",
      zh: "北海道轻装旅行",
      ko: "홋카이도 수하물 프리",
    },
    hero: {
      ja: "新千歳に着いた瞬間から、北海道が始まる。",
      en: "Land at Chitose. Explore Hokkaido. Your luggage meets you at the hotel.",
      zh: "落地新千岁，立刻开启北海道之旅。行李直送酒店。",
      ko: "신치토세 착륙 즉시 홋카이도 여행 시작. 짐은 호텔로.",
    },
    hero_sub: {
      ja: "荷物はホテルへ先着。カウンター不要・〆切なし。",
      en: "No counter, no cut-off time.",
      zh: "行李先到酒店，无需柜台，随时可预约。",
      ko: "짐은 먼저 호텔로. 카운터 불필요, 마감 없음.",
    },
  },
};

export default CHITOSE_CONFIG;
