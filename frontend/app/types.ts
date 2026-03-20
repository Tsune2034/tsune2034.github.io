export interface KeyEvent {
  title: string;
  region: string;
  severity: "critical" | "high" | "medium" | "low";
  summary: string;
  industry_impact: string;
  source_hint: string;
}

export interface RiskFactor {
  name: string;
  score: number;
  trend: "rising" | "stable" | "falling";
  description: string;
  business_impact: string;
}

export interface BriefingResponse {
  date: string;
  industry: string;
  language: string;
  overall_risk_score: number;
  risk_level: "critical" | "high" | "medium" | "low";
  executive_summary: string;
  key_events: KeyEvent[];
  risk_factors: RiskFactor[];
  recommended_actions: string[];
  alerts_triggered: string[];
  generated_at: string;
}

export interface BriefingRequest {
  industry: string;
  language: string;
  focus_regions?: string[];
  alert_thresholds?: Record<string, number>;
}

export interface Industry {
  value: string;
  label: string;
}

export interface Language {
  value: string;
  label: string;
}
