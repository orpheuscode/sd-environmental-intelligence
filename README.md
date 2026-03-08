<p align="center">
  <img src="https://github.com/user-attachments/assets/a63c6ca4-021f-4790-9dab-e045a3d76258" width="49%" />
  <img src="https://github.com/user-attachments/assets/2fb246a5-12cc-4e73-ac5d-093d9fd44d12" width="49%" />
</p>
# SD Environmental Intelligence

**The intelligence layer San Diego's coastline has always needed — owned by residents, built for officials.**

> Built at the Anthropic Claude Impact Lab · San Diego · March 2026
> By Quintin · Spire Labs

---

## The Problem

San Diego sits at the intersection of three environmental crises — Tijuana River sewage contamination, coastal bacteria levels routinely 100x above safe limits, and air quality that varies block by block. The data exists. The government agencies collect it. But it's locked in 11 separate databases, written in regulatory language, and updated on different schedules by different agencies.

The result: residents don't know if their beach is safe. City operations teams make resource decisions without synthesized intelligence. Elected officials pass resolutions without knowing if they're working.

**The gap isn't data. It's intelligence.**

---

## What It Does

SD Environmental Intelligence synthesizes real-time data from 11 government and environmental databases through three Claude AI agents, delivering a different view for every stakeholder:

### For Residents
Enter any San Diego address. In 15 seconds, receive a plain-language environmental health report covering air quality, drinking water safety, ocean water contamination risk, and specific action guidance — filtered and written for your exact location. Not regional averages. Your block.

### For City Operations
A 72-hour risk briefing built for emergency coordinators and public health teams. Post-rainfall contamination forecasting, resource deployment recommendations, and a prioritized action checklist — the kind of synthesis that currently takes an analyst hours to compile.

### For Legislators and Elected Officials
A regulatory accountability scorecard that cross-references active environmental resolutions against real monitoring data. Track which commitments are being met, which are delayed, and what the data says about why. Turn campaign promises into measurable, data-backed deliverables.

---

## The Demo

**Start here — the contrast story:**

**Address 1: 4500 Ocean Blvd, Pacific Beach, CA**
Run the Resident Report. AQI: Good. Drinking water: Compliant. Ocean bacteria: within range. This is what a healthy coastal reading looks like. Grade: B+.

**Address 2: 800 Seacoast Dr, Imperial Beach, CA**
Same interface. Different world. Risk score: **90 — CRITICAL**. Ocean bacteria at Station S0: 16,000 CFU/100mL — **154x the California limit**. Tijuana River outflow proximity: confirmed. Health advisory: in effect. This is a public health emergency hiding in plain sight, updated daily, visible to nobody until now.

Switch to **City Operations tab** — the same data becomes an emergency briefing. Six immediate actions, resource deployment timeline, inter-agency coordination checklist.

Switch to **Regulatory tab** — watch the resolutions passed in 2021-2023 get cross-referenced against what the monitoring data actually shows today.

**This is the pitch:** the data has always existed. Claude is the intelligence layer that makes it actionable for every person who needs it — from the surfer deciding whether to paddle out, to the councilmember deciding whether the remediation program is working.

---

## Demo Video
[60-second walkthrough — Imperial Beach CRITICAL RISK live demo](https://youtu.be/nHjXmAty3No)

---

## Architecture

```
User Address
     ↓
Census Geocoder → lat/lng coordinates
     ↓
MCP Server (7 async tools)
     ↓
┌────────────────────────────────────────┐
│  Resident Health Agent                 │
│  City Operations Agent        Claude   │
│  Regulatory Accountability Agent       │
└────────────────────────────────────────┘
     ↓
Next.js UI — 4 tabs, persistent state, streaming progress
```

**Data Sources (11 live feeds):**
- EPA AirNow — official AQI and PM2.5
- Purple Air — hyperlocal community sensors
- SD City Open Data (seshat.datasd.org) — drinking water chemistry, bacteria, ocean monitoring
- NOAA NWS — precipitation and forecast grid
- IBWC — Tijuana River flow and sewage event data
- SD County DEH — beach closure and advisory records
- CDC PLACES — census-tract health outcomes
- Census Geocoder — address resolution

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| AI Agents | Claude Sonnet 4 via Anthropic API |
| Orchestration | FastMCP + FastAPI (Python) |
| Frontend | Next.js 14, Tailwind CSS, TypeScript |
| Data Pipeline | httpx, BeautifulSoup4, pandas |
| Deployment | Local dev + GitHub |

---

## Running Locally

```bash
# Clone
git clone https://github.com/orpheuscode/sd-environmental-intelligence
cd sd-environmental-intelligence

# Add your API keys to .env
ANTHROPIC_API_KEY=your-key
AIRNOW_API_KEY=your-key
PURPLEAIR_API_KEY=your-key

# Backend
pip install -r requirements.txt
python -m uvicorn api:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

---

## The Bigger Picture

Every city in America has this problem. The data infrastructure exists. The government agencies collect it. The gap is always the same — synthesis, accessibility, and actionable intelligence for people who aren't data scientists.

SD Environmental Intelligence is a proof of concept for what civic AI looks like when it's built for residents first, officials second, and institutions third. Claude isn't replacing the government databases. It's making them legible.

**The Tijuana River has been contaminating San Diego's coastline for decades. The data has been public for years. This is what it looks like when someone finally connects the dots.**

---

## Team

**Quintin** — Founder, Spire Labs
*Autonomous systems for sovereign individuals.*
Built solo at the Claude Impact Lab Hackathon, San Diego, March 7 2026.

---

## Judging Criteria Alignment

| Criterion | What We Built |
|-----------|--------------|
| **Civic Impact (5pts)** | Three distinct user populations served: residents, city ops, legislators. Addresses an active public health crisis affecting hundreds of thousands of San Diegans. |
| **Use of City Data (5pts)** | 11 live data sources, 7 SD-specific datasets, real-time synthesis — not static analysis. |
| **Technical Execution (5pts)** | Full MCP server, three specialized Claude agents, streaming progress, persistent tab state, production build. |
| **Presentation & Story (5pts)** | Two-address contrast demo. Pacific Beach vs Imperial Beach. The gap is the story. |
