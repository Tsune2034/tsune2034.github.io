"""
Kairox — FastAPI REST API
Endpoints for generating and retrieving geopolitical intelligence briefings.
"""

import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .models import BriefingRequest, BriefingResponse, Industry, Language
from .briefing import generate_briefing

load_dotenv()

app = FastAPI(
    title="Kairox Intelligence API",
    description="Geopolitical intelligence briefings powered by Claude AI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache for latest briefing per industry+language key
_briefing_cache: dict[str, BriefingResponse] = {}


def _cache_key(industry: str, language: str) -> str:
    return f"{industry}:{language}"


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@app.post("/briefing", response_model=BriefingResponse)
def create_briefing(req: BriefingRequest):
    """
    Generate a new geopolitical intelligence briefing.

    - industry: manufacturing | trading | logistics | finance | tech | general
    - language: en | ja | zh
    - focus_regions: optional list of regions to focus on
    - alert_thresholds: optional dict e.g. {"oil_usd": 120, "usdjpy": 155}
    """
    try:
        result = generate_briefing(req)
        key = _cache_key(req.industry.value, req.language.value)
        _briefing_cache[key] = result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/briefing/latest", response_model=BriefingResponse)
def get_latest_briefing(
    industry: Industry = Industry.general,
    language: Language = Language.en,
):
    """
    Retrieve the most recently generated briefing from cache.
    Returns 404 if no briefing has been generated yet for this industry/language.
    """
    key = _cache_key(industry.value, language.value)
    cached = _briefing_cache.get(key)
    if not cached:
        raise HTTPException(
            status_code=404,
            detail=f"No briefing found for industry={industry.value}, language={language.value}. Call POST /briefing first."
        )
    return cached


@app.get("/industries")
def list_industries():
    return [{"value": i.value, "label": i.value.capitalize()} for i in Industry]


@app.get("/languages")
def list_languages():
    return [
        {"value": "en", "label": "English"},
        {"value": "ja", "label": "日本語"},
        {"value": "zh", "label": "繁體中文"},
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
