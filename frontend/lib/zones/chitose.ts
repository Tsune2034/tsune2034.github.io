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
    // ── 千歳 ──
    { id: "chitose_city",    nameJa: "千歳市内",              nameEn: "Chitose City",              nameZh: "千岁市区",         nameKo: "치토세 시내",        area: "Chitose",       distanceKm: 10,  etaMin: 15,  priceJpy: 1800,  emoji: "🏙️", lat: 42.8192, lng: 141.6502 },
    // ── 北広島 ──
    { id: "kitahiroshima",   nameJa: "北広島・エスコンフィールド", nameEn: "Kitahiroshima / Es Con Field", nameZh: "北广岛/Es Con球场", nameKo: "기타히로시마/에스콘 필드", area: "Kitahiroshima", distanceKm: 25,  etaMin: 25,  priceJpy: 2500,  emoji: "⚾", lat: 42.9855, lng: 141.5657 },
    // ── 江別 ──
    { id: "ebetsu",          nameJa: "江別市内",              nameEn: "Ebetsu City",               nameZh: "江别市区",         nameKo: "에베쓰 시내",        area: "Ebetsu",        distanceKm: 35,  etaMin: 35,  priceJpy: 3500,  emoji: "🏘️", lat: 43.1037, lng: 141.5383 },
    // ── 札幌 ──
    { id: "sapporo_c",       nameJa: "札幌（中心部・大通）",  nameEn: "Sapporo Central / Odori",   nameZh: "札幌市中心/大通",  nameKo: "삿포로 중심부/오도리", area: "Sapporo",       distanceKm: 47,  etaMin: 50,  priceJpy: 4500,  emoji: "🌆", lat: 43.0617, lng: 141.3544 },
    { id: "sapporo_s",       nameJa: "札幌駅・北区",          nameEn: "Sapporo Station / Kita",    nameZh: "札幌站/北区",      nameKo: "삿포로역/기타구",    area: "Sapporo",       distanceKm: 50,  etaMin: 55,  priceJpy: 4800,  emoji: "🚉", lat: 43.0687, lng: 141.3508 },
    { id: "susukino",        nameJa: "すすきの・中島公園",    nameEn: "Susukino / Nakajima Park",  nameZh: "薄野/中岛公园",    nameKo: "스스키노/나카지마 공원", area: "Sapporo",    distanceKm: 48,  etaMin: 52,  priceJpy: 4500,  emoji: "🎶", lat: 43.0534, lng: 141.3566 },
    // ── 苫小牧 ──
    { id: "tomakomai",       nameJa: "苫小牧市内",            nameEn: "Tomakomai City",            nameZh: "苫小牧市区",       nameKo: "도마코마이",         area: "Tomakomai",     distanceKm: 30,  etaMin: 35,  priceJpy: 3000,  emoji: "🏭", lat: 42.6367, lng: 141.6044 },
    // ── 小樽 ──
    { id: "otaru",           nameJa: "小樽",                  nameEn: "Otaru",                     nameZh: "小樽",             nameKo: "오타루",             area: "Otaru",         distanceKm: 70,  etaMin: 75,  priceJpy: 6500,  emoji: "⚓", lat: 43.1907, lng: 140.9947 },
  ],

  hotels: [
    // ─────────────────────────────────────────────
    // 千歳 (Chitose) — 空港近郊
    // ─────────────────────────────────────────────
    { id: "h-cts-airinn",      nameJa: "新千歳空港エアターミナルホテル", nameEn: "New Chitose Airport Terminal Hotel",    nameZh: "新千岁机场航站楼酒店",   nameKo: "신치토세 공항 터미널 호텔",    area: "Chitose",       distanceKm: 1,   etaMin: 5,   priceJpy: 1500,  emoji: "🏨", lat: 42.7752, lng: 141.6921 },
    { id: "h-cts-apa",         nameJa: "アパホテル千歳駅前",             nameEn: "APA Hotel Chitose Ekimae",             nameZh: "APA酒店千岁站前",        nameKo: "APA 호텔 치토세역 앞",        area: "Chitose",       distanceKm: 10,  etaMin: 18,  priceJpy: 1800,  emoji: "🏨", lat: 42.8192, lng: 141.6502 },
    { id: "h-cts-routeinn",    nameJa: "ホテルルートイン千歳",           nameEn: "Hotel Route Inn Chitose",              nameZh: "路线酒店千岁",           nameKo: "호텔 루트 인 치토세",         area: "Chitose",       distanceKm: 10,  etaMin: 18,  priceJpy: 1800,  emoji: "🏨", lat: 42.8195, lng: 141.6510 },
    { id: "h-cts-daiwa",       nameJa: "ダイワロイネットホテル千歳",     nameEn: "Daiwa Roynet Hotel Chitose",           nameZh: "大和路内特酒店千岁",     nameKo: "다이와 로이넷 호텔 치토세",   area: "Chitose",       distanceKm: 10,  etaMin: 18,  priceJpy: 2000,  emoji: "🏨", lat: 42.8183, lng: 141.6498 },
    { id: "h-cts-dormy",       nameJa: "ドーミーイン千歳",               nameEn: "Dormy Inn Chitose",                    nameZh: "多米旅馆千岁",           nameKo: "도미 인 치토세",              area: "Chitose",       distanceKm: 10,  etaMin: 18,  priceJpy: 1900,  emoji: "🏨", lat: 42.8199, lng: 141.6497 },

    // ─────────────────────────────────────────────
    // 北広島 (Kitahiroshima) — エスコンフィールド周辺
    // ─────────────────────────────────────────────
    { id: "h-kh-mitsui",       nameJa: "三井ガーデンホテル北広島 Ballpark Park Side", nameEn: "Mitsui Garden Hotel Kitahiroshima Ballpark", nameZh: "三井花园酒店北广岛球场", nameKo: "미쓰이 가든 호텔 기타히로시마 볼파크", area: "Kitahiroshima", distanceKm: 25,  etaMin: 25,  priceJpy: 3000,  emoji: "🏨", lat: 42.9845, lng: 141.5649 },
    { id: "h-kh-wbf",          nameJa: "ホテルWBF北広島",                nameEn: "Hotel WBF Kitahiroshima",              nameZh: "WBF酒店北广岛",         nameKo: "호텔 WBF 기타히로시마",       area: "Kitahiroshima", distanceKm: 25,  etaMin: 25,  priceJpy: 2800,  emoji: "🏨", lat: 42.9830, lng: 141.5620 },
    { id: "h-kh-routeinn",     nameJa: "ホテルルートイン北広島",         nameEn: "Hotel Route Inn Kitahiroshima",        nameZh: "路线酒店北广岛",         nameKo: "호텔 루트 인 기타히로시마",   area: "Kitahiroshima", distanceKm: 26,  etaMin: 26,  priceJpy: 2500,  emoji: "🏨", lat: 42.9810, lng: 141.5680 },

    // ─────────────────────────────────────────────
    // 江別 (Ebetsu)
    // ─────────────────────────────────────────────
    { id: "h-eb-routeinn",     nameJa: "ホテルルートイン江別",           nameEn: "Hotel Route Inn Ebetsu",               nameZh: "路线酒店江别",           nameKo: "호텔 루트 인 에베쓰",         area: "Ebetsu",        distanceKm: 35,  etaMin: 35,  priceJpy: 3000,  emoji: "🏨", lat: 43.1041, lng: 141.5367 },
    { id: "h-eb-superhotel",   nameJa: "スーパーホテル江別",             nameEn: "Super Hotel Ebetsu",                   nameZh: "超级酒店江别",           nameKo: "슈퍼 호텔 에베쓰",           area: "Ebetsu",        distanceKm: 35,  etaMin: 35,  priceJpy: 2800,  emoji: "🏨", lat: 43.1030, lng: 141.5380 },

    // ─────────────────────────────────────────────
    // 苫小牧 (Tomakomai)
    // ─────────────────────────────────────────────
    { id: "h-toma-daiwa",      nameJa: "ダイワロイネットホテル苫小牧",   nameEn: "Daiwa Roynet Hotel Tomakomai",         nameZh: "大和路内特酒店苫小牧",   nameKo: "다이와 로이넷 호텔 도마코마이", area: "Tomakomai",   distanceKm: 30,  etaMin: 35,  priceJpy: 3000,  emoji: "🏨", lat: 42.6367, lng: 141.6044 },
    { id: "h-toma-apa",        nameJa: "アパホテル苫小牧駅前",           nameEn: "APA Hotel Tomakomai Ekimae",           nameZh: "APA酒店苫小牧站前",      nameKo: "APA 호텔 도마코마이역 앞",    area: "Tomakomai",     distanceKm: 31,  etaMin: 36,  priceJpy: 2800,  emoji: "🏨", lat: 42.6350, lng: 141.6050 },
    { id: "h-toma-routeinn",   nameJa: "ホテルルートイン苫小牧",         nameEn: "Hotel Route Inn Tomakomai",            nameZh: "路线酒店苫小牧",         nameKo: "호텔 루트 인 도마코마이",     area: "Tomakomai",     distanceKm: 31,  etaMin: 36,  priceJpy: 2800,  emoji: "🏨", lat: 42.6362, lng: 141.6060 },

    // ─────────────────────────────────────────────
    // 札幌 (Sapporo) — 札幌駅・北区
    // ─────────────────────────────────────────────
    { id: "h-sap-jrtower",     nameJa: "JRタワーホテル日航札幌",         nameEn: "JR Tower Hotel Nikko Sapporo",         nameZh: "JR塔日航酒店札幌",       nameKo: "JR 타워 호텔 닛코 삿포로",    area: "Sapporo",       distanceKm: 50,  etaMin: 55,  priceJpy: 6500,  emoji: "🏨", lat: 43.0685, lng: 141.3500 },
    { id: "h-jrinn-sapporo",   nameJa: "JRイン札幌",                     nameEn: "JR Inn Sapporo",                       nameZh: "JR旅馆札幌",             nameKo: "JR 인 삿포로",               area: "Sapporo",       distanceKm: 50,  etaMin: 55,  priceJpy: 4500,  emoji: "🏨", lat: 43.0686, lng: 141.3508 },
    { id: "h-sap-doubletree",  nameJa: "ダブルツリーバイヒルトン札幌",   nameEn: "DoubleTree by Hilton Sapporo",         nameZh: "希尔顿逸林酒店札幌",     nameKo: "더블트리 바이 힐튼 삿포로",   area: "Sapporo",       distanceKm: 50,  etaMin: 55,  priceJpy: 5500,  emoji: "🏨", lat: 43.0669, lng: 141.3500 },
    { id: "h-sap-century",     nameJa: "センチュリーロイヤルホテル",      nameEn: "Century Royal Hotel Sapporo",          nameZh: "世纪皇家酒店札幌",       nameKo: "센추리 로얄 호텔 삿포로",     area: "Sapporo",       distanceKm: 50,  etaMin: 55,  priceJpy: 5000,  emoji: "🏨", lat: 43.0676, lng: 141.3480 },
    { id: "h-sap-daiwa-eki",   nameJa: "ダイワロイネットホテル札幌駅前", nameEn: "Daiwa Roynet Hotel Sapporo Ekimae",    nameZh: "大和路内特酒店札幌站前", nameKo: "다이와 로이넷 호텔 삿포로역 앞", area: "Sapporo",    distanceKm: 50,  etaMin: 55,  priceJpy: 4500,  emoji: "🏨", lat: 43.0685, lng: 141.3493 },
    { id: "h-sap-gracery",     nameJa: "ホテルグレイスリー札幌",         nameEn: "Hotel Gracery Sapporo",                nameZh: "格雷斯利酒店札幌",       nameKo: "호텔 그레이서리 삿포로",      area: "Sapporo",       distanceKm: 50,  etaMin: 55,  priceJpy: 4800,  emoji: "🏨", lat: 43.0705, lng: 141.3485 },
    { id: "h-sap-risouru",     nameJa: "ホテルリソルトリニティ札幌",     nameEn: "Hotel Resol Trinity Sapporo",          nameZh: "里索尔三一酒店札幌",     nameKo: "호텔 리조루 트리니티 삿포로", area: "Sapporo",       distanceKm: 50,  etaMin: 55,  priceJpy: 4500,  emoji: "🏨", lat: 43.0690, lng: 141.3490 },

    // ── 札幌 — 大通・中心部 ──
    { id: "h-ana-sapporo",     nameJa: "ANAクラウンプラザホテル札幌",     nameEn: "ANA Crowne Plaza Sapporo",             nameZh: "札幌全日空皇冠假日",     nameKo: "ANA 크라운 플라자 삿포로",    area: "Sapporo",       distanceKm: 47,  etaMin: 52,  priceJpy: 5500,  emoji: "🏨", lat: 43.0617, lng: 141.3544 },
    { id: "h-sap-okura",       nameJa: "ホテルオークラ札幌",             nameEn: "Hotel Okura Sapporo",                  nameZh: "大仓酒店札幌",           nameKo: "호텔 오쿠라 삿포로",          area: "Sapporo",       distanceKm: 47,  etaMin: 52,  priceJpy: 5000,  emoji: "🏨", lat: 43.0592, lng: 141.3536 },
    { id: "h-sap-keio",        nameJa: "京王プラザホテル札幌",           nameEn: "Keio Plaza Hotel Sapporo",             nameZh: "京王广场大酒店札幌",     nameKo: "게이오 플라자 호텔 삿포로",   area: "Sapporo",       distanceKm: 47,  etaMin: 52,  priceJpy: 5000,  emoji: "🏨", lat: 43.0620, lng: 141.3549 },
    { id: "h-sap-mitsui",      nameJa: "三井ガーデンホテル札幌",         nameEn: "Mitsui Garden Hotel Sapporo",          nameZh: "三井花园酒店札幌",       nameKo: "미쓰이 가든 호텔 삿포로",     area: "Sapporo",       distanceKm: 47,  etaMin: 52,  priceJpy: 4800,  emoji: "🏨", lat: 43.0597, lng: 141.3541 },
    { id: "h-sap-monterey",    nameJa: "ホテルモントレ エーデルホフ札幌", nameEn: "Hotel Monterey Edelhof Sapporo",       nameZh: "蒙特雷艾德尔霍夫酒店札幌", nameKo: "호텔 몬테레이 에델호프 삿포로", area: "Sapporo",   distanceKm: 47,  etaMin: 52,  priceJpy: 4800,  emoji: "🏨", lat: 43.0600, lng: 141.3537 },
    { id: "h-north-grand",     nameJa: "ホテルノースグランド",           nameEn: "Hotel North Grand Sapporo",            nameZh: "北方大饭店",             nameKo: "호텔 노스 그랜드 삿포로",     area: "Sapporo",       distanceKm: 47,  etaMin: 52,  priceJpy: 4500,  emoji: "🏨", lat: 43.0614, lng: 141.3559 },
    { id: "h-sapporo-excel",   nameJa: "エクセルホテル東急札幌",         nameEn: "Excel Hotel Tokyu Sapporo",            nameZh: "东急卓越大酒店札幌",     nameKo: "엑셀 호텔 도큐 삿포로",       area: "Sapporo",       distanceKm: 47,  etaMin: 52,  priceJpy: 5000,  emoji: "🏨", lat: 43.0557, lng: 141.3482 },
    { id: "h-jal-sapporo",     nameJa: "ザ・ロイヤルパークホテル 札幌",  nameEn: "The Royal Park Hotel Sapporo",         nameZh: "皇家公园酒店札幌",       nameKo: "더 로열 파크 호텔 삿포로",    area: "Sapporo",       distanceKm: 47,  etaMin: 52,  priceJpy: 5500,  emoji: "🏨", lat: 43.0558, lng: 141.3567 },
    { id: "h-sap-tokyu",       nameJa: "北海道さっぽろ東急ホテル",       nameEn: "Hokkaido Sapporo Tokyu Hotel",         nameZh: "北海道札幌东急酒店",     nameKo: "홋카이도 삿포로 도큐 호텔",   area: "Sapporo",       distanceKm: 47,  etaMin: 52,  priceJpy: 4800,  emoji: "🏨", lat: 43.0561, lng: 141.3487 },
    { id: "h-sap-dormy-odori", nameJa: "ドーミーインPREMIUM 札幌大通",   nameEn: "Dormy Inn Premium Sapporo Odori",      nameZh: "多米旅馆PREMIUM札幌大通", nameKo: "도미 인 PREMIUM 삿포로 오도리", area: "Sapporo",  distanceKm: 47,  etaMin: 52,  priceJpy: 4500,  emoji: "🏨", lat: 43.0560, lng: 141.3512 },
    { id: "h-sap-apa-odori",   nameJa: "アパホテル札幌大通公園",         nameEn: "APA Hotel Sapporo Odori Park",         nameZh: "APA酒店札幌大通公园",    nameKo: "APA 호텔 삿포로 오도리 공원",  area: "Sapporo",       distanceKm: 47,  etaMin: 52,  priceJpy: 4200,  emoji: "🏨", lat: 43.0575, lng: 141.3545 },

    // ── 札幌 — すすきの・中島公園 ──
    { id: "h-sap-sonya",       nameJa: "ソニアホテル",                   nameEn: "Sonya Hotel Sapporo",                  nameZh: "索尼亚酒店札幌",         nameKo: "소냐 호텔 삿포로",            area: "Sapporo",       distanceKm: 48,  etaMin: 53,  priceJpy: 5500,  emoji: "🏨", lat: 43.0547, lng: 141.3557 },
    { id: "h-sap-wyndham",     nameJa: "ウィンダムグランド札幌すすきの", nameEn: "Wyndham Grand Sapporo Susukino",       nameZh: "温德姆大酒店札幌薄野",   nameKo: "윈덤 그랜드 삿포로 스스키노",  area: "Sapporo",       distanceKm: 48,  etaMin: 53,  priceJpy: 5500,  emoji: "🏨", lat: 43.0528, lng: 141.3558 },
    { id: "h-sap-dormy-susuk", nameJa: "ドーミーイン札幌すすきの",       nameEn: "Dormy Inn Sapporo Susukino",           nameZh: "多米旅馆札幌薄野",       nameKo: "도미 인 삿포로 스스키노",     area: "Sapporo",       distanceKm: 48,  etaMin: 53,  priceJpy: 4200,  emoji: "🏨", lat: 43.0530, lng: 141.3552 },
    { id: "h-sap-comfort",     nameJa: "コンフォートホテル札幌すすきの", nameEn: "Comfort Hotel Sapporo Susukino",       nameZh: "康福特酒店札幌薄野",     nameKo: "컴포트 호텔 삿포로 스스키노", area: "Sapporo",       distanceKm: 48,  etaMin: 53,  priceJpy: 3800,  emoji: "🏨", lat: 43.0556, lng: 141.3573 },
    { id: "h-sap-daiwa-susuk", nameJa: "ダイワロイネットホテル札幌すすきの", nameEn: "Daiwa Roynet Hotel Sapporo Susukino", nameZh: "大和路内特酒店札幌薄野", nameKo: "다이와 로이넷 호텔 삿포로 스스키노", area: "Sapporo", distanceKm: 48, etaMin: 53, priceJpy: 4300, emoji: "🏨", lat: 43.0522, lng: 141.3560 },
    { id: "h-sap-toreijyu",    nameJa: "トレジャーホテル",               nameEn: "Treasure Hotel Sapporo",               nameZh: "宝藏酒店札幌",           nameKo: "트레저 호텔 삿포로",          area: "Sapporo",       distanceKm: 48,  etaMin: 53,  priceJpy: 4000,  emoji: "🏨", lat: 43.0533, lng: 141.3571 },

    // ── 札幌 — 東区・白石・豊平 ──
    { id: "h-sap-emisia",      nameJa: "ホテルエミシア札幌",             nameEn: "Hotel Emisia Sapporo",                 nameZh: "艾米西亚酒店札幌",       nameKo: "호텔 에미시아 삿포로",        area: "Sapporo",       distanceKm: 46,  etaMin: 50,  priceJpy: 4800,  emoji: "🏨", lat: 43.0435, lng: 141.4108 },

    // ─────────────────────────────────────────────
    // 小樽 (Otaru)
    // ─────────────────────────────────────────────
    { id: "h-otaru-gr",        nameJa: "小樽グランドホテル クラシック",  nameEn: "Otaru Grand Hotel Classic",            nameZh: "小樽大饭店经典",         nameKo: "오타루 그랜드 호텔 클래식",   area: "Otaru",         distanceKm: 70,  etaMin: 75,  priceJpy: 6500,  emoji: "🏨", lat: 43.1907, lng: 140.9947 },
    { id: "h-otaru-dormy",     nameJa: "ドーミーイン小樽",               nameEn: "Dormy Inn Otaru",                      nameZh: "多米旅馆小樽",           nameKo: "도미 인 오타루",              area: "Otaru",         distanceKm: 70,  etaMin: 75,  priceJpy: 6000,  emoji: "🏨", lat: 43.1920, lng: 140.9940 },
    { id: "h-otaru-sonya",     nameJa: "ホテルソニア小樽",               nameEn: "Hotel Sonya Otaru",                    nameZh: "索尼亚酒店小樽",         nameKo: "호텔 소냐 오타루",            area: "Otaru",         distanceKm: 70,  etaMin: 75,  priceJpy: 5500,  emoji: "🏨", lat: 43.1919, lng: 141.0019 },
    { id: "h-otaru-asari",     nameJa: "小樽朝里クラッセホテル",         nameEn: "Otaru Asari Klasse Hotel",             nameZh: "小樽朝里克拉斯酒店",     nameKo: "오타루 아사리 클라세 호텔",   area: "Otaru",         distanceKm: 68,  etaMin: 72,  priceJpy: 6000,  emoji: "🏨", lat: 43.1605, lng: 141.0220 },
    { id: "h-otaru-ospa",      nameJa: "小樽温泉オスパ",                 nameEn: "Otaru Onsen Ospa",                     nameZh: "小樽温泉OSPA",           nameKo: "오타루 온천 오스파",          area: "Otaru",         distanceKm: 70,  etaMin: 75,  priceJpy: 5500,  emoji: "🏨", lat: 43.1890, lng: 141.0030 },
    { id: "h-otaru-baycity",   nameJa: "ホテルノルド小樽",               nameEn: "Hotel Nord Otaru",                     nameZh: "北方酒店小樽",           nameKo: "호텔 노르드 오타루",          area: "Otaru",         distanceKm: 70,  etaMin: 75,  priceJpy: 5800,  emoji: "🏨", lat: 43.1930, lng: 141.0010 },
    { id: "h-otaru-omo5",      nameJa: "OMO5小樽 by 星野リゾート",       nameEn: "OMO5 Otaru by Hoshino Resorts",        nameZh: "OMO5小樽 星野度假村",    nameKo: "OMO5 오타루 by 호시노 리조트", area: "Otaru",         distanceKm: 70,  etaMin: 75,  priceJpy: 7500,  emoji: "🏨", lat: 43.1892, lng: 141.0038 },
  ],

  rideshare: [
    { destId: "sapporo_c",     riders: 3, savings: 1800 },
    { destId: "susukino",      riders: 2, savings: 1200 },
    { destId: "sapporo_s",     riders: 2, savings: 1500 },
    { destId: "otaru",         riders: 2, savings: 2000 },
    { destId: "tomakomai",     riders: 2, savings: 1000 },
    { destId: "kitahiroshima", riders: 3, savings: 1200 },
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
