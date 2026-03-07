# SD ENVIRONMENTAL INTELLIGENCE — CLAUDE CODE CONTEXT
# Drop this file into your project root as CLAUDE.md
# Claude Code reads this automatically at session start.

---

## WHO I AM / WHAT WE'RE BUILDING

This is **SD Environmental Intelligence** — a civic AI platform built for the
Anthropic Claude Impact Lab hackathon (San Diego, March 7 2026).

It synthesizes air quality, drinking water, ocean water, precipitation, and
regulatory data into three agent-powered outputs:

1. **Resident Health Report** — personal env health report for any SD address
2. **City Operations Dashboard** — post-rainfall hot zone risk map, resource allocation
3. **Regulatory Accountability Scorecard** — compliance tracking + political wins layer

Built solo by Quintin (Spire Labs) using Claude Code + Anthropic API.
Event is Saturday. Today is Wednesday. Ship priority over polish.

---

## PROJECT STRUCTURE

```
sd-env-intelligence/
├── CLAUDE.md               ← you are here
├── mcp_server.py           ← MCP server, 7 tools, all data connections
├── agents.py               ← 3 Claude agent system prompts + orchestrator
├── scrapers.py             ← pre-hackathon data prefetch + scrapers
├── requirements.txt
├── .env.template
├── .env                    ← local only, never commit
├── data_cache/             ← pre-fetched data from scrapers.py
└── frontend/               ← Next.js UI (to be built)
    ├── app/
    │   ├── page.tsx        ← main UI: address input + 3 tabs
    │   └── api/
    │       ├── report/route.ts      ← calls resident agent
    │       ├── city-ops/route.ts    ← calls city ops agent
    │       └── regulatory/route.ts ← calls regulatory agent
    ├── components/
    │   ├── AddressInput.tsx
    │   ├── ResidentReport.tsx
    │   ├── CityOpsView.tsx
    │   ├── RegulatoryScorecard.tsx
    │   └── RiskMap.tsx
    └── package.json
```

---

## ARCHITECTURE OVERVIEW

```
User Address Input
      ↓
[Census Geocoder] → lat/lng (free, no key)
      ↓
[MCP Server — mcp_server.py]
├── get_air_quality(lat, lng)
│   └── EPA AirNow API + Purple Air API
├── get_drinking_water_quality(lat, lng)
│   └── SD Socrata: chemical params, bacteria, plant effluent, sample sites
├── get_ocean_water_quality(lat, lng)
│   └── SD Socrata: ocean bacteria, RTOMS realtime, ocean chemistry + IBWC
├── get_precipitation_data(lat, lng)
│   └── NOAA NWS API (no key required)
├── get_contamination_risk_score(lat, lng, ...)
│   └── Synthesized heuristic model → 0-100 score + city recommendations
├── get_regulatory_compliance(topic)
│   └── Municipal code + council resolutions + monitoring data
└── geocode_address(address)
    └── Census Geocoder API (free, no key)
      ↓
[Agent Layer — agents.py] — 3 Claude agents
├── RESIDENT_AGENT_SYSTEM → run_resident_agent(env_data, address)
├── CITY_OPS_AGENT_SYSTEM → run_city_ops_agent(risk_data, neighborhood)
└── REGULATORY_AGENT_SYSTEM → run_regulatory_agent(regulation_data, audience)
      ↓
[Next.js Frontend — frontend/]
├── Tab 1: Resident Report
├── Tab 2: City Operations (risk map + recommendations)
└── Tab 3: Regulatory Scorecard
```

---

## DATA SOURCES — COMPLETE INVENTORY

### SD City Open Data (Socrata SODA API)
Base URL: `https://data.sandiego.gov/resource/`
App token env var: `SD_SOCRATA_APP_TOKEN`

| Dataset | Endpoint | Key Fields |
|---------|----------|-----------|
| Chemical params — drinking water | `monitoring-of-select-chemical-parameters-in-drinking-water.json` | fluoride, color, turbidity, date_collected |
| Bacteria — drinking water | `monitoring-of-indicator-bacteria-in-drinking-water.json` | bacteria levels, mcl_compliance, sample_date |
| Plant effluent chemicals | `monitoring-analytes-plant-effluent.json` | lead, alkalinity, hardness, fluoride, sample_date |
| Drinking water sample sites | `drinking-water-sample-sites.json` | latitude, longitude, site_id |
| Ocean water quality | `monitoring-ocean-water-quality.json` | fecal_coliform, enterococcus, sample_date |
| RTOMS water quality | `monitoring-ocean-rtoms-water-quality.json` | BOD, chlorophyll, CDOM, turbidity, date_time |
| RTOMS ocean chemistry | `monitoring-ocean-rtoms-ocean-chemistry.json` | dissolved_oxygen, xco2, nitrate, pH, date_time |
| RTOMS salinity | `monitoring-ocean-rtoms-salinity.json` | salinity, date_time |
| RTOMS water temp | `monitoring-ocean-rtoms-water-temperature.json` | temperature, date_time |
| Sediment quality | `monitoring-ocean-sediment-quality.json` | contaminant concentrations |
| Fish tissue contaminants | `monitoring-ocean-fish-tissue.json` | bioaccumulation by species |

