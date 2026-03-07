"""
SD Environmental Intelligence — FastAPI HTTP Bridge
Exposes the agent pipeline as HTTP endpoints for the Next.js frontend.

Run with: uvicorn api:app --reload --port 8000
"""

import sys
import os
from pathlib import Path

# Ensure mcp_server and agents are importable from this directory
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic

from agents import run_full_pipeline

app = FastAPI(title="SD Environmental Intelligence API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request models ────────────────────────────────────────────────────────────

class AddressRequest(BaseModel):
    address: str

class RegulatoryRequest(BaseModel):
    address: str = "1600 Pacific Hwy, San Diego, CA"
    topic: str = "water quality"
    audience: str = "both"


class ExplainRequest(BaseModel):
    topic: str
    context: str = ""


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "SD Environmental Intelligence"}


# ── Resident health report ────────────────────────────────────────────────────

@app.post("/api/report")
async def resident_report(req: AddressRequest):
    """
    Full resident health report for a San Diego address.
    Returns: air quality, water quality, ocean quality, risk score, and
    a plain-language personal health report from the Resident Agent.
    """
    result = await run_full_pipeline(req.address.strip(), "resident")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ── City operations briefing ──────────────────────────────────────────────────

@app.post("/api/city-ops")
async def city_ops_report(req: AddressRequest):
    """
    City operations briefing for a location.
    Returns: contamination risk score, hot zone analysis, resource allocation
    recommendations from the City Ops Agent.
    """
    result = await run_full_pipeline(req.address.strip(), "city")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ── Regulatory accountability scorecard ──────────────────────────────────────

@app.post("/api/regulatory")
async def regulatory_report(req: RegulatoryRequest):
    """
    Regulatory compliance scorecard for SD environmental regulations.
    Does not require a specific address — uses city-wide regulation data.
    Returns: scorecard, wins summary, accountability flags from Regulatory Agent.
    """
    result = await run_full_pipeline(req.address.strip(), "regulatory")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ── Inline regulation explanation (streaming) ────────────────────────────────

@app.post("/api/explain")
async def explain_regulation(req: ExplainRequest):
    """
    Stream a plain-language explanation of an environmental regulation or topic.
    Uses Claude Haiku for speed. Returns text/plain stream.
    """
    _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    prompt = (
        f"You are a clear, accessible environmental policy communicator.\n\n"
        f"Explain in 2–3 sentences why this San Diego environmental regulation or "
        f"topic matters to residents: \"{req.topic}\""
        + (f"\n\nContext: {req.context}" if req.context else "")
        + "\n\nBe specific about real-world health and quality-of-life impacts. "
        "Use plain English — no jargon. Reference actual San Diego geography or communities where relevant."
    )

    def generate():
        with _client.messages.stream(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8")


# ── All agents in one call ────────────────────────────────────────────────────

@app.post("/api/analyze")
async def analyze_all(req: AddressRequest):
    """
    Run all three agents for a single address.
    Returns all three reports plus raw environmental data.
    Note: this takes 30-60 seconds (three Claude API calls sequentially).
    """
    result = await run_full_pipeline(req.address.strip(), "all")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
