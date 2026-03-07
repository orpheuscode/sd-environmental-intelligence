"""
SD Environmental Intelligence — Scrapers
Pulls municipal code environmental sections and council resolutions
for the regulatory accountability layer.
Run this pre-hackathon to build a local cache.
"""

import httpx
import asyncio
import json
import re
from bs4 import BeautifulSoup
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

CACHE_DIR = Path("./data_cache")
CACHE_DIR.mkdir(exist_ok=True)

HEADERS = {
    "User-Agent": "SDEnvIntelligence/1.0 (civic-hackathon-anthropic)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Municipal Code Scraper
# Target environmental sections most relevant to air/water quality
# ─────────────────────────────────────────────────────────────────────────────

MUNICIPAL_CODE_ENV_SECTIONS = [
    # These chapter numbers are approximate — verify at sandiego.gov/city-clerk
    "4",    # Public Health and Safety
    "43",   # Water
    "67",   # Environmental Review
    "118",  # Hazardous Materials
    "121",  # Air Pollution Control
    "125",  # Storm Water Management
]

async def scrape_municipal_code_section(section: str) -> dict:
    """Scrape a specific section of the SD municipal code."""
    url = f"https://www.sandiego.gov/city-clerk/officialdocs/municipal-code"

    async with httpx.AsyncClient(timeout=20, headers=HEADERS) as client:
        try:
            # Try American Legal version first (better for programmatic access)
            r = await client.get(
                f"https://codelibrary.amlegal.com/codes/san_diego/latest/sandiego_ca/0-0-0-{section}",
                timeout=15
            )
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                # Extract section text
                content_div = soup.find("div", {"class": "chunk"}) or soup.find("div", {"id": "content"})
                if content_div:
                    return {
                        "section": section,
                        "source": "amlegal",
                        "url": str(r.url),
                        "text": content_div.get_text(separator="\n", strip=True)[:5000],
                        "scraped_at": datetime.now().isoformat()
                    }
        except Exception as e:
            pass

        # Fallback: official SD site
        try:
            r = await client.get(url, timeout=15)
            if r.status_code == 200:
                return {
                    "section": section,
                    "source": "sd_official",
                    "url": url,
                    "note": "Main page accessible — navigate to specific chapter for section text",
                    "scraped_at": datetime.now().isoformat()
                }
        except Exception as e:
            return {"section": section, "error": str(e)}

    return {"section": section, "error": "All attempts failed"}


async def scrape_council_resolutions_env() -> list:
    """
    Scrape council meeting records for environmental resolutions.
    Focuses on air quality, water quality, TJ pollution items.
    """
    results = []
    env_keywords = [
        "tijuana", "water quality", "air quality", "pollution", 
        "purifier", "sewage", "beach closure", "environmental",
        "storm water", "stormwater", "contamination"
    ]

    async with httpx.AsyncClient(timeout=20, headers=HEADERS) as client:

        # SD Council docket/agenda page
        try:
            r = await client.get(
                "https://www.sandiego.gov/city-clerk/officialdocs/official-city-documents",
                timeout=15
            )
            if r.status_code == 200:
                results.append({
                    "source": "official_city_documents",
                    "status": "accessible",
                    "note": "Resolutions and ordinances available here"
                })
        except Exception as e:
            results.append({"source": "official_city_documents", "error": str(e)})

        # Granicus video/transcript archive
        try:
            r = await client.get(
                "https://sandiego.granicus.com/ViewPublisher.php?view_id=31",
                timeout=15
            )
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                # Look for meeting links
                links = soup.find_all("a", href=True)
                meeting_links = [
                    {"text": a.get_text(strip=True), "href": a["href"]}
                    for a in links
                    if "view" in a["href"].lower() or "clip" in a["href"].lower()
                ][:20]
                results.append({
                    "source": "granicus",
                    "status": "accessible",
                    "meeting_count": len(meeting_links),
                    "sample_links": meeting_links[:5]
                })
        except Exception as e:
            results.append({"source": "granicus", "error": str(e)})

        # NextRequest FOIA search for environmental records
        try:
            search_url = "https://sandiego.nextrequest.com/requests"
            params = {"q": "tijuana river water quality"}
            r = await client.get(search_url, params=params, timeout=15)
            if r.status_code == 200:
                results.append({
                    "source": "nextrequest",
                    "status": "accessible",
                    "search_url": str(r.url),
                    "note": "40k+ FOIA records — search 'tijuana', 'water quality', 'air purifier'"
                })
        except Exception as e:
            results.append({"source": "nextrequest", "error": str(e)})

    return results


# ─────────────────────────────────────────────────────────────────────────────
# Health Outcome Data
# ─────────────────────────────────────────────────────────────────────────────

async def get_cdc_places_sd() -> dict:
    """
    Pull CDC PLACES health outcome data for San Diego census tracts.
    Covers asthma, COPD, respiratory health, sleep, mental health prevalence.
    This is the health correlation layer — cross-reference with env zones.
    """
    async with httpx.AsyncClient(timeout=20, headers=HEADERS) as client:
        try:
            # CDC PLACES API — San Diego County (FIPS 06073)
            r = await client.get(
                "https://data.cdc.gov/resource/cwsq-ngmh.json",
                params={
                    "StateAbbr": "CA",
                    "CountyName": "San Diego",
                    "$limit": 500,
                    "$where": "MeasureId IN ('CASTHMA', 'COPD', 'SLEEP', 'MHLTH', 'PHLTH')"
                },
                timeout=20
            )
            if r.status_code == 200:
                data = r.json()
                cache_path = CACHE_DIR / "cdc_places_sd.json"
                cache_path.write_text(json.dumps(data, indent=2))
                return {
                    "source": "CDC PLACES",
                    "record_count": len(data),
                    "measures": ["CASTHMA (asthma)", "COPD", "SLEEP", "MHLTH (mental health)", "PHLTH (poor health)"],
                    "data": data[:10],  # sample
                    "cached_to": str(cache_path)
                }
        except Exception as e:
            return {"error": str(e), "note": "CDC PLACES API at data.cdc.gov"}


async def scrape_beach_closures() -> dict:
    """
    Scrape current beach closure and advisory status from SD County.
    This is the real-time coastal contamination signal.
    """
    async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
        try:
            # SD County beach water quality
            r = await client.get(
                "https://www.sandiegocounty.gov/content/sdc/deh/water/beach.html",
                timeout=12
            )
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                # Extract tables or status divs
                tables = soup.find_all("table")
                text_content = soup.get_text(separator="\n", strip=True)

                # Pull key beach status lines
                lines = [l.strip() for l in text_content.split("\n") if l.strip()]
                relevant = [
                    l for l in lines
                    if any(kw in l.lower() for kw in [
                        "closed", "advisory", "open", "warning",
                        "imperial", "pacific", "ocean beach", "mission"
                    ])
                ][:30]

                result = {
                    "source": "SD County DEH Beach Water Quality",
                    "url": "https://www.sandiegocounty.gov/content/sdc/deh/water/beach.html",
                    "scraped_at": datetime.now().isoformat(),
                    "status_lines": relevant,
                    "raw_text_preview": text_content[:2000]
                }
                cache_path = CACHE_DIR / "beach_closures.json"
                cache_path.write_text(json.dumps(result, indent=2))
                return result

        except Exception as e:
            return {"error": str(e)}


async def scrape_ibwc_tj_river() -> dict:
    """
    Pull Tijuana River flow and quality data from IBWC.
    Critical for TJ pollution correlation with SD coastal contamination.
    """
    async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
        try:
            r = await client.get(
                "https://www.ibwc.gov/wad/",
                timeout=12
            )
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                links = soup.find_all("a", href=True)
                tj_links = [
                    {"text": a.get_text(strip=True), "href": a["href"]}
                    for a in links
                    if "tijuana" in a.get_text(strip=True).lower()
                    or "tijuana" in a["href"].lower()
                ]
                return {
                    "source": "IBWC",
                    "status": "accessible",
                    "tj_related_links": tj_links[:10],
                    "note": "Navigate to Tijuana River water data section"
                }
        except Exception as e:
            return {"error": str(e), "url": "https://www.ibwc.gov"}


# ─────────────────────────────────────────────────────────────────────────────
# Pre-hackathon data prefetch — run this Thursday night
# ─────────────────────────────────────────────────────────────────────────────

async def prefetch_all():
    """
    Run before the hackathon to cache data and verify all connections.
    Save outputs to ./data_cache/ for fast demo loading.
    """
    print("="*60)
    print("SD Environmental Intelligence — Pre-hackathon Data Prefetch")
    print("="*60)

    print("\n[1/5] CDC PLACES health outcomes...")
    cdc = await get_cdc_places_sd()
    print(f"      → {cdc.get('record_count', 'ERROR')} records")

    print("\n[2/5] Beach closure status...")
    beach = await scrape_beach_closures()
    status_count = len(beach.get("status_lines", []))
    print(f"      → {status_count} status lines scraped")

    print("\n[3/5] IBWC TJ River data...")
    ibwc = await scrape_ibwc_tj_river()
    print(f"      → {ibwc.get('status', ibwc.get('error', 'unknown'))}")

    print("\n[4/5] Council resolution sources...")
    resolutions = await scrape_council_resolutions_env()
    for r in resolutions:
        print(f"      → {r['source']}: {r.get('status', r.get('error', '?'))}")

    print("\n[5/5] Verifying SD Socrata connection...")
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(
                "https://data.sandiego.gov/resource/monitoring-of-indicator-bacteria-in-drinking-water.json",
                params={"$limit": 1}
            )
            print(f"      → Socrata status: {r.status_code}")
        except Exception as e:
            print(f"      → Socrata error: {e}")

    print("\n" + "="*60)
    print("Prefetch complete. Check ./data_cache/ for cached files.")
    print("Run verify_api_keys() to confirm all credentials are set.")
    print("="*60)


def verify_api_keys():
    """Quick check that all required env vars are set."""
    import os
    keys = {
        "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
        "AIRNOW_API_KEY": os.getenv("AIRNOW_API_KEY"),
        "PURPLEAIR_API_KEY": os.getenv("PURPLEAIR_API_KEY"),
        "SD_SOCRATA_APP_TOKEN": os.getenv("SD_SOCRATA_APP_TOKEN"),
    }
    print("\nAPI Key Status:")
    for k, v in keys.items():
        status = "✅ SET" if v else "❌ MISSING"
        print(f"  {k}: {status}")
    print()
    missing = [k for k, v in keys.items() if not v]
    if missing:
        print(f"⚠️  Get missing keys before hackathon:")
        print("  AirNow:    airnowapi.org/login")
        print("  PurpleAir: develop.purpleair.com")
        print("  Socrata:   data.sandiego.gov/developers")
        print("  Anthropic: console.anthropic.com")
    else:
        print("✅ All keys set — ready to build!")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "verify":
        verify_api_keys()
    else:
        asyncio.run(prefetch_all())
