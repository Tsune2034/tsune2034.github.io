"""
Kairox — Core Briefing Engine
Generates daily geopolitical intelligence briefings using Claude API + web search.
"""

import json
import os
import re
from datetime import datetime, timezone
from dotenv import load_dotenv
import anthropic
from .models import BriefingRequest, BriefingResponse, Industry, Language

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

INDUSTRY_CONTEXT = {
    Industry.manufacturing: "manufacturing companies (supply chain, raw materials, energy costs, factory operations)",
    Industry.trading:       "trading companies (import/export, tariffs, currency, commodity prices)",
    Industry.logistics:     "logistics and transportation companies (shipping routes, fuel costs, port disruptions)",
    Industry.finance:       "financial institutions (currency risk, interest rates, market volatility, sanctions)",
    Industry.tech:          "technology companies (semiconductor supply, data regulation, talent, infrastructure)",
    Industry.general:       "businesses across all sectors (broad economic and geopolitical impact)",
}

SYSTEM_PROMPT = """You are Kairox, an elite geopolitical intelligence analyst.
Your job: deliver concise, actionable briefings that help business leaders make better decisions in under one hour.

Rules:
- Be specific and factual. No vague statements.
- Every risk must connect directly to business impact.
- Score risks 0-100 (0=no risk, 100=existential threat).
- Write for C-suite executives who have 3 minutes to read.
- Always output valid JSON matching the schema provided.
- Never hallucinate sources. Mark uncertain items as "unconfirmed".
"""


def _build_prompt(req: BriefingRequest) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    industry_desc = INDUSTRY_CONTEXT[req.industry]
    regions = ", ".join(req.focus_regions) if req.focus_regions else "global"
    if req.language == Language.ja:
        lang_instruction = "Respond in Japanese (日本語)."
    elif req.language == Language.zh:
        lang_instruction = "Respond in Traditional Chinese (繁體中文). Use Taiwan-style Traditional Chinese."
    else:
        lang_instruction = "Respond in English."

    return f"""Today is {today}. {lang_instruction}

Search the web for the latest geopolitical and economic news from the past 24-48 hours.
Focus regions: {regions}
Target industry: {industry_desc}

Generate a geopolitical intelligence briefing as a JSON object with this exact structure:
{{
  "overall_risk_score": <int 0-100>,
  "risk_level": "<critical|high|medium|low>",
  "executive_summary": "<3-paragraph summary connecting world events to {req.industry} business impact>",
  "key_events": [
    {{
      "title": "<event title>",
      "region": "<region>",
      "severity": "<critical|high|medium|low>",
      "summary": "<2-3 sentence factual summary>",
      "industry_impact": "<direct impact on {req.industry} sector>",
      "source_hint": "<news source or region/outlet hint>"
    }}
  ],
  "risk_factors": [
    {{
      "name": "<risk name e.g. Oil Price, Supply Chain, Currency>",
      "score": <int 0-100>,
      "trend": "<rising|stable|falling>",
      "description": "<what is happening>",
      "business_impact": "<direct impact on {req.industry}>"
    }}
  ],
  "recommended_actions": [
    "<specific, actionable recommendation 1>",
    "<specific, actionable recommendation 2>",
    "<specific, actionable recommendation 3>"
  ]
}}

Include 3-6 key events and 4-6 risk factors. Focus on what changed in the last 48 hours."""


def _check_alerts(response: dict, thresholds: dict) -> list[str]:
    alerts = []
    for factor in response.get("risk_factors", []):
        name_lower = factor["name"].lower()
        if thresholds and "oil" in name_lower and "oil_usd" in thresholds:
            if factor["score"] >= 70:
                alerts.append(f"ALERT: Oil risk score {factor['score']}/100 — threshold {thresholds['oil_usd']} USD may be breached")
        if thresholds and ("yen" in name_lower or "jpy" in name_lower or "currency" in name_lower) and "usdjpy" in thresholds:
            if factor["score"] >= 65:
                alerts.append(f"ALERT: Currency risk score {factor['score']}/100 — JPY weakness risk (threshold {thresholds['usdjpy']})")
    if response.get("overall_risk_score", 0) >= 75:
        alerts.append(f"ALERT: Overall risk score {response['overall_risk_score']}/100 — elevated threat level")
    return alerts


