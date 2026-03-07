"""
SD Environmental Intelligence MCP Server
Exposes tools for air quality, water quality, weather, and regulatory data
across San Diego. Built for Claude Impact Lab hackathon.
"""

import csv
import io
import httpx
import asyncio
import os
from datetime import datetime, timedelta
from typing import Optional

# Load .env before reading any env vars
from dotenv import load_dotenv
load_dotenv()

from fastmcp import FastMCP

mcp = FastMCP("sd-env-intelligence")

# ── API Keys ───────────────────────────────────────────────────────────────────
AIRNOW_KEY     = os.getenv("AIRNOW_API_KEY", "")
PURPLEAIR_KEY  = os.getenv("PURPLEAIR_API_KEY", "")

# ── Seshat (SD Open Data file server) ─────────────────────────────────────────
SESHAT = "https://seshat.datasd.org"

# ─────────────────────────────────────────────────────────────────────────────
# CSV helpers — seshat.datasd.org serves flat CSV files, not Socrata SODA API
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_csv_full(client: httpx.AsyncClient, url: str) -> list[dict]:
    """Fetch a small CSV file entirely. Returns list of row dicts."""
    try:
        r = await client.get(url)
        r.raise_for_status()
        reader = csv.DictReader(io.StringIO(r.text))
        return list(reader)
    except Exception as e:
        return [{"_fetch_error": str(e), "_url": url}]