### External APIs

| Source | Base URL | Key Env Var | Notes |
|--------|----------|-------------|-------|
| EPA AirNow | `https://www.airnowapi.org/aq/` | `AIRNOW_API_KEY` | Official AQI, PM2.5, ozone |
| Purple Air | `https://api.purpleair.com/v1/sensors` | `PURPLEAIR_API_KEY` | Hyperlocal community sensors |
| NOAA NWS | `https://api.weather.gov/` | none | Precip forecast + observations |
| Census Geocoder | `https://geocoding.geo.census.gov/` | none | Address → lat/lng |
| CDC PLACES | `https://data.cdc.gov/resource/cwsq-ngmh.json` | none | Health outcomes by census tract |
| IBWC | `https://www.ibwc.gov/` | none | TJ River flow + quality — scrape |

### Scraped Sources (no API)
- SD County beach closures: `sandiegocounty.gov/content/sdc/deh/water/beach.html`
- SD Municipal Code: `sandiego.gov/city-clerk/officialdocs/municipal-code`
- Council resolutions: `sandiego.granicus.com/ViewPublisher.php?view_id=31`
- NextRequest FOIA: `sandiego.nextrequest.com`

---

## ENVIRONMENT VARIABLES

```bash
ANTHROPIC_API_KEY=       # console.anthropic.com
AIRNOW_API_KEY=          # airnowapi.org/login (free, instant)
PURPLEAIR_API_KEY=       # develop.purpleair.com (free tier)
SD_SOCRATA_APP_TOKEN=    # data.sandiego.gov/developers (free, optional but recommended)
```

---

## MCP SERVER — mcp_server.py

7 tools exposed via FastMCP:

```python
get_air_quality(latitude, longitude) -> dict
get_drinking_water_quality(latitude, longitude) -> dict
get_ocean_water_quality(latitude, longitude) -> dict
get_precipitation_data(latitude, longitude) -> dict
get_contamination_risk_score(latitude, longitude, neighborhood?, hours_since_rain?, rainfall_inches?) -> dict
get_regulatory_compliance(topic) -> dict
geocode_address(address) -> dict
```

To run: `python mcp_server.py`
To add to Claude Code MCP config: point to this file with `fastmcp` runner.

---

## AGENT LAYER — agents.py

Three system prompts + runners:

```python
# Resident: personal health report
run_resident_agent(env_data: dict, address: str) -> str

# City ops: resource allocation + hot zone briefing
run_city_ops_agent(risk_data: dict, neighborhood: str, event_context: str) -> str

# Regulatory: compliance scorecard + wins/gaps
run_regulatory_agent(regulation_data: dict, audience: str) -> str
# audience: 'public' | 'official' | 'both'

# Full pipeline orchestrator
await run_full_pipeline(address: str, agent: str) -> dict
# agent: 'resident' | 'city' | 'regulatory' | 'all'
```

Model: `claude-sonnet-4-20250514`
Max tokens: 2000 per agent call

---

## FRONTEND — what needs to be built

### Stack
- Next.js 14 (app router)
- Tailwind CSS
- TypeScript

### UI Requirements

**Main page (page.tsx):**
- Address input with autocomplete or plain text
- "Analyze" button
- Loading state while agents run (this takes 10-20s — show progress)
- Three tabs: Resident Report / City Operations / Regulatory Scorecard
- Tab defaults to Resident on load

**Resident Report tab:**
- Environmental grade badge (A/B/C/D/F with color)
- Air quality card: AQI number + color + plain language
- Water quality card: key params + lead flag if elevated
- Ocean/coastal card: bacteria levels + beach status (show only if coastal)
- Health impact section: organ systems affected
- Action checklist: numbered, ranked by impact

**City Operations tab:**
- Risk score: large number (0-100) with color tier (green/yellow/orange/red)
- Risk factors list
- City recommendations: numbered action items
- Timestamp + data freshness indicator

**Regulatory Scorecard tab:**
- Regulations table: title | target | status badge | trend
- Status badges: ✅ EXCEEDED | ✓ MET | ⚠ IN PROGRESS | ❌ MISSED
- Wins summary section (collapsible)
- Accountability flags section (collapsible)
- "Export for campaign use" button (downloads PDF or copies to clipboard)

### API Routes needed