def generate_briefing(req: BriefingRequest) -> BriefingResponse:
    prompt = _build_prompt(req)

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=16000,
        thinking={"type": "adaptive"},
        tools=[
            {"type": "web_search_20260209", "name": "web_search"},
        ],
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        # Use get_final_message() so all content blocks (thinking, tool_use,
        # tool_result, text) are fully assembled before we inspect them.
        # Manual delta accumulation is unreliable because tool calls and
        # thinking blocks share the same event stream as text blocks.
        message = stream.get_final_message()

    # Collect text only from text-type content blocks; skip thinking/tool blocks.
    full_text = "\n".join(
        block.text for block in message.content if block.type == "text"
    ).strip()

    raw_json = _extract_json(full_text)
    data = json.loads(raw_json)

    alerts = _check_alerts(data, req.alert_thresholds or {})

    return BriefingResponse(
        date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        industry=req.industry.value,
        language=req.language.value,
        overall_risk_score=data.get("overall_risk_score", 0),
        risk_level=data.get("risk_level", "low"),
        executive_summary=data.get("executive_summary", full_text),
        key_events=data.get("key_events", []),
        risk_factors=data.get("risk_factors", []),
        recommended_actions=data.get("recommended_actions", []),
        alerts_triggered=alerts,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


def _extract_json(text: str) -> str:
    """Extract the first valid JSON object from text.

    Handles:
    - Clean JSON output
    - JSON wrapped in markdown code fences (```json ... ```)
    - Preamble/postamble text around the JSON
    - Plain text with no JSON (falls back to {"briefing": <text>})

    The old brace-counting approach broke on JSON strings containing { or },
    e.g. {"key": "value with {braces}"}. Using json.JSONDecoder.raw_decode()
    is the correct way to find the end of a JSON value.
    """
    if not text:
        raise ValueError("Empty response from model")

    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = re.sub(r"\s*```", "", cleaned).strip()

    # Walk the string looking for a { that starts a valid JSON object.
    decoder = json.JSONDecoder()
    for i, ch in enumerate(cleaned):
        if ch != "{":
            continue
        try:
            obj, _ = decoder.raw_decode(cleaned, i)
            # Re-serialise so the caller always gets clean JSON.
            return json.dumps(obj, ensure_ascii=False)
        except json.JSONDecodeError:
            continue

    # No JSON found — wrap the plain text so the API never hard-crashes.
    return json.dumps({"briefing": text})


def print_briefing(b: BriefingResponse) -> None:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich import box

    console = Console()

    risk_color = {"critical": "red", "high": "orange3", "medium": "yellow", "low": "green"}
    color = risk_color.get(b.risk_level, "white")

    console.print(Panel(
        f"[bold]{b.date}  |  Industry: {b.industry.upper()}  |  Language: {b.language.upper()}[/bold]\n"
        f"Risk Score: [{color}]{b.overall_risk_score}/100 — {b.risk_level.upper()}[/{color}]",
        title="[bold cyan]KAIROX — Daily Intelligence Briefing[/bold cyan]",
        border_style="cyan",
    ))

    console.print("\n[bold]Executive Summary[/bold]")
    console.print(b.executive_summary)

    if b.alerts_triggered:
        console.print("\n[bold red]ALERTS[/bold red]")
        for alert in b.alerts_triggered:
            console.print(f"  [red]⚠ {alert}[/red]")

    console.print("\n[bold]Key Events[/bold]")
    for ev in b.key_events:
        sev_color = risk_color.get(ev.severity, "white")
        console.print(Panel(
            f"[bold]{ev.title}[/bold]  [{sev_color}]({ev.severity.upper()})[/{sev_color}]  | {ev.region}\n"
            f"{ev.summary}\n"
            f"[italic]Business impact:[/italic] {ev.industry_impact}\n"
            f"[dim]Source: {ev.source_hint}[/dim]",
            border_style=sev_color,
            box=box.SIMPLE,
        ))

    table = Table(title="Risk Factors", box=box.SIMPLE_HEAD)
    table.add_column("Factor", style="bold")
    table.add_column("Score", justify="center")
    table.add_column("Trend", justify="center")
    table.add_column("Business Impact")
    for rf in b.risk_factors:
        score_color = risk_color.get("critical" if rf.score >= 75 else "high" if rf.score >= 50 else "medium" if rf.score >= 25 else "low", "white")
        trend_icon = "↑" if rf.trend == "rising" else "↓" if rf.trend == "falling" else "→"
        table.add_row(rf.name, f"[{score_color}]{rf.score}[/{score_color}]", trend_icon, rf.business_impact)
    console.print(table)

    console.print("\n[bold]Recommended Actions[/bold]")
    for i, action in enumerate(b.recommended_actions, 1):
        console.print(f"  {i}. {action}")


if __name__ == "__main__":
    # Run as: python -m backend.briefing [industry] [language]
    import sys

    industry = Industry(sys.argv[1]) if len(sys.argv) > 1 else Industry.logistics
    language = Language(sys.argv[2]) if len(sys.argv) > 2 else Language.en

    req = BriefingRequest(
        industry=industry,
        language=language,
        focus_regions=["Middle East", "Japan", "China", "USA"],
        alert_thresholds={"oil_usd": 120, "usdjpy": 155},
    )

    print(f"Generating Kairox briefing for [{industry.value}] in [{language.value}]...")
    briefing = generate_briefing(req)
    print_briefing(briefing)
