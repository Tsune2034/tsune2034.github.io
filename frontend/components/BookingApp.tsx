"use client";

import { useState, useEffect, useCallback } from "react";
import type { ZoneConfig, Destination, TerminalSpot } from "@/lib/zones/types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Step = "pickup" | "destination" | "luggage" | "confirm" | "matching" | "live";
type Locale = "en" | "ja" | "zh" | "ko";
type PayMethod = "credit" | "jpyc" | "usdc";

interface GpsCoord {
  lat: number;
  lng: number;
}

// ─── Zone data is passed via props (zone: ZoneConfig) ───
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
    pickup_tab_terminal: "Airport Terminal", pickup_tab_hotel: "Hotel / Other",
    pickup_hotel_placeholder: "Search hotel name…",
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
    summary_pickup: "Pickup", summary_dest: "Delivery", summary_bags: "Pieces", summary_total: "Total", fuel_surcharge_label: "Fuel Surcharge",
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
    email_label: "Email (optional)", email_ph: "your@email.com",
    pickup_date_label: "Pickup date (for early discount)",
    early_disc_48: "Early booking −¥2,500 (48h+ advance)",
    early_disc_24: "Early booking −¥1,500 (24–48h advance)",
    early_disc_hint: "Book 24h+ in advance for an early discount",
    reviews_title: "What travelers say",
    faq_title: "FAQ",
    faq: [
      { q: "What's the deadline to book?", a: "No deadline. You can book even after landing. Early booking gets you a discount." },
      { q: "Where do I hand over my bags?", a: "At the terminal exit / arrival hall. No dedicated counter — just meet our driver." },
      { q: "How long until bags arrive at my hotel?", a: "Typically 2–4 hours after pickup. Real-time tracking included." },
      { q: "What if my bags are lost or damaged?", a: "Covered up to ¥100,000 per booking." },
      { q: "Can I use KAIROX for hotel check-out too?", a: "Coming soon. Currently we operate inbound only (airport → hotel)." },
    ],
    contact_cta: "Still have questions?",
    contact_link: "Contact us",
  },
  ja: {
    brand: "KAIROX", tagline: "日本を、手ぶらで。",
    narita_badge: "Japan Luggage Freedom",
    hero: "着いた瞬間から、旅が始まる。",
    hero_sub: "荷物はホテルへ先着。カウンター不要・〆切なし。",
    step_pickup: "場所", step_dest: "届け先", step_luggage: "荷物", step_live: "追跡",
    pickup_title: "今どこにいますか？",
    pickup_tab_terminal: "空港ターミナル", pickup_tab_hotel: "ホテル・その他",
    pickup_hotel_placeholder: "ホテル名を検索…",
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
    summary_pickup: "集荷場所", summary_dest: "配達先", summary_bags: "個数", summary_total: "合計", fuel_surcharge_label: "燃油サーチャージ",
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
    email_label: "メール（任意）", email_ph: "your@email.com",
    pickup_date_label: "集荷日（早割適用）",
    early_disc_48: "早割 −¥2,500（48時間以上前）",
    early_disc_24: "早割 −¥1,500（24〜48時間前）",
    early_disc_hint: "24時間以上前の予約で早割が適用されます",
    reviews_title: "利用者の声",
    faq_title: "よくある質問",
    faq: [
      { q: "予約の締め切りはいつですか？", a: "締め切りなし。到着後でも予約できます。早めの予約で早割が適用されます。" },
      { q: "荷物はどこで渡しますか？", a: "ターミナル出口・到着ロビー。専用カウンター不要 — ドライバーが直接お迎えします。" },
      { q: "荷物はいつホテルに届きますか？", a: "受け取りから通常2〜4時間。リアルタイム追跡機能付き。" },
      { q: "荷物が紛失・破損した場合は？", a: "1回の予約につき最大¥100,000まで補償します。" },
      { q: "ホテルチェックアウト時にも使えますか？", a: "近日公開予定です。現在は空港→ホテルの片道のみ対応しています。" },
    ],
    contact_cta: "他にご不明な点はありますか？",
    contact_link: "お問い合わせはこちら",
  },
  zh: {
    brand: "KAIROX", tagline: "畅游日本，轻装出行。",
    narita_badge: "Japan Luggage Freedom",
    hero: "抵达成田，立刻出发。行李先到酒店。", hero_sub: "无需柜台，无截止时间。",
    step_pickup: "取件", step_dest: "目的地", step_luggage: "行李", step_live: "追踪",
    pickup_title: "您现在在哪里？",
    pickup_tab_terminal: "机场航站楼", pickup_tab_hotel: "酒店/其他",
    pickup_hotel_placeholder: "搜索酒店名称…",
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
    summary_pickup: "取件地点", summary_dest: "送达地点", summary_bags: "件数", summary_total: "合计", fuel_surcharge_label: "燃油附加费",
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
    email_label: "邮箱（选填）", email_ph: "your@email.com",
    pickup_date_label: "取件日期（早鸟优惠）",
    early_disc_48: "早鸟优惠 −¥2,500（提前48小时以上）",
    early_disc_24: "早鸟优惠 −¥1,500（提前24–48小时）",
    early_disc_hint: "提前24小时以上预订可享早鸟优惠",
    reviews_title: "旅客评价",
    faq_title: "常见问题",
    faq: [
      { q: "预订截止时间是什么时候？", a: "没有截止时间。落地后也可以预订。提前预订享受早鸟优惠。" },
      { q: "在哪里交行李？", a: "在航站楼出口/到达大厅。无需专用柜台 — 司机会直接来接。" },
      { q: "行李多久到达酒店？", a: "取件后通常2–4小时内送达，附实时追踪功能。" },
      { q: "行李丢失或损坏怎么办？", a: "每次预订最高赔偿¥100,000。" },
      { q: "酒店退房时也可以使用吗？", a: "即将推出。目前仅支持机场→酒店的单程服务。" },
    ],
    contact_cta: "还有其他问题？",
    contact_link: "联系我们",
  },
  ko: {
    brand: "KAIROX", tagline: "일본을 손 가볍게.",
    narita_badge: "Japan Luggage Freedom",
    hero: "나리타 도착, 바로 여행 시작. 짐은 호텔에서 만나요.", hero_sub: "카운터 불필요, 마감 없음.",
    step_pickup: "위치", step_dest: "목적지", step_luggage: "짐", step_live: "추적",
    pickup_title: "지금 어디 계세요?",
    pickup_tab_terminal: "공항 터미널", pickup_tab_hotel: "호텔/기타",
    pickup_hotel_placeholder: "호텔명 검색…",
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
    summary_pickup: "픽업 장소", summary_dest: "배송지", summary_bags: "개수", summary_total: "합계", fuel_surcharge_label: "유류 할증료",
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
    email_label: "이메일 (선택)", email_ph: "your@email.com",
    pickup_date_label: "픽업 날짜（얼리버드 할인）",
    early_disc_48: "얼리버드 −¥2,500（48시간 이상 전）",
    early_disc_24: "얼리버드 −¥1,500（24–48시간 전）",
    early_disc_hint: "24시간 이상 전 예약 시 얼리버드 할인 적용",
    reviews_title: "이용 후기",
    faq_title: "자주 묻는 질문",
    faq: [
      { q: "예약 마감은 언제인가요?", a: "마감 없음. 도착 후에도 예약 가능. 일찍 예약하면 얼리버드 할인 적용." },
      { q: "짐은 어디서 건네나요?", a: "터미널 출구/도착 로비. 전용 카운터 불필요 — 기사님이 직접 만나러 옵니다." },
      { q: "짐은 언제 호텔에 도착하나요?", a: "수령 후 보통 2~4시간 이내. 실시간 추적 기능 포함." },
      { q: "짐이 분실되거나 파손되면?", a: "1회 예약당 최대 ¥100,000까지 보상합니다." },
      { q: "호텔 체크아웃 시에도 이용 가능한가요?", a: "곧 출시 예정입니다. 현재는 공항→호텔 편도만 지원합니다." },
    ],
    contact_cta: "다른 궁금한 점이 있으신가요?",
    contact_link: "문의하기",
  },
} as const;