```
POST /api/report
  body: { address: string }
  calls: run_full_pipeline(address, 'resident')
  returns: { report: string, coordinates: {lat, lng}, raw_data: {...} }

POST /api/city-ops
  body: { address: string }
  calls: run_full_pipeline(address, 'city')
  returns: { report: string, risk_score: number, risk_tier: string }

POST /api/regulatory
  body: { topic: string, audience: string }
  calls: run_full_pipeline(address, 'regulatory')
  returns: { report: string, regulations: [...] }
```

### Design direction
- Dark background (#0f172a slate-900)
- Accent: electric blue (#3b82f6) for data, amber (#f59e0b) for warnings, red (#ef4444) for high risk
- Clean, data-forward — no decorative elements
- Mobile-first (judges may look on phones)
- City of San Diego data attribution in footer

---

## DEMO ADDRESSES (pre-test these before Saturday)

| Address | Why it's interesting |
|---------|---------------------|
| `800 Seacoast Dr, Imperial Beach, CA` | Closest to TJ River outflow, highest risk score expected |
| `4500 Ocean Blvd, Pacific Beach, CA` | Known respiratory issues in neighborhood |
| `4975 Voltaire St, Ocean Beach, CA` | Coastal + alleyway drainage pattern |
| `2650 Del Mar Heights Rd, Del Mar, CA` | Low risk — good contrast case |
| `1600 Pacific Hwy, San Diego, CA` | Downtown, useful for city ops demo |

---

## HACKATHON DAY PRIORITIES (in order)

1. Verify all API connections return live data
2. Run full pipeline on Imperial Beach address — get a working report
3. Build minimal UI: address input → resident report tab working
4. Add city ops tab
5. Add regulatory tab
6. Polish: loading states, error handling, demo addresses as quick-select buttons
7. Pre-run and screenshot demo addresses — have backup outputs ready

**If running out of time:** Cut regulatory tab from live demo, present as roadmap.
Resident report + risk score is the MVP that tells the story.

---

## PITCH NARRATIVE (3-beat arc)

**Beat 1 — Resident:** Type in a Pacific Beach address. Show the report.
"This is what every San Diego resident deserves to know about their air and water.
It's been sitting in city databases for years. Nobody made it accessible."

**Beat 2 — City Ops:** Show the risk score map after a rain event.
"The city can now pre-position resources before the complaints come in, not after.
This is the difference between reactive and predictive public health."

**Beat 3 — Regulatory:** Show the compliance scorecard.
"Every environmental regulation the city has passed is now tracked against
actual monitoring data. For officials: here's your data-backed proof of delivery.
Remember when we passed the measure to fix the TJ pollution? Here's the data
showing we actually did it — and by how much."

**Close:** "This runs on the city's own data. We just made it talk."

---

## COMMON TASKS FOR CLAUDE CODE

**"Wire up the MCP server to the frontend"**
→ Create Next.js API routes that import agents.py pipeline functions
→ Call run_full_pipeline() from API route handlers
→ Return structured JSON to frontend components

**"The Socrata API is returning empty data"**
→ Check endpoint slug — field names vary by dataset
→ Add `$limit=1` test first to verify connection
→ SD Socrata sometimes needs app token for reliability

**"Make the risk score update in real time"**
→ Use streaming response from the API route
→ Show partial agent output as it streams

**"Add a neighborhood comparison view"**
→ Run get_contamination_risk_score() for a grid of SD neighborhoods
→ Pre-compute scores for the 15 main SD neighborhoods
→ Display as a color-coded table or map overlay

**"The Purple Air bounding box is returning no sensors"**
→ Expand the bbox delta from 0.05 to 0.15
→ Some SD areas have sparse Purple Air coverage
→ Fallback gracefully to AirNow only with a note

---

## KNOWN ISSUES / WATCH OUT FOR

- IBWC API endpoint is not stable — verify URL before relying on it, scrape as fallback
- Socrata field names are inconsistent across datasets — inspect raw JSON before parsing
- Purple Air free tier has rate limits — cache results, don't hammer
- NOAA points API fails for offshore coordinates — add bounds check (SD is ~32.7°N, 117.2°W)
- Agent calls take 8-15 seconds — always show loading state, never let UI appear frozen
- Municipal code scraper may need session cookies — test before hackathon day

---

## POST-HACKATHON ROADMAP (mention in pitch)

- Train proper ML model on historical precip + contamination data (years available)
- Wire regulatory compliance to live data correlation (currently hardcoded known regs)
- Resident alert layer via Twilio SMS for post-rainfall advisories
- Health outcome correlation: CDC PLACES + HCAI hospital discharge data by zip
- Drone sensor network for hyperlocal air quality measurement (Spire Labs Robotics Division)
- License to other US-Mexico border cities: El Paso, Laredo, Brownsville

---

*Built by Quintin / Spire Labs — autonomous systems for sovereign individuals*
*Hackathon: Claude Impact Lab SD — March 7, 2026*