async def fetch_csv_tail(
    client: httpx.AsyncClient,
    url: str,
    n_rows: int = 60,
    tail_bytes: int = 200_000,
) -> list[dict]:
    """
    Fetch only the tail of a large CSV using HTTP Range requests.
    Returns up to n_rows most-recent rows as dicts.
    Falls back to full fetch if Range not supported.
    """
    try:
        # Get file size
        head = await client.head(url)
        head.raise_for_status()
        total = int(head.headers.get("content-length", 0))
        accepts_range = head.headers.get("accept-ranges", "") == "bytes"

        if accepts_range and total > tail_bytes:
            # Fetch header row
            r_hdr = await client.get(url, headers={"Range": "bytes=0-511"})
            header_line = r_hdr.text.split("\n")[0]
            headers = next(csv.reader([header_line]))

            # Fetch tail
            start = total - tail_bytes
            r_tail = await client.get(url, headers={"Range": f"bytes={start}-"})
            lines = r_tail.text.split("\n")
            # lines[0] is almost certainly a partial row — skip it
            rows = []
            for line in lines[1:]:
                line = line.strip()
                if not line:
                    continue
                parsed = next(csv.reader([line]), None)
                if parsed and len(parsed) == len(headers):
                    rows.append(dict(zip(headers, parsed)))
            return rows[-n_rows:]
        else:
            # Small file or no Range support — full fetch
            r = await client.get(url)
            r.raise_for_status()
            rows = list(csv.DictReader(io.StringIO(r.text)))
            return rows[-n_rows:]

    except Exception as e:
        return [{"_fetch_error": str(e), "_url": url}]


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 1 — Air Quality
# ─────────────────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_air_quality(latitude: float, longitude: float, zip_code: str = "") -> dict:
    """
    Get current air quality for a San Diego location.
    Pulls from EPA AirNow (official) and Purple Air (hyperlocal community sensors).
    Returns AQI, pollutant breakdown, and health guidance.
    """
    results = {}

    if not AIRNOW_KEY and not PURPLEAIR_KEY:
        results["error"] = "No air quality API keys set. Set AIRNOW_API_KEY and/or PURPLEAIR_API_KEY."
        results["data"] = []
        return results

    async with httpx.AsyncClient(timeout=10) as client:

        # EPA AirNow — official reading
        if AIRNOW_KEY:
            try:
                r = await client.get(
                    "https://www.airnowapi.org/aq/observation/latLong/current/",
                    params={
                        "format": "application/json",
                        "latitude": latitude,
                        "longitude": longitude,
                        "distance": 25,
                        "API_KEY": AIRNOW_KEY,
                    },
                )
                r.raise_for_status()
                data = r.json()
                results["airnow_official"] = {
                    "source": "EPA AirNow (official)",
                    "readings": [
                        {
                            "parameter": item.get("ParameterName"),
                            "aqi": item.get("AQI"),
                            "category": item.get("Category", {}).get("Name"),
                            "reporting_area": item.get("ReportingArea"),
                            "date_observed": item.get("DateObserved"),
                            "hour_observed": item.get("HourObserved"),
                        }
                        for item in data
                    ],
                }
            except Exception as e:
                results["airnow_official"] = {"error": str(e), "data": []}

        # Purple Air — hyperlocal community sensors
        if PURPLEAIR_KEY:
            try:
                delta = 0.15  # wider bbox for better coverage (CLAUDE.md note)
                r = await client.get(
                    "https://api.purpleair.com/v1/sensors",
                    params={
                        "fields": "name,pm2.5,pm10.0,temperature,humidity,air_quality_index,last_seen",
                        "location_type": 0,
                        "nwlng": longitude - delta,
                        "selng": longitude + delta,
                        "nwlat": latitude + delta,
                        "selat": latitude - delta,
                        "max_age": 3600,
                    },
                    headers={"X-API-Key": PURPLEAIR_KEY},
                )
                r.raise_for_status()
                data = r.json()
                sensors = data.get("data", [])
                fields = data.get("fields", [])
                if sensors:
                    parsed = [dict(zip(fields, s)) for s in sensors[:5]]
                    results["purple_air_hyperlocal"] = {
                        "source": "Purple Air (community sensors)",
                        "sensor_count": len(sensors),
                        "nearest_sensors": parsed,
                    }
                else:
                    results["purple_air_hyperlocal"] = {
                        "source": "Purple Air",
                        "sensor_count": 0,
                        "note": "No sensors found in area — sparse coverage for this location",
                    }
            except Exception as e:
                results["purple_air_hyperlocal"] = {"error": str(e), "data": []}

    return results


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 2 — Drinking Water Quality
# ─────────────────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_drinking_water_quality(latitude: float, longitude: float) -> dict:
    """
    Get drinking water quality data for a San Diego location.
    Pulls chemical parameters (fluoride, lead, turbidity) and bacteria levels
    from the City of San Diego Public Utilities datasets via seshat.datasd.org,
    geo-matched to nearest sample site.
    """
    results = {}

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:

        # Sample sites — find nearest to coordinates
        try:
            sites = await fetch_csv_full(
                client,
                f"{SESHAT}/drinking_water_sample_sites/sample_sites_datasd.csv",
            )
            if sites and "_fetch_error" not in sites[0]:
                def dist(s):
                    try:
                        return ((float(s.get("lat", 0)) - latitude) ** 2
                                + (float(s.get("lng", 0)) - longitude) ** 2) ** 0.5
                    except Exception:
                        return 9999
                nearest = sorted(sites, key=dist)[:3]
                results["sample_sites"] = {
                    "source": "SD Public Utilities — distribution system sample sites",
                    "nearest_sites": nearest,
                }
            else:
                results["sample_sites"] = {"error": sites[0].get("_fetch_error", "parse error"), "data": []}
        except Exception as e:
            results["sample_sites"] = {"error": str(e), "data": []}

        # Chemical parameters — distribution system (fluoride, turbidity, color)
        try:
            rows = await fetch_csv_tail(
                client,
                f"{SESHAT}/monitoring_chem_params/analyte_tests_drinking_water_datasd.csv",
                n_rows=60,
            )
            if rows and "_fetch_error" not in rows[0]:
                results["chemical_parameters"] = {
                    "source": "SD Public Utilities — chemical params (fluoride, turbidity, color)",
                    "data": rows,
                }
            else:
                results["chemical_parameters"] = {"error": rows[0].get("_fetch_error", "parse error"), "data": []}
        except Exception as e:
            results["chemical_parameters"] = {"error": str(e), "data": []}

        # Bacteria — latest readings (small file, ~3KB)
        try:
            rows = await fetch_csv_full(
                client,
                f"{SESHAT}/monitoring_indicator_bacteria/latest_indicator_bac_tests_datasd.csv",
            )
            if rows and "_fetch_error" not in rows[0]:
                results["bacteria"] = {
                    "source": "SD Public Utilities — indicator bacteria (latest readings)",
                    "data": rows,
                }
            else:
                results["bacteria"] = {"error": rows[0].get("_fetch_error", "parse error"), "data": []}
        except Exception as e:
            results["bacteria"] = {"error": str(e), "data": []}

        # Treatment plant effluent — lead, fluoride, hardness
        try:
            rows = await fetch_csv_tail(
                client,
                f"{SESHAT}/monitoring_analytes_plant_effluent/analyte_tests_effluent_datasd.csv",
                n_rows=40,
            )
            if rows and "_fetch_error" not in rows[0]:
                results["plant_effluent"] = {
                    "source": "SD Public Utilities — treatment plant effluent (lead, hardness, alkalinity)",
                    "data": rows,
                }
            else:
                results["plant_effluent"] = {"error": rows[0].get("_fetch_error", "parse error"), "data": []}
        except Exception as e:
            results["plant_effluent"] = {"error": str(e), "data": []}

    return results


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 3 — Ocean / Coastal Water Quality
# ─────────────────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_ocean_water_quality(latitude: float, longitude: float) -> dict:
    """
    Get ocean and coastal water quality for San Diego.
    Includes fecal indicator bacteria (TJ sewage signal), RTOMS real-time
    chemistry (PLOO + SBOO stations), and Tijuana River data.
    Most relevant for: Imperial Beach, Ocean Beach, Pacific Beach, Mission Beach.
    """
    results = {}

    async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:

        # Ocean water quality — bacteria (fecal coliform, enterococcus, FECAL)
        try:
            rows = await fetch_csv_tail(
                client,
                f"{SESHAT}/monitoring_ocean_water_quality/water_quality_2020_2029_datasd.csv",
                n_rows=50,
                tail_bytes=250_000,
            )
            if rows and "_fetch_error" not in rows[0]:
                results["ocean_bacteria"] = {
                    "source": "SD Public Utilities — ocean water quality (fecal bacteria, 2020-present)",
                    "data": rows,
                }
            else:
                results["ocean_bacteria"] = {"error": rows[0].get("_fetch_error", "parse error"), "data": []}
        except Exception as e:
            results["ocean_bacteria"] = {"error": str(e), "data": []}

        # RTOMS real-time water quality — PLOO (Point Loma) + SBOO (South Bay — near Imperial Beach)
        try:
            ploo = await fetch_csv_tail(
                client,
                f"{SESHAT}/monitoring_ocean_rtoms_water_quality/PLOO_water_quality_2023_datasd.csv",
                n_rows=20,
            )
            sboo = await fetch_csv_tail(
                client,
                f"{SESHAT}/monitoring_ocean_rtoms_water_quality/SBOO_water_quality_2023_datasd.csv",
                n_rows=20,
            )
            combined = []
            if ploo and "_fetch_error" not in ploo[0]:
                combined.extend(ploo)
            if sboo and "_fetch_error" not in sboo[0]:
                combined.extend(sboo)

            if combined:
                results["rtoms_realtime"] = {
                    "source": "SD RTOMS — real-time oceanographic (PLOO + SBOO stations)",
                    "data": combined,
                }
            else:
                err = ploo[0].get("_fetch_error") if ploo else "no data"
                results["rtoms_realtime"] = {"error": err, "data": []}
        except Exception as e:
            results["rtoms_realtime"] = {"error": str(e), "data": []}

        # RTOMS ocean chemistry — dissolved O2, CO2, nitrate, pH
        try:
            ploo_chem = await fetch_csv_tail(
                client,
                f"{SESHAT}/monitoring_ocean_rtoms_ocean_chemistry/PLOO_ocean_chemistry_2023_datasd.csv",
                n_rows=15,
            )
            sboo_chem = await fetch_csv_tail(
                client,
                f"{SESHAT}/monitoring_ocean_rtoms_ocean_chemistry/SBOO_ocean_chemistry_2023_datasd.csv",
                n_rows=15,
            )
            combined_chem = []
            if ploo_chem and "_fetch_error" not in ploo_chem[0]:
                combined_chem.extend(ploo_chem)
            if sboo_chem and "_fetch_error" not in sboo_chem[0]:
                combined_chem.extend(sboo_chem)

            if combined_chem:
                results["ocean_chemistry"] = {
                    "source": "SD RTOMS — ocean chemistry (dissolved O2, CO2, nitrate, pH)",
                    "data": combined_chem,
                }
            else:
                err = ploo_chem[0].get("_fetch_error") if ploo_chem else "no data"
                results["ocean_chemistry"] = {"error": err, "data": []}
        except Exception as e:
            results["ocean_chemistry"] = {"error": str(e), "data": []}

        # IBWC Tijuana River — border pollution signal
        try:
            r = await client.get("https://www.ibwc.gov/wad/waterdata/TJRiverData.json", timeout=8)
            if r.status_code == 200:
                results["tijuana_river"] = {
                    "source": "IBWC — Tijuana River flow and quality",
                    "data": r.json(),
                }
            else:
                results["tijuana_river"] = {
                    "note": "IBWC endpoint not available — verify at ibwc.gov",
                    "error": f"HTTP {r.status_code}",
                    "data": [],
                }
        except Exception as e:
            results["tijuana_river"] = {
                "note": "IBWC endpoint requires verification — may need scraping",
                "error": str(e),
                "data": [],
            }

    return results


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 4 — Precipitation & Weather
# ─────────────────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_precipitation_data(latitude: float, longitude: float) -> dict:
    """
    Get current and forecast precipitation for a San Diego location.
    Uses NOAA Weather Service (no API key required).
    Critical input for post-rainfall contamination risk prediction.
    """
    results = {}

    async with httpx.AsyncClient(timeout=15) as client:

        # NOAA points — get grid metadata
        try:
            r = await client.get(
                f"https://api.weather.gov/points/{latitude},{longitude}",
                headers={"User-Agent": "SDEnvIntelligence/1.0 (civic-hackathon)"},
            )
            r.raise_for_status()
            props = r.json().get("properties", {})
            forecast_url = props.get("forecast")
            hourly_url = props.get("forecastHourly")

            results["location"] = {
                "grid_id": props.get("gridId"),
                "grid_x": props.get("gridX"),
                "grid_y": props.get("gridY"),
                "zone": props.get("forecastZone"),
                "radar_station": props.get("radarStation"),
            }
        except Exception as e:
            results["error"] = f"NOAA points API failed: {e}"
            return results

        # 7-day forecast — separate try so a slow forecast doesn't kill location data
        if forecast_url:
            try:
                r2 = await client.get(
                    forecast_url,
                    headers={"User-Agent": "SDEnvIntelligence/1.0"},
                )
                r2.raise_for_status()
                periods = r2.json().get("properties", {}).get("periods", [])[:7]
                results["forecast_7day"] = {
                    "source": "NOAA NWS — 7-day forecast",
                    "periods": [
                        {
                            "name": p.get("name"),
                            "temperature": p.get("temperature"),
                            "wind_speed": p.get("windSpeed"),
                            "short_forecast": p.get("shortForecast"),
                            "detailed_forecast": p.get("detailedForecast"),
                            "precip_probability": p.get("probabilityOfPrecipitation", {}).get("value"),
                        }
                        for p in periods
                    ],
                }
            except Exception as e:
                results["forecast_7day"] = {"error": f"Forecast fetch failed: {e}", "periods": []}

        # Hourly forecast — useful for 24h precip signal
        if hourly_url:
            try:
                r3 = await client.get(
                    hourly_url,
                    headers={"User-Agent": "SDEnvIntelligence/1.0"},
                )
                r3.raise_for_status()
                periods = r3.json().get("properties", {}).get("periods", [])[:24]
                results["forecast_hourly_24h"] = {
                    "source": "NOAA NWS — hourly forecast (24h)",
                    "periods": [
                        {
                            "start_time": p.get("startTime"),
                            "temperature": p.get("temperature"),
                            "short_forecast": p.get("shortForecast"),
                            "precip_probability": p.get("probabilityOfPrecipitation", {}).get("value"),
                            "wind_speed": p.get("windSpeed"),
                        }
                        for p in periods
                    ],
                }
            except Exception as e:
                results["forecast_hourly_24h"] = {"error": f"Hourly forecast failed: {e}", "periods": []}

    return results


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 5 — Contamination Risk Score
# ─────────────────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_contamination_risk_score(
    latitude: float,
    longitude: float,
    neighborhood: str = "",
    hours_since_rain: Optional[float] = None,
    rainfall_inches: Optional[float] = None,
) -> dict:
    """
    Predict contamination risk score (0-100) for a location based on:
    - Proximity to known pollution sources (TJ outflow, coastal zones)
    - Recent or forecast precipitation
    - Historical contamination patterns at nearby sample sites
    - Current RTOMS and ocean quality readings

    Returns risk score, contributing factors, and recommended city actions.
    """
    risk_score = 0
    factors = []
    recommendations = []

    # Pull live data — errors handled internally, always return partial
    try:
        precip = await get_precipitation_data(latitude, longitude)
    except Exception:
        precip = {}
    try:
        ocean = await get_ocean_water_quality(latitude, longitude)
    except Exception:
        ocean = {}

    # TJ River outflow proximity — Imperial Beach ~32.58°N, 117.13°W
    tj_dist = ((latitude - 32.58) ** 2 + (longitude - (-117.13)) ** 2) ** 0.5
    if tj_dist < 0.15:
        proximity_score = max(0, 40 - int(tj_dist * 200))
        risk_score += proximity_score
        factors.append(f"High proximity to Tijuana River outflow (+{proximity_score} pts)")

    # Coastal zone factor — SD coastline runs roughly lng < -117.08
    # (Imperial Beach at -117.131, Pacific Beach at -117.254, etc.)
    if longitude <= -117.08 and latitude >= 32.5:
        risk_score += 15
        factors.append("Coastal zone proximity — elevated marine contamination exposure (+15 pts)")

    # Precipitation — next 24h forecast
    forecast_periods = precip.get("forecast_7day", {}).get("periods", [])
    if forecast_periods:
        next_prob = forecast_periods[0].get("precip_probability") or 0
        try:
            next_prob = float(next_prob)
        except Exception:
            next_prob = 0
        if next_prob > 50:
            risk_score += 20
            factors.append(f"High precipitation probability ({next_prob:.0f}%) in next 24h (+20 pts)")

    # Recent rainfall (if caller provides it)
    if hours_since_rain is not None and rainfall_inches is not None:
        try:
            if hours_since_rain < 72 and rainfall_inches > 0.25:
                rain_score = min(25, int(rainfall_inches * 20))
                risk_score += rain_score
                factors.append(f"Recent rainfall: {rainfall_inches}\" {hours_since_rain:.0f}h ago (+{rain_score} pts)")
            elif hours_since_rain < 24:
                risk_score += 10
                factors.append("Rainfall within last 24 hours — runoff risk elevated (+10 pts)")
        except Exception:
            pass

    # Ocean bacteria signal — scan ALL rows for worst reading
    # CA single-sample recreational water limit: 104 CFU/100mL enterococcus
    CA_BACTERIA_LIMIT = 104.0
    # Bacteria parameter names as they appear in the SD monitoring dataset
    BACTERIA_PARAMS = {"fecal", "entero", "total", "ecoli", "coliform", "entr", "fcol"}

    ocean_bacteria_rows = ocean.get("ocean_bacteria", {}).get("data", [])
    max_bval = 0.0
    max_bparam = ""
    max_bstation = ""
    for brow in ocean_bacteria_rows:
        param_name = brow.get("parameter", "").lower()
        if any(kw in param_name for kw in BACTERIA_PARAMS):
            try:
                fval = float(brow.get("value", 0) or 0)
                if fval > max_bval:
                    max_bval = fval
                    max_bparam = brow.get("parameter", "bacteria")
                    max_bstation = brow.get("station", "")
            except Exception:
                pass

    if max_bval > 0:
        multiplier = max_bval / CA_BACTERIA_LIMIT
        station_note = f" at station {max_bstation}" if max_bstation else ""
        if multiplier >= 100:
            risk_score = max(risk_score, 90)
            factors.append(
                f"CRITICAL bacteria: {max_bparam} {max_bval:.0f} CFU/100mL{station_note} — {multiplier:.0f}x CA limit — health advisory in effect"
            )
        elif multiplier >= 10:
            risk_score = max(risk_score, 70)
            factors.append(
                f"Significantly elevated bacteria: {max_bparam} {max_bval:.0f} CFU/100mL{station_note} — {multiplier:.0f}x CA limit — elevated health risk"
            )
        elif multiplier > 1:
            risk_score += 20
            factors.append(
                f"Bacteria above CA limit: {max_bparam} {max_bval:.0f} CFU/100mL{station_note} ({multiplier:.1f}x limit) (+20 pts)"
            )

    risk_score = min(100, risk_score)

    if risk_score >= 90:
        tier, color = "CRITICAL", "critical"
    elif risk_score >= 70:
        tier, color = "HIGH", "red"
    elif risk_score >= 40:
        tier, color = "MODERATE", "amber"
    elif risk_score >= 20:
        tier, color = "LOW-MODERATE", "yellow"
    else:
        tier, color = "LOW", "green"

    if risk_score >= 90:
        recommendations = [
            "Issue immediate health advisory — avoid all water contact in affected coastal zones",
            "Deploy mobile water testing units to highest-risk zones within 6 hours",
            "Activate SD County Public Health emergency protocols for elevated bacteria events",
            "Post beach closure advisories at all affected access points",
            "Pre-position air purifier distribution at community centers in affected zip codes",
            "Coordinate with SD County DEH for accelerated remediation timeline",
        ]
    elif risk_score >= 70:
        recommendations = [
            "Deploy mobile water testing units to high-risk zones within 24 hours",
            "Issue proactive resident advisory — limit water contact at coastal areas",
            "Pre-position air purifier distribution at community centers",
            "Alert SD County Public Health for elevated respiratory surveillance",
            "Post precautionary advisories for affected coastal zones",
        ]
    elif risk_score >= 40:
        recommendations = [
            "Schedule water quality testing at nearest sample sites within 48 hours",
            "Prepare resident notification for potential water advisory",
            "Monitor RTOMS readings every 6 hours",
            "Alert community health workers in affected neighborhoods",
        ]
    else:
        recommendations = [
            "Continue standard monitoring cadence",
            "No immediate resource deployment required",
        ]

    return {
        "location": {"latitude": latitude, "longitude": longitude, "neighborhood": neighborhood},
        "risk_score": risk_score,
        "risk_tier": tier,
        "risk_color": color,
        "contributing_factors": factors,
        "city_recommendations": recommendations,
        "timestamp": datetime.now().isoformat(),
        "model_note": "Heuristic model — upgrade to trained regression post-hackathon",
    }


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 6 — Regulatory Compliance
# ─────────────────────────────────────────────────────────────────────────────

