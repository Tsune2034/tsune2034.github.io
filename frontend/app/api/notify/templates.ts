/** KAIROXイベント → メッセージテンプレート */
export const MESSAGE_TEMPLATES = {
  /** 着陸検知 → ドライバーへ */
  landing: (flightNo: string, terminal: string, minutesLeft: number) =>
    `✈️ [KAIROX] ${flightNo}が着陸しました。${terminal}出口に${minutesLeft}分後にお客様が出てきます。`,

  /** 予約確定 → ドライバーへ */
  booking_assigned: (krxId: string, pickup: string, dropoff: string) =>
    `📦 [KAIROX] 新規案件 ${krxId}\n集荷: ${pickup}\n配達: ${dropoff}`,

  /** ドライバー到着 → 顧客へ */
  driver_arrived: (terminal: string) =>
    `🚗 [KAIROX] Your driver has arrived at ${terminal}. Please head to the exit.`,

  /** カスタムメッセージ */
  custom: (text: string) => text,
} as const;
