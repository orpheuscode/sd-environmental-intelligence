# SD Environmental Intelligence
**Claude Impact Lab Hackathon — San Diego, March 7 2026**

An environmental health intelligence platform for San Diego residents and city officials.
Synthesizes air quality, drinking water, ocean water, precipitation, and regulatory data
into actionable reports — personal health reports for residents, hot zone risk maps for
city operations, and regulatory accountability scorecards for officials.

---

## Setup (do this before Saturday)

```bash
# 1. Clone / create project
mkdir sd-env-intelligence && cd sd-env-intelligence

# 2. Python environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.template .env
# Edit .env with your API keys

# 5. Verify all keys are set
python scrapers.py verify

# 6. Pre-fetch and cache data (run Thursday night)
python scrapers.py

# 7. Test MCP server
python mcp_server.py

# 8. Test agent pipeline
python agents.py "4500 Ocean Blvd, Pacific Beach" resident
```

---

## API Keys Needed (get before Saturday)

| Service | URL | Time to get | Cost |
|---------|-----|-------------|------|
| Anthropic | console.anthropic.com | instant | paid |
| EPA AirNow | airnowapi.org/login | instant | free |
| Purple Air | develop.purpleair.com | instant | free tier |
| SD Socrata | data.sandiego.gov/developers | instant | free |

No key needed: NOAA Weather, Census Geocoder, IBWC

---

## Architecture

```
User Address Input
       ↓
  [Geocoder] → lat/lng
       ↓
  [MCP Server] — 7 tools
  ├── get_air_quality()          → EPA AirNow + Purple Air
  ├── get_drinking_water_quality() → SD Socrata (4 datasets)
  ├── get_ocean_water_quality()  → SD RTOMS + IBWC
  ├── get_precipitation_data()   → NOAA NWS
  ├── get_contamination_risk_score() → synthesized prediction
  ├── get_regulatory_compliance() → municipal code + resolutions
  └── geocode_address()          → Census geocoder
       ↓
  [Agent Layer] — 3 Claude agents
  ├── Resident Health Agent      → personal health report
  ├── City Operations Agent      → hot zone map + resource allocation
  └── Regulatory Accountability  → compliance scorecard + wins/gaps
       ↓
  [Next.js UI] — 3 views
  ├── Resident tab
  ├── City Operations tab
  └── Accountability tab
```

---

## Data Sources

### City of San Diego (Socrata/SODA API)
- Chemical parameters in drinking water distribution system
- Indicator bacteria in drinking water
- Chemical parameters in water treatment plant effluents (incl. lead)
- Drinking water sample sites (geo coordinates)
- Ocean water quality (fecal indicator bacteria)
- RTOMS real-time water quality (BOD, chlorophyll, turbidity)
- RTOMS ocean chemistry (dissolved O2, CO2, nitrate, pH)
- RTOMS salinity and temperature

### External (free APIs)
- EPA AirNow — official AQI
- Purple Air — hyperlocal community sensors
- NOAA NWS — precipitation forecast and history
- Census Geocoder — address → lat/lng
- CDC PLACES — health outcomes by census tract
- IBWC — Tijuana River flow and water quality

### Scraped
- SD County beach closure status
- SD Municipal Code environmental sections
- SD Council resolutions (Granicus + official docs)
- NextRequest FOIA environmental records

---

## Demo Addresses (pre-test these)

| Address | Story |
|---------|-------|
| Imperial Beach (any) | TJ River proximity, highest risk |
| 4500 Ocean Blvd, Pacific Beach | Coastal, known respiratory issues |
| Ocean Beach (any) | Coastal + alleyway drainage |
| Chula Vista (any) | South county, border-adjacent |
| La Jolla (any) | Lower risk — good contrast case |

---

## Hackathon Day Build Order

1. `python scrapers.py verify` — confirm all keys work
2. Wire MCP server to live APIs, test each tool returns data
3. Build + test 3 agent prompts against live data
4. Connect to Next.js UI
5. Demo polish: run 3 real addresses, save outputs
6. Prep pitch: resident → city ops → accountability arc

---

## Post-Hackathon Roadmap

- Train proper ML model on historical precipitation + contamination correlation
- Wire regulatory compliance to live data (currently hardcoded known regulations)
- Add resident alert/notification layer (Twilio SMS)
- Add health outcome correlation (CDC PLACES + HCAI hospital data by zip)
- Build public-facing map with neighborhood heat scores
- Add more regulations from council resolution scraper