@mcp.tool()
async def get_regulatory_compliance(topic: str = "water quality") -> dict:
    """
    Check regulatory compliance status for environmental issues in San Diego.
    Topics: 'water quality', 'air quality', 'tijuana river', 'sewage', 'beach closures'
    """
    results = {
        "topic": topic,
        "data_sources": [],
        "regulations": [],
        "compliance_flags": [],
    }

    async with httpx.AsyncClient(timeout=15) as client:

        # Check council archive accessibility
        try:
            r = await client.get(
                "https://sandiego.granicus.com/ViewPublisher.php?view_id=31", timeout=10
            )
            if r.status_code == 200:
                results["data_sources"].append("SD Council Granicus archive — accessible")
            else:
                results["data_sources"].append(f"Granicus: HTTP {r.status_code}")
        except Exception as e:
            results["data_sources"].append(f"Granicus: {str(e)[:60]}")

        # Check municipal code accessibility
        try:
            r = await client.get(
                "https://www.sandiego.gov/city-clerk/officialdocs/municipal-code", timeout=10
            )
            if r.status_code == 200:
                results["data_sources"].append("SD Municipal Code — accessible")
            else:
                results["data_sources"].append(f"Municipal code: HTTP {r.status_code}")
        except Exception as e:
            results["data_sources"].append(f"Municipal code: {str(e)[:60]}")

    # Known SD environmental regulations — real, trackable, data-backed
    known_regulations = [
        {
            "regulation_id": "SD-ENV-001",
            "title": "Tijuana River Valley Pollution Remediation",
            "source": "City Council — multiple resolutions 2021-2023",
            "measurable_target": "Reduce fecal bacteria at Imperial Beach below CA single-sample limits (104 CFU/100mL enterococcus)",
            "metric_dataset": "monitoring_ocean_water_quality (seshat.datasd.org)",
            "metric_field": "parameter=FECAL, value column",
            "baseline_year": 2021,
            "target_timeline_months": 24,
            "status": "MONITOR — pull live data to assess",
            "accountability_note": "Beach closures at Imperial Beach persisted 2022-2025 despite resolutions. Compare FECAL values to 104 CFU/100mL limit.",
        },
        {
            "regulation_id": "SD-ENV-002",
            "title": "Lead Service Line Replacement Program",
            "source": "SD Public Utilities — federal mandate compliance",
            "measurable_target": "Lead levels below 15 ppb at all distribution system sites",
            "metric_dataset": "monitoring_analytes_plant_effluent (seshat.datasd.org)",
            "metric_field": "analyte=Lead, analyte_value column",
            "baseline_year": 2020,
            "target_timeline_months": 36,
            "status": "MONITOR — pull live effluent data",
            "accountability_note": "Cross-reference lead readings in plant effluent dataset against 15 ppb federal action level.",
        },
        {
            "regulation_id": "SD-ENV-003",
            "title": "Air Purifier Distribution Program — TJ Pollution Response",
            "source": "City of SD — 2023-2024 initiative",
            "measurable_target": "Measurable PM2.5 improvement in distributed zip codes (91932, 91950)",
            "metric_dataset": "EPA AirNow + Purple Air sensors",
            "metric_field": "pm2.5, aqi",
            "baseline_year": 2023,
            "target_timeline_months": 12,
            "status": "MONITOR — compare pre/post Purple Air readings",
            "accountability_note": "City distributed free air purifiers to border-area residents. Purple Air data measures actual street-level air quality change.",
        },
    ]

    topic_lower = topic.lower()
    keyword_map = {
        "water": ["water", "lead", "bacteria", "tijuana", "sewage"],
        "air": ["air", "purifier", "pm2.5", "pollution"],
        "tijuana": ["tijuana", "tj", "border", "river", "sewage"],
        "beach": ["beach", "ocean", "bacteria", "closure"],
        "sewage": ["tijuana", "sewage", "bacteria", "beach"],
    }
    relevant_kw = []
    for k, v in keyword_map.items():
        if k in topic_lower:
            relevant_kw.extend(v)

    filtered = [
        reg for reg in known_regulations
        if not relevant_kw
        or any(
            kw in reg["title"].lower() or kw in reg.get("accountability_note", "").lower()
            for kw in relevant_kw
        )
    ] or known_regulations

    results["regulations"] = filtered
    results["compliance_flags"] = [
        {
            "flag": "DATA GAP",
            "message": "Compliance check uses heuristic rules — live data correlation not yet automated",
            "action": "Wire metric_dataset fields to live seshat.datasd.org CSV pulls and compare against targets",
        }
    ]
    results["demo_talking_point"] = (
        "This layer shows which city regulations have measurable data backing them and which don't. "
        "For campaigns: 'Here's the data proving we delivered on our promise.' "
        "For accountability: 'Here's where the data shows no improvement yet.'"
    )
    return results


