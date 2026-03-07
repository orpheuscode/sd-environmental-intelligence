# SD Environmental Intelligence
### Claude Impact Lab — City of San Diego Hackathon, March 7 2026

An environmental health intelligence platform for San Diego residents and city officials. Synthesizes air quality, drinking water, ocean water, precipitation, and regulatory data into actionable Claude-powered reports.

## What It Does

Three Claude agent outputs from a single address input:
- **Resident Report** — personal environmental health report with risk score, health guidance, and action checklist
- **City Operations** — post-rainfall hot zone briefing, resource allocation recommendations, 72-hour monitoring timeline
- **Regulatory Accountability** — compliance scorecard tracking city council environmental resolutions against actual monitoring data

## Team
- Quintin — Spire Labs / orpheuscode — solo

## Problem Statement
San Diego residents living near the Tijuana River have no single place to understand their real environmental health risk. City data exists but is scattered across a dozen databases nobody reads. We built the intelligence layer that makes it talk.

## Architecture
```
Address → Census Geocoder → lat/lng
→ MCP Server (7 tools) → 3 Claude Agents → Next.js UI
```

## Data Sources
- EPA AirNow — official AQI
- Purple Air — hyperlocal sensors  
- City of San Diego — drinking water chemical and bacteria monitoring
- City of San Diego — ocean RTOMS realtime water quality
- NOAA NWS — precipitation forecast
- IBWC — Tijuana River flow and water quality
- CDC PLACES — health outcomes by census tract
- Census Geocoder — address resolution

## Stack
Python + FastMCP + FastAPI + Claude API + Next.js 14 + Tailwind CSS

## Running Locally
```bash
cp env.template .env
# Add your API keys to .env

pip install -r requirements.txt
uvicorn api:app --reload --port 8000

cd frontend && npm install && npm run dev
```