type Tr = Omit<{ [K in keyof typeof TR.en]: string }, "faq"> & { faq: readonly { q: string; a: string }[] };

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ja", label: "JA" },
  { value: "zh", label: "中" },
  { value: "ko", label: "한" },
];

const EXTRA_BAG = 1500;
const CARD_FEE = 0;
const CRYPTO_DISC = 0.05;
const FUEL_SURCHARGE = 500;

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
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#003fcc] inline-block"
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
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${done ? "bg-[#0052ff] text-white" : active ? "bg-[#0052ff] text-white ring-4 ring-[#0052ff]/20" : "bg-gray-100 border border-gray-300 text-gray-400"}`}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-[9px] mt-0.5 whitespace-nowrap ${active ? "text-[#0052ff] font-semibold" : "text-gray-400"}`}>{labels[i]}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mb-3.5 mx-1 ${done ? "bg-[#0052ff]" : "bg-gray-100"}`} />}
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
          <span className="text-[9px] text-[#0052ff]/70 normal-case">(APIキー未設定 — プロト表示)</span>
        )}
      </p>
      <div className="rounded-xl overflow-hidden border border-gray-300 h-44">
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
      <div className="rounded-xl overflow-hidden border border-gray-300 h-52">
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
        <div key={ring} className="absolute rounded-full border border-[#0052ff]/30"
          style={{ width: `${ring * 40}px`, height: `${ring * 40}px`, animation: `kxPing ${1 + ring * 0.3}s ease-out infinite`, opacity: 1 / ring }} />
      ))}
      <div className="relative z-10 w-12 h-12 rounded-full bg-[#0052ff]/10 border-2 border-[#0052ff] flex items-center justify-center text-2xl">🚐</div>
    </div>
  );
}

// AI Route Plan card
function AiRoutePlan({ route, tr }: { route: RouteSegment[]; tr: Tr }) {
  const totalMin = route.reduce((a, s) => a + s.etaMin, 0);
  return (
    <div className="bg-gray-100/60 border border-[#0052ff]/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#0052ff] flex items-center gap-1.5">
          <span className="text-sm">🤖</span> {tr.ai_route_title}
        </p>
        <span className="text-[9px] bg-[#eef2ff] border border-[#0052ff] text-[#0052ff] px-2 py-0.5 rounded-full font-bold">AI</span>
      </div>
      {route.map((seg, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">{seg.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-700 font-medium truncate">{i === 0 ? tr.ai_route_seg1 : tr.ai_route_seg2}</p>
            <p className="text-[10px] text-gray-400 truncate">{seg.from} → {seg.to}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold text-gray-900">{seg.etaMin}min</p>
            <p className="text-[10px] text-gray-400">{seg.distanceKm}km</p>
          </div>
        </div>
      ))}
      <div className="border-t border-gray-300 pt-2 flex items-center justify-between">
        <p className="text-[11px] text-gray-500">{tr.ai_route_total}</p>
        <p className="text-sm font-bold text-[#0052ff]">~{totalMin} min</p>
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
        <h2 className="text-lg font-bold text-gray-900">{tr.live_title}</h2>
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
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#0052ff] to-[#00b8d9] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{pickupLabel}</span>
          <span>{destName}</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {routeSteps.map((s, i) => {
          const done = i < phase, active = i === phase && phase < 3;
          return (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${done ? "border-gray-300 bg-gray-100/30 opacity-50" : active ? "border-[#0052ff] bg-[#eef2ff]/40" : "border-gray-200 bg-gray-50/30 opacity-30"}`}>
              <span className="text-xl">{s.icon}</span>
              <p className={`text-sm flex-1 ${done ? "line-through text-gray-400" : "text-gray-900 font-medium"}`}>{s.label}</p>
              {done && <span className="text-[#0052ff] font-bold">✓</span>}
              {active && <PulseDots />}
            </div>
          );
        })}
      </div>

      {phase >= 3 ? (
        <div className="text-center space-y-4 py-2">
          <div className="text-5xl">🎉</div>
          <p className="text-lg font-bold text-gray-900">{tr.live_done}</p>
          <button onClick={onReset} className="w-full py-3 rounded-xl bg-[#0052ff] text-white font-bold text-sm hover:bg-[#003fcc] transition-colors">{tr.new_btn}</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">{tr.driver_eta_label}</span>
            <span className="text-xl font-bold text-gray-900 tabular-nums">~{Math.max(1, Math.ceil((100 - progress) / 2))} min</span>
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
function RideShareTicker({ locale, tr, zone }: { locale: Locale; tr: Tr; zone: ZoneConfig }) {
  const items = zone.rideshare.map((rs) => {
    const dest = zone.destinations.find((d) => d.id === rs.destId);
    if (!dest) return null;
    const name = locale === "ja" ? dest.nameJa : locale === "zh" ? dest.nameZh : locale === "ko" ? dest.nameKo : dest.nameEn;
    return `🚐 ${rs.riders}${tr.rs_riders} · ${name} · ${tr.rs_save} ¥${rs.savings.toLocaleString()}`;
  }).filter(Boolean) as string[];

  const text = items.join("  　  ");

  return (
    <div className="bg-black/80 overflow-hidden h-7 flex items-center">
      <div className="flex whitespace-nowrap" style={{ animation: "kxTicker 28s linear infinite" }}>
        <span className="text-[11px] font-bold text-[#FFD600] pr-16">{text}</span>
        <span className="text-[11px] font-bold text-[#FFD600] pr-16">{text}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Rideshare Toast (フローティング通知)
// ─────────────────────────────────────────────
function RideshareToast({ locale, tr, zone, onJoin }: { locale: Locale; tr: Tr; zone: ZoneConfig; onJoin?: (destId: string) => void }) {
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
        setIdx((i) => (i + 1) % zone.rideshare.length);
        show();
      }, 12000);
      return () => clearInterval(interval);
    }, 5000);

    return () => clearTimeout(first);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rs = zone.rideshare[idx];
  const dest = zone.destinations.find((d) => d.id === rs.destId);
  if (!dest) return null;
  const name = locale === "ja" ? dest.nameJa : locale === "zh" ? dest.nameZh : locale === "ko" ? dest.nameKo : dest.nameEn;

  return (
    <div
      className="fixed bottom-24 left-4 z-40 max-w-[220px] transition-all duration-500"
      style={{ transform: visible ? "translateY(0)" : "translateY(140%)", opacity: visible ? 1 : 0 }}
    >
      <div className="bg-gray-50 border border-[#0052ff]/60 rounded-2xl p-3 shadow-xl space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🚐</span>
          <p className="text-[11px] font-bold text-[#0052ff]">{tr.rs_available}</p>
        </div>
        <p className="text-xs text-gray-900 font-semibold">{name}</p>
        <p className="text-[10px] text-gray-500">
          {rs.riders}{tr.rs_riders} · {tr.rs_save} <span className="text-green-400 font-bold">¥{rs.savings.toLocaleString()}</span>
        </p>
        {onJoin && (
          <button
            type="button"
            onClick={() => { setVisible(false); onJoin(rs.destId); }}
            className="w-full py-1.5 rounded-lg bg-[#0052ff] text-white text-[11px] font-bold hover:bg-[#003fcc] transition-colors"
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
        className="fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-[#0052ff] text-white shadow-lg flex items-center justify-center text-2xl hover:bg-[#003fcc] transition-all"
        aria-label="Open chat"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-gray-50 border border-gray-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "420px" }}>
          {/* Header */}
          <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-300 flex-shrink-0">
            <span className="text-[#0052ff] text-lg">🤖</span>
            <p className="text-sm font-bold text-gray-900">{tr.chat_title}</p>
            <span className="ml-auto text-[9px] bg-green-900 border border-green-700 text-green-400 px-2 py-0.5 rounded-full font-bold">AI</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {/* Welcome message */}
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-[#0052ff]/10 border border-[#0052ff]/30 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🤖</div>
              <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                <p className="text-xs text-gray-200 leading-relaxed">{tr.chat_welcome}</p>
              </div>
            </div>

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-[#0052ff]/10 border border-[#0052ff]/30 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🤖</div>
                )}
                <div className={`rounded-xl px-3 py-2 max-w-[85%] ${m.role === "user" ? "bg-[#0052ff] text-white rounded-tr-sm" : "bg-gray-100 text-gray-200 rounded-tl-sm"}`}>
                  <p className="text-xs leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-[#0052ff]/10 border border-[#0052ff]/30 flex items-center justify-center text-sm flex-shrink-0">🤖</div>
                <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2">
                  <PulseDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-300 flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={tr.chat_placeholder}
              className="flex-1 bg-gray-100 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0052ff] transition-colors"
            />
            <button type="button" onClick={send} disabled={!input.trim() || loading}
              className="px-3 py-2 rounded-xl bg-[#0052ff] text-white text-xs font-bold hover:bg-[#003fcc] transition-colors disabled:opacity-40 flex-shrink-0">
              {tr.chat_send}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// FAQ Accordion
// ─────────────────────────────────────────────
function FaqSection({ items, title }: { items: readonly { q: string; a: string }[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="px-4 pb-6 max-w-lg mx-auto w-full">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50/60 border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-xs font-semibold text-gray-200">{item.q}</span>
              <span className={`text-gray-500 text-xs transition-transform ${open === i ? "rotate-180" : ""}`}>▼</span>
            </button>
            {open === i && (
              <div className="px-4 pb-3">
                <p className="text-[11px] text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
export default function BookingApp({ zone }: { zone: ZoneConfig }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [step, setStep] = useState<Step>("pickup");

  // Service hours check
  const nowHour = new Date().getHours();
  const isOpen = nowHour >= SERVICE_OPEN_HOUR && nowHour < SERVICE_CLOSE_HOUR;

  // Pickup
  const [gpsStatus, setGpsStatus] = useState<"idle" | "detecting" | "ok" | "fail">("idle");
  const [gpsError, setGpsError] = useState<string>("");
  const [gpsCoord, setGpsCoord] = useState<GpsCoord | null>(null);
  const [terminal, setTerminal] = useState(zone.terminals[0].id);
  const [spot, setSpot] = useState<string>(zone.terminals[0].spots[0].id);
  const [manualLoc, setManualLoc] = useState("");
  const [pickupMode, setPickupMode] = useState<"terminal" | "hotel">("terminal");
  const [pickupHotel, setPickupHotel] = useState<Destination | null>(null);
  const [pickupHotelSearch, setPickupHotelSearch] = useState("");

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

  // 気象庁 天気警告
  const [weatherAlert, setWeatherAlert] = useState<{
    severe: boolean; typhoon: boolean; weather: string; pop: number;
  } | null>(null);
  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setWeatherAlert(d); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Luggage + payment
  const [bags, setBags] = useState(1);
  const [payMethod, setPayMethod] = useState<PayMethod>("credit");
  const [pickupDate, setPickupDate] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [flightNumber, setFlightNumber] = useState("");

  // Cancel
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Matching
  const [matchPhase, setMatchPhase] = useState<"searching" | "found">("searching");
  const [aiRoute, setAiRoute] = useState<RouteSegment[]>([]);
  const [bookingId, setBookingId] = useState(zone.bookingPrefix + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [bookingLoading, setBookingLoading] = useState(false);
  const [aiConfirmMsg, setAiConfirmMsg] = useState("");

  // Waitlist
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "loading" | "done">("idle");
  async function submitWaitlist() {
    if (!waitlistEmail.trim() || waitlistStatus !== "idle") return;
    setWaitlistStatus("loading");
    await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: waitlistEmail.trim(), zone: zone.id, locale }),
    }).catch(() => {});
    setWaitlistStatus("done");
  }

  const tr = TR[locale];
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

  // Derived pickup coords + label
  const terminalData = zone.terminals.find((t) => t.id === terminal) ?? zone.terminals[0];
  const pickupLat = gpsCoord?.lat ?? (pickupMode === "hotel" && pickupHotel ? pickupHotel.lat : terminalData.lat);
  const pickupLng = gpsCoord?.lng ?? (pickupMode === "hotel" && pickupHotel ? pickupHotel.lng : terminalData.lng);
  const terminalSpot = terminalData.spots.find((s) => s.id === spot) ?? terminalData.spots[0];
  const spotLabel = locale === "ja" ? terminalSpot.ja : locale === "zh" ? terminalSpot.zh : locale === "ko" ? terminalSpot.ko : terminalSpot.en;
  const hotelPickupName = pickupHotel ? (locale === "ja" ? pickupHotel.nameJa : locale === "zh" ? pickupHotel.nameZh : locale === "ko" ? pickupHotel.nameKo : pickupHotel.nameEn) : "";
  const pickupLabel =
    gpsStatus === "ok" && gpsCoord ? `GPS (${gpsCoord.lat.toFixed(4)}, ${gpsCoord.lng.toFixed(4)})` :
    manualLoc.trim() ? manualLoc.trim() :
    pickupMode === "hotel" && pickupHotel ? hotelPickupName :
    `${terminalData.labelEn} — ${spotLabel}`;

  // Price
  const base = dest ? dest.priceJpy + (bags - 1) * EXTRA_BAG : 0;
  const fuelSurcharge = dest ? FUEL_SURCHARGE : 0;
  const hoursUntilPickup = pickupDate ? (new Date(pickupDate).getTime() - Date.now()) / 3600000 : 0;
  const earlyDisc = pickupDate && hoursUntilPickup >= 48 ? 2500 : pickupDate && hoursUntilPickup >= 24 ? 1500 : 0;
  const afterEarlyDisc = Math.max(0, base - earlyDisc);
  const cryptoDisc = payMethod !== "credit" ? Math.floor(afterEarlyDisc * CRYPTO_DISC) : 0;
  const afterDisc = afterEarlyDisc - cryptoDisc;
  const cardFee = payMethod === "credit" ? Math.floor(afterDisc * CARD_FEE) : 0;
  const total = afterDisc + cardFee + fuelSurcharge;

  // GPS
  function handleGps() {
    if (!navigator.geolocation) {
      setGpsError(locale === "ja" ? "このブラウザはGPSに対応していません" : "Geolocation not supported");
      setGpsStatus("fail");
      return;
    }
    setGpsStatus("detecting");
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoord({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("ok");
      },
      (err) => {
        const msgs: Record<Locale, Record<number, string>> = {
          ja: {
            1: "位置情報の許可が必要です（ブラウザ設定で許可してください）",
            2: "現在地を取得できませんでした",
            3: "タイムアウトしました。再度お試しください",
          },
          en: {
            1: "Location permission denied — please allow in browser settings",
            2: "Position unavailable",
            3: "Timed out — please try again",
          },
          zh: {
            1: "请在浏览器设置中允许位置权限",
            2: "无法获取当前位置",
            3: "超时，请重试",
          },
          ko: {
            1: "브라우저 설정에서 위치 권한을 허용해주세요",
            2: "위치를 가져올 수 없습니다",
            3: "시간 초과, 다시 시도해주세요",
          },
        };
        setGpsError(msgs[locale][err.code] ?? String(err.message));
        setGpsStatus("fail");
      },
      { timeout: 10000, enableHighAccuracy: false, maximumAge: 30000 }
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
    step === "confirm" ? name.trim().length > 0 && flightNumber.trim().length > 0 :
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
    const firstTerminal = zone.terminals[0];
    setStep("pickup"); setGpsStatus("idle"); setGpsCoord(null); setManualLoc(""); setTerminal(firstTerminal.id); setSpot(firstTerminal.spots[0].id); setPickupDate(""); setFlightNumber("");
    setDest(null); setDestMode("area"); setHotelSearch(""); setBags(1); setPayMethod("credit"); setName(""); setPhone(""); setMatchPhase("searching");
    setBookingId(zone.bookingPrefix + Math.random().toString(36).slice(2, 8).toUpperCase());
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
          email: email.trim(),
          phone,
          locale,
          plan: "solo",
          extra_bags: Math.max(0, bags - 1),
          pickup_location: pickupLabel,
          destination: destName,
          zone: zone.id,
          hotel_name: destName,
          pay_method: payMethod,
          total_amount: total,
          pickup_date: pickupDate || undefined,
          flight_number: flightNumber.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.booking_id) setBookingId(data.booking_id);
        if (data.ai_message) setAiConfirmMsg(data.ai_message);
        // 確認メール送信（メールがある場合のみ）
        if (email.trim()) {
          fetch("/api/send-confirmation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.trim(),
              name: name.trim() || "Guest",
              booking_id: data.booking_id,
              destination: destName,
              total,
              locale,
            }),
          }).catch(() => {});
        }
      }
    } catch {
      // Keep frontend-generated ID as fallback
    }
    setBookingLoading(false);
    setStep("matching");
  }

  const destName = dest ? (locale === "ja" ? dest.nameJa : locale === "zh" ? dest.nameZh : locale === "ko" ? dest.nameKo : dest.nameEn) : "";

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20" style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.4)" }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight" style={{ background: "linear-gradient(135deg,#0052ff,#00b8d9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{tr.brand}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black text-[#FFD600]">{zone.i18n.badge[locale]}</span>
            </div>
            <p className="text-[10px] text-[#0052ff]/70 leading-none mt-0.5">{tr.tagline}</p>
          </div>
          <div className="flex items-center gap-0.5">
            {LOCALES.map((l) => (
              <button key={l.value} type="button" onClick={() => setLocale(l.value)}
                className={`px-2 py-1 rounded-md text-xs transition-all ${locale === l.value ? "bg-[#0052ff] text-white font-semibold" : "text-gray-500 hover:text-gray-700"}`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Beta Banner */}
      <div className="bg-amber-400 text-amber-900 text-center text-xs font-bold py-1.5 px-4">
        {{
          ja: "🚧 試作段階のプロトタイプです。正式リリースに向けて開発中。",
          en: "🚧 This is a prototype. Full service coming soon.",
          zh: "🚧 目前为试作阶段原型，正式版即将推出。",
          ko: "🚧 현재 시작 단계의 프로토타입입니다. 정식 출시 예정.",
        }[locale]}
      </div>

      {/* Rideshare Ticker */}
      <RideShareTicker locale={locale} tr={tr} zone={zone} />

      {/* 気象庁 悪天候バナー */}
      {weatherAlert?.severe && (
        <div className={`px-4 py-2.5 flex items-center gap-2 text-xs font-bold ${weatherAlert.typhoon ? "bg-red-900/90 text-red-100" : "bg-amber-900/90 text-amber-100"}`}>
          <span className="text-base">{weatherAlert.typhoon ? "🌀" : "⛈"}</span>
          <span>
            {weatherAlert.typhoon
              ? (locale === "ja" ? "台風・暴風警報 — 配達に遅延が生じる場合があります" : locale === "zh" ? "台风预警 — 配送可能延误" : locale === "ko" ? "태풍 경보 — 배송이 지연될 수 있습니다" : "Typhoon warning — Delays possible")
              : (locale === "ja" ? `悪天候予報（降水確率${weatherAlert.pop}%）— 配達に遅延が生じる場合があります` : locale === "zh" ? `恶劣天气预报（降水概率${weatherAlert.pop}%）— 配送可能延误` : locale === "ko" ? `악천후 예보（강수확률 ${weatherAlert.pop}%）— 배송이 지연될 수 있습니다` : `Severe weather forecast (Rain ${weatherAlert.pop}%) — Delays possible`)}
          </span>
          <span className="ml-auto text-[10px] opacity-60">{locale === "ja" ? "気象庁" : locale === "zh" ? "日本气象厅" : locale === "ko" ? "일본기상청" : "JMA"}</span>
        </div>
      )}

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5">

        {/* Hero */}
        {step === "pickup" && (
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{zone.i18n.hero[locale]}</h1>
            <p className="text-sm text-gray-500">{zone.i18n.hero_sub[locale]}</p>
          </div>
        )}

        {/* Closed banner */}
        {!isOpen && step === "pickup" && (
          <div className="bg-gray-100 border border-gray-300 rounded-2xl p-5 space-y-2 text-center">
            <p className="text-2xl">🌙</p>
            <p className="text-base font-bold text-gray-900">{tr.closed_title}</p>
            <p className="text-sm text-gray-500">{tr.closed_sub}</p>
            <p className="text-xs text-[#0052ff] mt-1">{tr.closed_chat}</p>
          </div>
        )}

        {/* Step bar */}
        {step !== "live" && <StepBar step={step} tr={tr} />}

        {/* ─── STEP: PICKUP ─── */}
        {step === "pickup" && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-5">
            <h2 className="text-base font-bold text-gray-900">{tr.pickup_title}</h2>

            {/* Active drivers */}
            {activeDrivers !== null && (
              <div className="flex items-center justify-center gap-2 text-[11px] rounded-full px-3 py-1.5 border border-green-800/40 bg-green-950/30 text-green-300">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" style={{ animation: "kxPulse 2s ease-in-out infinite" }} />
                {activeDrivers > 0
                  ? `${activeDrivers} driver${activeDrivers > 1 ? "s" : ""} active nearby`
                  : "Connecting drivers — please wait"}
              </div>
            )}

            {/* Pickup mode tabs */}
            <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
              {(["terminal", "hotel"] as const).map((mode) => (
                <button key={mode} type="button"
                  onClick={() => { setPickupMode(mode); setGpsStatus("idle"); setGpsCoord(null); setManualLoc(""); setPickupHotel(null); setPickupHotelSearch(""); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${pickupMode === mode ? "bg-[#0052ff] text-white" : "text-gray-500 hover:text-gray-200"}`}>
                  {mode === "terminal" ? tr.pickup_tab_terminal : tr.pickup_tab_hotel}
                </button>
              ))}
            </div>

            {pickupMode === "terminal" ? (<>
              {/* GPS button */}
              <button type="button" onClick={handleGps} disabled={gpsStatus === "detecting"}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                  gpsStatus === "ok" ? "border-green-500 bg-green-950/30 text-green-300" :
                  gpsStatus === "fail" ? "border-red-400/50 bg-red-950/20 text-red-400" :
                  gpsStatus === "detecting" ? "border-[#0052ff] bg-[#0052ff]/5 text-[#0052ff] cursor-wait" :
                  "border-[#0052ff] bg-[#0052ff]/10 text-[#0052ff] hover:bg-[#eef2ff]/50"
                }`}>
                <span className="text-xl">{gpsStatus === "ok" ? "✅" : gpsStatus === "fail" ? "📵" : gpsStatus === "detecting" ? "🔍" : "📍"}</span>
                <span>{gpsStatus === "detecting" ? tr.gps_detecting : gpsStatus === "ok" ? tr.gps_success : gpsStatus === "fail" ? tr.gps_fail : tr.gps_btn}</span>
                {gpsStatus === "detecting" && <PulseDots />}
              </button>
              {gpsStatus === "fail" && gpsError && (
                <p className="text-[11px] text-red-400 text-center px-2 -mt-1">{gpsError}</p>
              )}

              {/* Map: show when GPS detected */}
              {gpsStatus === "ok" && gpsCoord && (
                <MapPickup lat={gpsCoord.lat} lng={gpsCoord.lng} label={tr.map_label} locale={locale} />
              )}

              {/* Terminal selector */}
              {gpsStatus !== "ok" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">{tr.or_choose}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {zone.terminals.map((t) => (
                      <button key={t.id} type="button" onClick={() => { setTerminal(t.id); setSpot(t.spots[0].id); setManualLoc(""); }}
                        className={`px-2 py-2.5 rounded-xl border text-left transition-all ${terminal === t.id ? "border-[#0052ff] bg-[#eef2ff]/40" : "border-gray-300 bg-gray-100/50 hover:border-gray-300"}`}>
                        <p className={`text-xs font-semibold leading-tight ${terminal === t.id ? "text-[#0052ff]" : "text-gray-700"}`}>{t.labelEn}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{t.hint}</p>
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
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${active ? "border-[#0052ff] bg-[#eef2ff]/40" : "border-gray-300 bg-gray-100/50 hover:border-gray-300"}`}>
                            <span className="text-base flex-shrink-0">{s.icon}</span>
                            <span className={`text-xs font-medium leading-tight ${active ? "text-[#0052ff]" : "text-gray-700"}`}>{label}</span>
                            {active && <span className="ml-auto text-[#0052ff] text-xs flex-shrink-0">✓</span>}
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
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0052ff] transition-colors"
                />
              </div>
            </>) : (<>
              {/* Hotel pickup search */}
              <input type="text" value={pickupHotelSearch}
                onChange={(e) => setPickupHotelSearch(e.target.value)}
                placeholder={tr.pickup_hotel_placeholder}
                autoFocus
                className="w-full bg-gray-100 border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0052ff] transition-colors"
              />
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {zone.hotels.filter((h) => {
                  if (!pickupHotelSearch.trim()) return true;
                  const q = pickupHotelSearch.toLowerCase();
                  return h.nameEn.toLowerCase().includes(q) || h.nameJa.includes(pickupHotelSearch) || h.nameZh.includes(pickupHotelSearch) || h.nameKo.includes(pickupHotelSearch) || h.area.toLowerCase().includes(q);
                }).map((h) => {
                  const active = pickupHotel?.id === h.id;
                  const hName = locale === "ja" ? h.nameJa : locale === "zh" ? h.nameZh : locale === "ko" ? h.nameKo : h.nameEn;
                  return (
                    <button key={h.id} type="button" onClick={() => setPickupHotel(h)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${active ? "border-[#0052ff] bg-[#eef2ff]/40" : "border-gray-300 bg-gray-100/50 hover:border-gray-300"}`}>
                      <span className="text-xl flex-shrink-0">{h.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold leading-tight truncate ${active ? "text-[#0052ff]" : "text-gray-200"}`}>{hName}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{h.area}</p>
                      </div>
                      {active && <span className="text-[#0052ff] flex-shrink-0 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            </>)}
          </div>
        )}

        {/* ─── STEP: DESTINATION ─── */}
        {step === "destination" && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-bold text-gray-900">{tr.dest_title}</h2>

            {/* エリア / ホテル名 タブ */}
            <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
              {(["area", "hotel"] as const).map((mode) => (
                <button key={mode} type="button"
                  onClick={() => { setDestMode(mode); setHotelSearch(""); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${destMode === mode ? "bg-[#0052ff] text-white" : "text-gray-500 hover:text-gray-200"}`}>
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
                className="w-full bg-gray-100 border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0052ff] transition-colors"
                autoFocus
              />
            )}

            {/* リスト */}
            {(destMode === "area" ? zone.destinations : zone.hotels.filter((h) => {
              if (!hotelSearch.trim()) return true;
              const q = hotelSearch.toLowerCase();
              return h.nameEn.toLowerCase().includes(q) || h.nameJa.includes(hotelSearch) || h.nameZh.includes(hotelSearch) || h.nameKo.includes(hotelSearch) || h.area.toLowerCase().includes(q);
            })).map((d) => {
              const active = dest?.id === d.id;
              const dName = locale === "ja" ? d.nameJa : locale === "zh" ? d.nameZh : locale === "ko" ? d.nameKo : d.nameEn;
              const rs = destMode === "area" ? zone.rideshare.find((r) => r.destId === d.id) : null;
              return (
                <button key={d.id} type="button" onClick={() => setDest(d)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${active ? "border-[#0052ff] bg-[#eef2ff]/40" : "border-gray-300 bg-gray-100/50 hover:border-gray-300"}`}>
                  <span className="text-2xl flex-shrink-0">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-sm font-semibold leading-tight ${active ? "text-[#0052ff]" : "text-gray-200"}`}>{dName}</p>
                      {rs && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-900/60 border border-green-700/50 text-green-300 whitespace-nowrap">
                          🚐 {rs.riders}{tr.rs_riders}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{d.area} · {d.distanceKm}km</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${active ? "text-[#0052ff]" : "text-gray-700"}`}>{tr.dest_from} ¥{d.priceJpy.toLocaleString()}</p>
                    {rs ? (
                      <p className="text-[10px] text-green-400">{tr.rs_save} ¥{rs.savings.toLocaleString()}</p>
                    ) : (
                      <p className="text-[10px] text-gray-400">{tr.dest_eta} {d.etaMin}min</p>
                    )}
                  </div>
                  {active && <span className="text-[#0052ff] flex-shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── STEP: LUGGAGE + PAYMENT ─── */}
        {step === "luggage" && dest && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-5">
            <h2 className="text-base font-bold text-gray-900">{tr.luggage_title}</h2>

            {/* Bag counter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500">{tr.bags_label}</label>
                <span className="text-[10px] text-gray-400">🚐 {locale === "ja" ? `最大5個 / 車1台` : locale === "zh" ? `最多5件 / 1辆车` : locale === "ko" ? `최대 5개 / 차량 1대` : `Max 5 pcs / 1 vehicle`}</span>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setBags((b) => Math.max(1, b - 1))}
                  className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-300 text-gray-700 text-xl hover:bg-gray-700 transition-colors">−</button>
                <span className="text-3xl font-black text-gray-900 tabular-nums w-10 text-center">{bags}</span>
                <button type="button" onClick={() => setBags((b) => Math.min(5, b + 1))}
                  className={`w-10 h-10 rounded-xl border text-xl transition-colors ${bags >= 5 ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed" : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-700"}`}>＋</button>
                {bags > 1 && <p className="text-xs text-[#0052ff]">+¥{((bags - 1) * EXTRA_BAG).toLocaleString()} ({tr.per_extra})</p>}
              </div>
              {/* Capacity bar */}
              <div className="flex gap-1 pt-1">
                {[1,2,3,4,5].map((n) => (
                  <div key={n} className={`flex-1 h-1.5 rounded-full transition-colors ${n <= bags ? "bg-[#0052ff]" : "bg-gray-200"}`} />
                ))}
              </div>
              {bags >= 5 && (
                <p className="text-[11px] text-amber-400 font-medium">
                  {locale === "ja" ? "🚐 車1台の上限（5個）に達しました" : locale === "zh" ? "🚐 已达到单车上限（5件）" : locale === "ko" ? "🚐 차량 최대 수량(5개)에 도달했습니다" : "🚐 Vehicle capacity reached (5 pcs max)"}
                </p>
              )}
            </div>

            {/* Pickup date for early discount */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500">{tr.pickup_date_label}</label>
              <input
                type="date"
                value={pickupDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-[#0052ff]"
              />
              {pickupDate && earlyDisc > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 bg-green-500/15 border border-green-500/40 text-green-400 text-[11px] font-bold px-2.5 py-1 rounded-full">
                    🎉 {earlyDisc === 2500 ? tr.early_disc_48 : tr.early_disc_24}
                  </span>
                </div>
              )}
              {pickupDate && earlyDisc === 0 && (
                <p className="text-[10px] text-gray-400 mt-1">{tr.early_disc_hint}</p>
              )}
            </div>

            {/* Payment */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500">{tr.pay_title}</label>
              <div className="grid grid-cols-3 gap-2">
                {(["credit", "jpyc", "usdc"] as PayMethod[]).map((m) => {
                  const labels = { credit: tr.pay_credit, jpyc: tr.pay_jpyc, usdc: tr.pay_usdc };
                  return (
                    <button key={m} type="button" onClick={() => setPayMethod(m)}
                      className={`relative py-2.5 text-xs font-semibold rounded-xl transition-all ${payMethod === m ? (m === "jpyc" ? "bg-violet-500 text-gray-900" : "bg-[#0052ff] text-white") : "bg-gray-100 text-gray-500 hover:bg-gray-700"}`}>
                      {labels[m]}
                      {m !== "credit" && (
                        <span className="absolute -top-1.5 -right-1 text-[8px] font-bold text-gray-900 bg-green-500 px-1 py-0.5 rounded-full leading-none">
                          −5%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400">{payMethod === "credit" ? tr.card_fee_note : tr.crypto_note}</p>
            </div>

            {/* Price summary */}
            <div className="bg-gray-100/60 border border-[#0052ff]/20 rounded-xl p-4 space-y-2 text-sm">
              {[
                { label: tr.summary_pickup, val: pickupLabel, small: true },
                { label: tr.summary_dest, val: destName, small: true },
                { label: tr.summary_bags, val: `${bags} ${tr.pieces}`, small: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-gray-500">{row.label}</span>
                  <span className={`text-gray-700 ${row.small ? "text-xs max-w-[160px] truncate text-right" : ""}`}>{row.val}</span>
                </div>
              ))}
              {earlyDisc > 0 && <div className="flex items-center justify-between"><span className="text-green-400 text-xs">🎉 {earlyDisc === 2500 ? tr.early_disc_48 : tr.early_disc_24}</span><span className="text-green-400">−¥{earlyDisc.toLocaleString()}</span></div>}
              {cryptoDisc > 0 && <div className="flex items-center justify-between"><span className="text-green-400">JPYC/USDC discount</span><span className="text-green-400">−¥{cryptoDisc.toLocaleString()}</span></div>}
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>⛽ {tr.fuel_surcharge_label}</span>
                <span>+¥{fuelSurcharge.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-[#0052ff]/80 uppercase tracking-wide font-semibold">{tr.summary_total}</p>
                  <p className="text-[10px] text-gray-400">{tr.total_incl}</p>
                </div>
                <div className="text-right">
                  {earlyDisc > 0 && (
                    <p className="text-sm text-gray-400 line-through">¥{(base + fuelSurcharge).toLocaleString()}</p>
                  )}
                  <p className="text-3xl font-black text-gray-900">¥{total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP: CONFIRM ─── */}
        {step === "confirm" && dest && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">{tr.confirm_title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{tr.confirm_sub}</p>
            </div>

            {/* Name + Phone */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: tr.name_label, val: name, set: setName, ph: tr.name_ph, type: "text" },
                { label: tr.phone_label, val: phone, set: setPhone, ph: tr.phone_ph, type: "tel" },
              ].map((f) => (
                <div key={f.label} className="space-y-1">
                  <label className="text-xs text-gray-500">{f.label}</label>
                  <input type={f.type} value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
                    className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0052ff]" />
                </div>
              ))}
            </div>
            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">{tr.email_label}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tr.email_ph}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0052ff]" />
              <p className="text-[10px] text-gray-400">予約確認・追跡URLをお送りします / Confirmation & tracking link</p>
            </div>

            {/* Flight number — required */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">
                {locale === "ja" ? "✈️ フライト番号" : locale === "zh" ? "✈️ 航班号" : locale === "ko" ? "✈️ 항공편 번호" : "✈️ Flight Number"}
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                placeholder="NH847 / JL717 / KE705 / OZ101..."
                className={`w-full bg-gray-100 border rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 font-mono focus:outline-none transition-colors ${flightNumber.trim() ? "border-[#0052ff]" : "border-gray-300 focus:border-[#0052ff]"}`} />
              <p className="text-[10px] text-gray-400">
                {locale === "ja" ? "ドライバーが到着時刻を把握し、ルートを最適化します" : locale === "zh" ? "司机将根据到达时间优化路线" : locale === "ko" ? "드라이버가 도착 시간을 파악해 루트를 최적화합니다" : "Driver tracks your landing to optimize the route"}
              </p>
            </div>

            {/* Order recap */}
            <div className="bg-gray-100/60 border border-gray-300 rounded-xl p-3 space-y-1.5 text-xs">
              <p className="text-[10px] text-[#0052ff]/80 uppercase tracking-wide font-semibold mb-2">{tr.confirm_recap}</p>
              <div className="flex justify-between"><span className="text-gray-500">{tr.summary_pickup}</span><span className="text-gray-700 max-w-[160px] truncate text-right">{pickupLabel}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{tr.summary_dest}</span><span className="text-gray-700">{destName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{tr.summary_bags}</span><span className="text-gray-700">{bags} {tr.pieces}</span></div>
              {flightNumber.trim() && <div className="flex justify-between"><span className="text-gray-500">✈️ Flight</span><span className="text-gray-700 font-mono">{flightNumber.trim()}</span></div>}
              {earlyDisc > 0 && <div className="flex justify-between"><span className="text-green-400 text-xs">🎉 {earlyDisc === 2500 ? tr.early_disc_48 : tr.early_disc_24}</span><span className="text-green-400">−¥{earlyDisc.toLocaleString()}</span></div>}
              {cryptoDisc > 0 && <div className="flex justify-between"><span className="text-green-400">JPYC/USDC −5%</span><span className="text-green-400">−¥{cryptoDisc.toLocaleString()}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">⛽ {tr.fuel_surcharge_label}</span><span className="text-gray-700">+¥{fuelSurcharge.toLocaleString()}</span></div>
              <div className="border-t border-gray-300 pt-2 flex justify-between items-center">
                <span className="text-gray-500">{tr.summary_total}</span>
                <span className="text-2xl font-black text-gray-900">¥{total.toLocaleString()}</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex gap-2 flex-wrap">
              {["🔒 SSL Secured", "📦 Insured ¥100K", "24h Support"].map((b) => (
                <span key={b} className="text-[10px] bg-gray-100 border border-gray-300 text-gray-500 px-2 py-1 rounded-full">{b}</span>
              ))}
            </div>

            {/* Waitlist — テストラン中につき空き待ち登録 */}
            <div className="w-full rounded-xl bg-amber-50 border border-amber-300 p-4 space-y-3">
              <p className="text-sm font-bold text-amber-800">🚗 {{
                ja: "現在テストランを実施中です。空きが出次第ご案内します。",
                en: "We're running test operations. Register to be notified when available.",
                zh: "目前正在进行试运行，有空位时会第一时间通知您。",
                ko: "현재 테스트 운행 중입니다. 이용 가능 시 알림을 받으세요.",
              }[locale]}</p>
              {waitlistStatus === "done" ? (
                <p className="text-sm font-black text-green-700 text-center py-2">✅ {{
                  ja: "登録しました。空きが出次第ご連絡します！",
                  en: "Registered! We'll notify you when available.",
                  zh: "已登录！有空位时我们会通知您。",
                  ko: "등록되었습니다! 이용 가능 시 연락드리겠습니다。",
                }[locale]}</p>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={e => setWaitlistEmail(e.target.value)}
                    placeholder={{ ja: "メールアドレス", en: "Email address", zh: "电子邮件", ko: "이메일 주소" }[locale]}
                    className="flex-1 px-3 py-2 rounded-lg border border-amber-300 text-sm bg-white focus:outline-none focus:border-[#0052ff]"
                  />
                  <button
                    type="button"
                    onClick={submitWaitlist}
                    disabled={!waitlistEmail.trim() || waitlistStatus === "loading"}
                    className="px-4 py-2 rounded-lg bg-[#0052ff] text-white text-sm font-bold disabled:opacity-40"
                  >
                    {{ ja: "登録", en: "Notify me", zh: "登录", ko: "등록" }[locale]}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── STEP: MATCHING ─── */}
        {step === "matching" && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            {matchPhase === "searching" ? (
              <div className="py-6 space-y-6 text-center">
                <RadarPulse />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{tr.matching_title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{tr.matching_sub}</p>
                </div>
                {aiRoute.length > 0 && <AiRoutePlan route={aiRoute} tr={tr} />}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {["Locating drivers", "Calc route", "Optimizing ETA"].map((s, i) => (
                    <div key={i} className="bg-gray-100/60 rounded-xl py-3 px-1">
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
                  <h2 className="text-xl font-bold text-gray-900">{tr.matched_title}</h2>
                  <p className="text-sm text-gray-500">{tr.matched_sub}</p>
                </div>

                {/* AI confirmation message */}
                {aiConfirmMsg && (
                  <div className="bg-gray-100/60 border border-green-800/40 rounded-xl px-4 py-3 space-y-1">
                    <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">🤖 AI Confirmation</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{aiConfirmMsg}</p>
                  </div>
                )}

                {/* AI route (after match) */}
                {aiRoute.length > 0 && <AiRoutePlan route={aiRoute} tr={tr} />}

                {/* Route map preview */}
                {dest && <MapRoute pickupLat={pickupLat} pickupLng={pickupLng} destLat={dest.lat} destLng={dest.lng} label={`${pickupLabel} → ${destName}`} locale={locale} />}

                {/* Driver card */}
                <div className="bg-gray-100 border border-green-700/50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0052ff] to-[#003fcc] flex items-center justify-center text-xl font-black text-gray-900 flex-shrink-0">
                      {OPERATOR.initial}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{OPERATOR.name}</p>
                      <p className="text-xs text-gray-500">{OPERATOR.car}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#0052ff]">★ {OPERATOR.rating}</p>
                      <p className="text-[10px] text-gray-400">Verified</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-gray-500">{tr.driver_eta_label}</p>
                      <p className="text-lg font-bold text-gray-900">~{aiRoute[0]?.etaMin ?? 7} min</p>
                    </div>
                    <a href={`/narita/status/${bookingId}`} target="_blank" rel="noopener noreferrer"
                      className="bg-gray-50 rounded-xl px-3 py-2 block hover:bg-gray-100 transition-colors">
                      <p className="text-[10px] text-gray-500">Booking ID ↗</p>
                      <p className="text-sm font-bold text-[#0052ff] font-mono">{bookingId}</p>
                    </a>
                  </div>
                </div>

                {/* Pickup instruction + QR */}
                <div className="bg-[#0052ff]/10 border border-[#0052ff]/20 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-xs text-[#0052ff] font-semibold">📍 {tr.summary_pickup}</p>
                  <p className="text-sm text-gray-900 font-medium">{pickupLabel}</p>
                  <p className="text-[10px] text-gray-500">{tr.pickup_instruction}</p>
                  <div className="flex justify-center pt-1">
                    <div className="w-16 h-16 bg-white rounded-lg p-1 grid grid-cols-7 gap-0.5">
                      {Array.from({ length: 49 }).map((_, i) => {
                        const dark = [0,1,2,3,4,5,6,7,13,14,20,21,28,35,42,43,44,48].includes(i) || (Math.sin(i * 5.7) > 0.3);
                        return <div key={i} className={`rounded-sm ${dark ? "bg-gray-50" : "bg-white"}`} />;
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
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
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
                className="px-5 py-3 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                {tr.back}
              </button>
            )}
            {step !== "matching" && (
              <button type="button" onClick={next} disabled={!canNext}
                className="flex-1 py-3 rounded-xl bg-[#0052ff] text-white font-bold text-sm hover:bg-[#003fcc] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
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

      {/* FAQ */}
      <FaqSection items={tr.faq} title={tr.faq_title} />

      {/* Contact CTA */}
      <div className="px-4 pb-6 max-w-lg mx-auto w-full text-center">
        <p className="text-xs text-gray-400 mb-2">{tr.contact_cta}</p>
        <a
          href="/contact"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0052ff] hover:text-[#003fcc] border border-[#0052ff]/40 hover:border-[#0052ff] px-4 py-2 rounded-full transition-all"
        >
          ✉️ {tr.contact_link}
        </a>
      </div>

      {/* Reviews */}
      <section className="px-4 pb-8 max-w-lg mx-auto w-full">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{tr.reviews_title}</h2>
        <div className="space-y-3">
          {([
            { flag: "🇺🇸", name: "Sarah M.", from: "New York", stars: 5, text: { en: "Dropped my bags at the terminal and went straight to Shinjuku. Hotel had them before I even checked in. Pure magic.", ja: "ターミナルで荷物を預けてそのまま新宿へ。チェックイン前にホテルに届いていました。魔法みたい。", zh: "在航站楼放下行李直奔新宿，到酒店前行李已经在那里等我了。太神奇了！", ko: "터미널에 짐 맡기고 바로 신주쿠로 갔는데 체크인 전에 이미 호텔에 와 있었어요. 신기해요." } },
            { flag: "🇨🇳", name: "李 雪梅", from: "Shanghai", stars: 5, text: { en: "No counter, no deadline, no problem. Finally enjoyed arriving in Japan.", ja: "カウンターなし、締め切りなし、問題なし。日本到着をやっと楽しめました。", zh: "没有柜台、没有截止时间，完全无压力。终于享受到了抵达日本的感觉。", ko: "카운터도 없고 마감도 없어서 스트레스 없이 일본 도착을 즐겼어요." } },
            { flag: "🇰🇷", name: "김 지수", from: "Seoul", stars: 5, text: { en: "Used it with 3 bags. Driver was on time, tracking was real-time. Will use every trip.", ja: "スーツケース3個で利用。ドライバー時間通り、追跡もリアルタイム。毎回使います。", zh: "带了3个行李箱使用。司机准时，追踪是实时的。以后每次来都用。", ko: "캐리어 3개 들고 이용했어요. 기사님 정시에 오시고 실시간 추적도 돼요. 매번 쓸 것 같아요." } },
          ] as const).map((r) => (
            <div key={r.name} className="bg-gray-50/60 border border-gray-200 rounded-2xl px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{r.flag}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{r.name}</p>
                    <p className="text-[10px] text-gray-400">{r.from}</p>
                  </div>
                </div>
                <span className="text-[#0052ff] text-xs tracking-tight">{"★".repeat(r.stars)}</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                "{r.text[locale as keyof typeof r.text] ?? r.text.en}"
              </p>
            </div>
          ))}
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-gray-200 mt-8 py-6 px-4 max-w-lg mx-auto w-full">
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mb-3">
          {["📦 Luggage insured up to ¥100,000", "🔒 Secure payment", "24h support"].map((b) => (
            <span key={b} className="text-[10px] text-gray-400">{b}</span>
          ))}
        </div>
        <div className="flex justify-center gap-4 mb-2">
          <a href="/contact" className="text-[10px] text-gray-500 hover:text-[#0052ff] transition-colors">
            {locale === "ja" ? "お問い合わせ" : locale === "zh" ? "联系我们" : locale === "ko" ? "문의하기" : "Contact"}
          </a>
          <a href="/terms" className="text-[10px] text-gray-500 hover:text-[#0052ff] transition-colors">
            {locale === "ja" ? "利用規約" : locale === "zh" ? "服务条款" : locale === "ko" ? "이용약관" : "Terms"}
          </a>
          <a href="/privacy" className="text-[10px] text-gray-500 hover:text-[#0052ff] transition-colors">
            {locale === "ja" ? "プライバシー" : locale === "zh" ? "隐私政策" : locale === "ko" ? "개인정보" : "Privacy"}
          </a>
        </div>
        <p className="text-center text-[10px] text-gray-700">
          © 2025 KAIROX · Narita Beta
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
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 bg-white/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-gray-50 border border-red-800/50 rounded-2xl p-6 space-y-4">
            <div className="text-center space-y-1">
              <p className="text-2xl">⚠️</p>
              <h3 className="text-base font-bold text-gray-900">{tr.cancel_confirm_title}</h3>
              <p className="text-xs text-gray-500">{tr.cancel_confirm_sub}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowCancelModal(false)}
                className="py-3 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                {tr.cancel_confirm_no}
              </button>
              <button type="button" onClick={cancelBooking} disabled={cancelLoading}
                className="py-3 rounded-xl bg-red-600 text-gray-900 font-bold text-sm hover:bg-red-500 transition-colors disabled:opacity-40">
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
        zone={zone}
        onJoin={(destId) => {
          const d = zone.destinations.find((x) => x.id === destId);
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