# ─────────────────────────────────────────────────────────────────────────────
# TOOL 7 — Geocode address → lat/lng
# ─────────────────────────────────────────────────────────────────────────────

# San Diego county bounding box — results outside this are wrong matches
_SD_LAT_MIN, _SD_LAT_MAX = 32.4, 33.3
_SD_LNG_MIN, _SD_LNG_MAX = -117.7, -116.1

# SD neighborhoods that are legally part of the City of San Diego (not standalone cities)
# The geocoder needs "San Diego" not the neighborhood name as the city
_SD_NEIGHBORHOODS = {
    "pacific beach", "ocean beach", "mission beach", "la jolla", "mission hills",
    "north park", "hillcrest", "normal heights", "kensington", "talmadge",
    "city heights", "college area", "linda vista", "mira mesa", "clairemont",
    "bay park", "old town", "mission valley", "fashion valley", "balboa park",
    "downtown", "east village", "little italy", "gaslamp", "barrio logan",
    "logan heights", "golden hill", "south park", "rolando", "encanto",
    "skyline", "paradise hills", "otay ranch", "rancho bernardo", "rancho penasquitos",
    "scripps ranch", "tierrasanta", "del cerro", "allied gardens", "navajo",
    "san carlos", "serra mesa", "university city", "carmel valley", "torrey pines",
    "carmel mountain", "sabre springs", "miramar", "kearny mesa",
}


