import type { ZoneConfig } from "./types";

const NARITA_CONFIG: ZoneConfig = {
  id: "narita",
  bookingPrefix: "NRT-",
  airportLat: 35.7648,
  airportLng: 140.3861,

  terminals: [
    {
      id: "T1", labelEn: "Terminal 1", labelJa: "第1ターミナル", hint: "JAL / Korean Air / Air China",
      lat: 35.7665, lng: 140.3847,
      spots: [
        { id: "t1-arrival",  en: "Arrivals Hall (Central)",    ja: "到着ロビー（中央）",           zh: "到达大厅（中央）",    ko: "도착 로비（중앙）",         icon: "🚪" },
        { id: "t1-starbucks",en: "Starbucks (B1 South)",       ja: "スターバックス（B1南）",        zh: "星巴克（B1南）",     ko: "스타벅스（B1 남쪽）",       icon: "☕" },
        { id: "t1-711",      en: "7-Eleven (1F South Wing)",   ja: "セブンイレブン（1F南ウイング）", zh: "7-11（1F南翼）",     ko: "세븐일레븐（1F 남쪽）",     icon: "🏪" },
        { id: "t1-bus",      en: "Bus Terminal (1F)",          ja: "バス乗り場（1F出口）",          zh: "大巴站（1F出口）",   ko: "버스 터미널（1F）",         icon: "🚌" },
        { id: "t1-taxi",     en: "Taxi Stand (1F Exit 2)",     ja: "タクシー乗り場（1F 2番出口）",  zh: "出租车（1F 2号出口）",ko: "택시 승강장（1F 2번 출구）", icon: "🚕" },
      ],
    },
    {
      id: "T2", labelEn: "Terminal 2", labelJa: "第2ターミナル", hint: "ANA / United / Lufthansa",
      lat: 35.7636, lng: 140.3862,
      spots: [
        { id: "t2-arrival",  en: "Arrivals Hall (Central)",    ja: "到着ロビー（中央）",            zh: "到达大厅（中央）",    ko: "도착 로비（중앙）",         icon: "🚪" },
        { id: "t2-mcd",      en: "McDonald's (1F East)",       ja: "マクドナルド（1F東）",          zh: "麦当劳（1F东）",     ko: "맥도날드（1F 동쪽）",       icon: "🍔" },
        { id: "t2-lawson",   en: "Lawson (B1 North)",          ja: "ローソン（B1北）",              zh: "罗森（B1北）",       ko: "로손（B1 북쪽）",           icon: "🏪" },
        { id: "t2-bus",      en: "Bus Terminal (1F North Exit)",ja: "バス乗り場（1F北口）",         zh: "大巴站（1F北出口）",  ko: "버스 터미널（1F 북쪽 출구）",icon: "🚌" },
        { id: "t2-taxi",     en: "Taxi Stand (1F Exit 4)",     ja: "タクシー乗り場（1F 4番出口）",  zh: "出租车（1F 4号出口）",ko: "택시 승강장（1F 4번 출구）", icon: "🚕" },
      ],
    },
    {
      id: "T3", labelEn: "Terminal 3 (LCC)", labelJa: "第3ターミナル", hint: "Peach / Jetstar / Spring",
      lat: 35.7600, lng: 140.3890,
      spots: [
        { id: "t3-arrival",  en: "Arrivals Exit (1F)",         ja: "到着口（1F）",                  zh: "到达出口（1F）",      ko: "도착 출구（1F）",           icon: "🚪" },
        { id: "t3-fm",       en: "FamilyMart (1F)",            ja: "ファミリーマート（1F）",         zh: "全家（1F）",          ko: "패밀리마트（1F）",          icon: "🏪" },
        { id: "t3-food",     en: "Food Court (1F)",            ja: "フードコート（1F）",             zh: "美食广场（1F）",       ko: "푸드코트（1F）",            icon: "🍜" },
        { id: "t3-bus",      en: "Bus Terminal (1F)",          ja: "バス乗り場（1F）",               zh: "大巴站（1F）",         ko: "버스 터미널（1F）",         icon: "🚌" },
      ],
    },
  ],

  destinations: [
    { id: "narita_city", nameJa: "成田市内ホテル",    nameEn: "Narita City Hotel",    nameZh: "成田市区酒店",  nameKo: "나리타 시내 호텔", area: "Narita",          distanceKm: 10,  etaMin: 20,  priceJpy: 2500, emoji: "🏨", lat: 35.7720, lng: 140.3188 },
    { id: "chiba",       nameJa: "千葉市内",           nameEn: "Chiba City",           nameZh: "千叶市区",      nameKo: "지바시",           area: "Chiba",           distanceKm: 35,  etaMin: 45,  priceJpy: 4800, emoji: "🌊", lat: 35.6073, lng: 140.1063 },
    { id: "makuhari",    nameJa: "幕張・海浜幕張",     nameEn: "Makuhari / Mihama",    nameZh: "幕张新都心",    nameKo: "마쿠하리",         area: "Chiba",           distanceKm: 40,  etaMin: 50,  priceJpy: 5200, emoji: "🏟️", lat: 35.6488, lng: 140.0432 },
    { id: "asakusa",     nameJa: "浅草・上野",         nameEn: "Asakusa / Ueno",       nameZh: "浅草/上野",     nameKo: "아사쿠사/우에노",  area: "East Tokyo",      distanceKm: 58,  etaMin: 65,  priceJpy: 6500, emoji: "⛩️", lat: 35.7147, lng: 139.7967 },
    { id: "akihabara",   nameJa: "秋葉原・神田",       nameEn: "Akihabara / Kanda",    nameZh: "秋叶原/神田",   nameKo: "아키하바라/간다",  area: "East Tokyo",      distanceKm: 60,  etaMin: 68,  priceJpy: 6800, emoji: "🎮", lat: 35.6984, lng: 139.7731 },
    { id: "ginza",       nameJa: "銀座・東京駅",       nameEn: "Ginza / Tokyo Sta.",   nameZh: "银座/东京站",   nameKo: "긴자/도쿄역",      area: "Central Tokyo",   distanceKm: 63,  etaMin: 70,  priceJpy: 7200, emoji: "🗼", lat: 35.6762, lng: 139.7649 },
    { id: "odaiba",      nameJa: "お台場・有明",       nameEn: "Odaiba / Ariake",      nameZh: "台场/有明",     nameKo: "오다이바/아리아케", area: "Central Tokyo",   distanceKm: 67,  etaMin: 75,  priceJpy: 7500, emoji: "🌉", lat: 35.6268, lng: 139.7754 },
    { id: "shinjuku",    nameJa: "新宿・渋谷",         nameEn: "Shinjuku / Shibuya",   nameZh: "新宿/涩谷",     nameKo: "신주쿠/시부야",    area: "West Tokyo",      distanceKm: 68,  etaMin: 75,  priceJpy: 7800, emoji: "🏙️", lat: 35.6896, lng: 139.6921 },
    { id: "roppongi",    nameJa: "六本木・麻布",       nameEn: "Roppongi / Azabu",     nameZh: "六本木/麻布",   nameKo: "롯폰기/아자부",    area: "West Tokyo",      distanceKm: 65,  etaMin: 72,  priceJpy: 7500, emoji: "🌃", lat: 35.6628, lng: 139.7314 },
    { id: "ikebukuro",   nameJa: "池袋・板橋",         nameEn: "Ikebukuro / Itabashi", nameZh: "池袋/板桥",     nameKo: "이케부쿠로/이타바시", area: "North Tokyo",   distanceKm: 70,  etaMin: 78,  priceJpy: 8200, emoji: "🎡", lat: 35.7295, lng: 139.7109 },
    { id: "saitama",     nameJa: "さいたま・川越",     nameEn: "Saitama / Kawagoe",    nameZh: "埼玉/川越",     nameKo: "사이타마/가와고에", area: "Saitama",         distanceKm: 80,  etaMin: 90,  priceJpy: 8500, emoji: "🌿", lat: 35.8617, lng: 139.6455 },
    { id: "yokohama",    nameJa: "横浜",               nameEn: "Yokohama",             nameZh: "横滨",          nameKo: "요코하마",          area: "Kanagawa",        distanceKm: 90,  etaMin: 100, priceJpy: 9500, emoji: "🚢", lat: 35.4437, lng: 139.6380 },
    { id: "haneda1",     nameJa: "羽田空港 T1 (JAL)",  nameEn: "Haneda T1 — JAL",      nameZh: "羽田机场 T1",   nameKo: "하네다 T1 (JAL)",   area: "Airport Express", distanceKm: 90,  etaMin: 95,  priceJpy: 9500, emoji: "✈️", lat: 35.5533, lng: 139.7811 },
    { id: "haneda2",     nameJa: "羽田空港 T2 (ANA)",  nameEn: "Haneda T2 — ANA",      nameZh: "羽田机场 T2",   nameKo: "하네다 T2 (ANA)",   area: "Airport Express", distanceKm: 90,  etaMin: 95,  priceJpy: 9500, emoji: "✈️", lat: 35.5494, lng: 139.7798 },
    { id: "haneda3",     nameJa: "羽田空港 T3 (国際)", nameEn: "Haneda T3 — Intl",     nameZh: "羽田机场 T3",   nameKo: "하네다 T3 (국제선)", area: "Airport Express", distanceKm: 91,  etaMin: 97,  priceJpy: 9500, emoji: "🌏", lat: 35.5456, lng: 139.7802 },
  ],

  hotels: [
    { id: "h-narita-excel",    nameJa: "成田エクセルホテル東急",               nameEn: "Narita Excel Hotel Tokyu",           nameZh: "成田东急卓越酒店",        nameKo: "나리타 엑셀 호텔 도큐",           area: "Narita",        distanceKm: 10, etaMin: 20,  priceJpy: 2500, emoji: "🏨", lat: 35.7695, lng: 140.3185 },
    { id: "h-narita-hilton",   nameJa: "ヒルトン成田",                         nameEn: "Hilton Tokyo Narita Airport",        nameZh: "成田希尔顿酒店",          nameKo: "힐튼 나리타 공항",                area: "Narita",        distanceKm: 8,  etaMin: 18,  priceJpy: 2500, emoji: "🏨", lat: 35.7820, lng: 140.3650 },
    { id: "h-narita-apa",      nameJa: "アパホテル成田",                       nameEn: "APA Hotel Narita",                   nameZh: "APA酒店成田",             nameKo: "APA 호텔 나리타",                 area: "Narita",        distanceKm: 10, etaMin: 20,  priceJpy: 2500, emoji: "🏨", lat: 35.7710, lng: 140.3198 },
    { id: "h-narita-monterey", nameJa: "ホテルモントレ成田",                   nameEn: "Hotel Monterey Narita",              nameZh: "成田蒙特雷酒店",          nameKo: "호텔 몬테레이 나리타",            area: "Narita",        distanceKm: 10, etaMin: 20,  priceJpy: 2500, emoji: "🏨", lat: 35.7720, lng: 140.3188 },
    { id: "h-hilton-tokyobay", nameJa: "ヒルトン東京ベイ",                     nameEn: "Hilton Tokyo Bay",                   nameZh: "东京湾希尔顿酒店",        nameKo: "힐튼 도쿄 베이",                  area: "Chiba",         distanceKm: 50, etaMin: 60,  priceJpy: 5500, emoji: "🏨", lat: 35.6300, lng: 139.8900 },
    { id: "h-peninsula",       nameJa: "ザ・ペニンシュラ東京",                 nameEn: "The Peninsula Tokyo",                nameZh: "东京半岛酒店",            nameKo: "더 페닌슐라 도쿄",                area: "Central Tokyo", distanceKm: 63, etaMin: 70,  priceJpy: 7200, emoji: "🏨", lat: 35.6755, lng: 139.7600 },
    { id: "h-aman-tokyo",      nameJa: "アマン東京",                           nameEn: "Aman Tokyo",                         nameZh: "东京安缦",                nameKo: "아만 도쿄",                       area: "Central Tokyo", distanceKm: 63, etaMin: 70,  priceJpy: 7200, emoji: "🏨", lat: 35.6841, lng: 139.7639 },
    { id: "h-park-hyatt",      nameJa: "パークハイアット東京",                 nameEn: "Park Hyatt Tokyo",                   nameZh: "东京柏悦酒店",            nameKo: "파크 하얏트 도쿄",                area: "West Tokyo",    distanceKm: 68, etaMin: 75,  priceJpy: 9500, emoji: "🏨", lat: 35.6889, lng: 139.6917 },
    { id: "h-ritz-carlton",    nameJa: "ザ・リッツ・カールトン東京",           nameEn: "The Ritz-Carlton Tokyo",             nameZh: "东京丽思卡尔顿酒店",      nameKo: "더 리츠칼튼 도쿄",                area: "West Tokyo",    distanceKm: 65, etaMin: 72,  priceJpy: 7500, emoji: "🏨", lat: 35.6658, lng: 139.7307 },
    { id: "h-grand-hyatt",     nameJa: "グランドハイアット東京",               nameEn: "Grand Hyatt Tokyo",                  nameZh: "东京君悦大酒店",          nameKo: "그랜드 하얏트 도쿄",              area: "West Tokyo",    distanceKm: 65, etaMin: 72,  priceJpy: 7500, emoji: "🏨", lat: 35.6601, lng: 139.7308 },
    { id: "h-imperial-tokyo",  nameJa: "帝国ホテル 東京",                      nameEn: "Imperial Hotel Tokyo",               nameZh: "东京帝国大酒店",          nameKo: "임페리얼 호텔 도쿄",              area: "Central Tokyo", distanceKm: 63, etaMin: 70,  priceJpy: 7200, emoji: "🏨", lat: 35.6732, lng: 139.7584 },
    { id: "h-tokyo-station",   nameJa: "東京ステーションホテル",               nameEn: "The Tokyo Station Hotel",            nameZh: "东京车站大酒店",          nameKo: "더 도쿄 스테이션 호텔",           area: "Central Tokyo", distanceKm: 63, etaMin: 70,  priceJpy: 7200, emoji: "🏨", lat: 35.6812, lng: 139.7671 },
    { id: "h-intercontinental-yh", nameJa: "ヨコハマ グランド インターコンチネンタル", nameEn: "Yokohama Grand InterContinental", nameZh: "横滨洲际大酒店",       nameKo: "요코하마 그랜드 인터컨티넨탈",    area: "Kanagawa",      distanceKm: 90, etaMin: 100, priceJpy: 9500, emoji: "🏨", lat: 35.4525, lng: 139.6367 },
  ],

  rideshare: [
    { destId: "shinjuku",  riders: 3, savings: 1800 },
    { destId: "ginza",     riders: 2, savings: 1200 },
    { destId: "asakusa",   riders: 2, savings: 1000 },
    { destId: "akihabara", riders: 1, savings: 600  },
    { destId: "yokohama",  riders: 4, savings: 2400 },
    { destId: "haneda1",   riders: 2, savings: 3000 },
    { destId: "ikebukuro", riders: 1, savings: 700  },
    { destId: "makuhari",  riders: 3, savings: 1400 },
  ],

  i18n: {
    badge: {
      ja: "Japan Luggage Freedom",
      en: "Japan Luggage Freedom",
      zh: "Japan Luggage Freedom",
      ko: "Japan Luggage Freedom",
    },
    hero: {
      ja: "着いた瞬間から、旅が始まる。",
      en: "Land at Narita. Start exploring. Your luggage meets you at the hotel.",
      zh: "抵达成田，立刻出发。行李先到酒店。",
      ko: "나리타 도착, 바로 여행 시작. 짐은 호텔에서 만나요.",
    },
    hero_sub: {
      ja: "荷物はホテルへ先着。カウンター不要・〆切なし。",
      en: "No counter, no cut-off time.",
      zh: "无需柜台，无截止时间。",
      ko: "카운터 불필요, 마감 없음.",
    },
  },
};

export default NARITA_CONFIG;