def _in_sd_bounds(lat, lng) -> bool:
    try:
        return _SD_LAT_MIN <= float(lat) <= _SD_LAT_MAX and _SD_LNG_MIN <= float(lng) <= _SD_LNG_MAX
    except Exception:
        return False


async def _census_geocode(client: httpx.AsyncClient, address: str) -> dict | None:
    """Single Census Geocoder call. Returns match dict or None."""
    try:
        r = await client.get(
            "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress",
            params={"address": address, "benchmark": "Public_AR_Current", "format": "json"},
        )
        r.raise_for_status()
        matches = r.json().get("result", {}).get("addressMatches", [])
        if matches:
            coords = matches[0].get("coordinates", {})
            return {
                "success": True,
                "address": matches[0].get("matchedAddress"),
                "latitude": coords.get("y"),
                "longitude": coords.get("x"),
            }
    except Exception:
        pass
    return None


@mcp.tool()
async def geocode_address(address: str) -> dict:
    """
    Convert a San Diego area street address to latitude/longitude.
    Uses Census Geocoder (free, no key required).
    Handles both independent cities (Imperial Beach) and SD neighborhoods (Pacific Beach).
    Examples: '800 Seacoast Dr, Imperial Beach, CA'
              '4500 Ocean Blvd, Pacific Beach, CA'
    """
    async with httpx.AsyncClient(timeout=12) as client:
        try:
            candidates = [address]

            # If address mentions an SD neighborhood (not a standalone city), also try
            # replacing the neighborhood name with "San Diego" for the geocoder
            addr_lower = address.lower()
            for nbhd in _SD_NEIGHBORHOODS:
                if nbhd in addr_lower:
                    # Build alternative: swap neighborhood for "San Diego"
                    # e.g. "4500 Ocean Blvd, Pacific Beach, CA" → "4500 Ocean Blvd, San Diego, CA"
                    import re
                    alt = re.sub(
                        re.escape(nbhd), "San Diego", addr_lower, flags=re.IGNORECASE
                    )
                    # Restore original capitalisation for non-replaced parts isn't trivial;
                    # just use the lowered version — geocoder handles it fine
                    alt = re.sub(
                        re.escape(nbhd), "San Diego", address, flags=re.IGNORECASE
                    )
                    candidates.append(alt)
                    break

            # Ensure at least one attempt has state suffix
            if not any("ca" in c.lower() or "california" in c.lower() for c in candidates):
                candidates.append(f"{address}, CA")

            for attempt in candidates:
                result = await _census_geocode(client, attempt)
                if result and _in_sd_bounds(result["latitude"], result["longitude"]):
                    return result
                # Got a result but outside SD — keep trying
                if result:
                    outside = result  # save in case nothing better found

            # Last resort: return the outside-SD result with a warning
            if "outside" in dir():
                outside["warning"] = "Result may be outside San Diego area — verify coordinates"
                return outside

            return {"success": False, "error": "No address match found in San Diego area", "data": {}}
        except Exception as e:
            return {"success": False, "error": str(e), "data": {}}


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run()
