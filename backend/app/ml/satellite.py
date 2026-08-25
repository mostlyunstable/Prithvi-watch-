"""
Satellite data provider for PRITHVI WATCH.

Source: Sentinel-1 RTC (Radiometrically Terrain Corrected) 
        from Microsoft Planetary Computer STAC catalog.
        - Collection: sentinel-1-rtc
        - Asset: VV, VH backscatter (float32, dB-like linear power)
        - Resolution: 10m
        - Coverage: Global, ~12-day repeat
        - License: Copernicus (open)

Method: Windowed rasterio read of Cloud-Optimized GeoTIFF (COG).
        Only the single pixel at the target coordinate is fetched.
"""

import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import rasterio
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Tuple
from pyproj import Transformer

# Create pooled HTTP session with retry logic
_session = requests.Session()
_retries = Retry(
    total=2,
    backoff_factor=0.3,
    status_forcelist=[500, 502, 503, 504],
    raise_on_status=False
)
_adapter = HTTPAdapter(max_retries=_retries, pool_connections=10, pool_maxsize=20)
_session.mount("https://", _adapter)
_session.mount("http://", _adapter)

# Cache SAS token to avoid re-fetching on every call
_sas_token_cache = {"token": None, "expiry": None}

# In-memory coordinate TTL cache to accelerate repeated queries (TTL: 30 minutes)
# Key: (round(lat, 2), round(lon, 2)) -> (result_dict, timestamp)
_sar_coord_cache: Dict[Tuple[float, float], Tuple[Dict[str, Any], float]] = {}
CACHE_TTL_SECONDS = 1800


def _get_sas_token() -> str:
    """Fetches (or returns cached) SAS token for Planetary Computer sentinel-1-rtc."""
    now = datetime.now(timezone.utc)
    if _sas_token_cache["token"] and _sas_token_cache["expiry"]:
        expiry = pd.to_datetime(_sas_token_cache["expiry"])
        if expiry.tzinfo is None:
            expiry = expiry.tz_localize("UTC")
        if now < (expiry - pd.Timedelta(minutes=5)):
            return _sas_token_cache["token"]

    try:
        token_url = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-1-rtc"
        resp = _session.get(token_url, timeout=(3.0, 5.0))
        if resp.status_code == 200:
            data = resp.json()
            _sas_token_cache["token"] = data.get("token", "")
            _sas_token_cache["expiry"] = data.get("msft:expiry", "")
            return _sas_token_cache["token"]
        return ""
    except Exception:
        return ""


def _read_pixel_from_cog(signed_url: str, lon: float, lat: float, crs_epsg: int) -> Optional[float]:
    """
    Reads a single pixel from a Cloud-Optimized GeoTIFF via a windowed read.
    Returns None if reading fails or pixel is NoData.
    """
    try:
        t = Transformer.from_crs("EPSG:4326", f"EPSG:{crs_epsg}", always_xy=True)
        x, y = t.transform(lon, lat)
        with rasterio.Env(GDAL_HTTP_TIMEOUT="3", GDAL_HTTP_MAX_RETRY="1", CPL_VSIL_CURL_TIMEOUT="3"):
            with rasterio.open(signed_url) as src:
                row, col = src.index(x, y)
                if 0 <= row < src.height and 0 <= col < src.width:
                    window = rasterio.windows.Window(col, row, 1, 1)
                    data = src.read(1, window=window)
                    val = float(data[0, 0])
                    if val != src.nodata and not np.isnan(val) and val > 0:
                        return val
        return None
    except Exception:
        return None


def get_live_sentinel1(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches the most recent Sentinel-1 acquisition for live inference.
    
    Returns structured result:
    {
        "sar_vv": float | None,
        "sar_vh": float | None,
        "available": bool,
        "acquisition_date": str | None,
        "source": "Sentinel-1 RTC (Planetary Computer)",
        "error": str | None
    }
    """
    cache_key = (round(lat, 2), round(lon, 2))
    now_ts = time.time()
    if cache_key in _sar_coord_cache:
        cached_val, cached_time = _sar_coord_cache[cache_key]
        if now_ts - cached_time < CACHE_TTL_SECONDS:
            return cached_val

    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    month_ago = (now - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")

    search_url = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
    payload = {
        "collections": ["sentinel-1-rtc"],
        "intersects": {"type": "Point", "coordinates": [lon, lat]},
        "datetime": f"{month_ago}/{today}",
        "limit": 1,
    }

    try:
        resp = _session.post(search_url, json=payload, timeout=(3.0, 7.0))
        if resp.status_code != 200:
            result = {
                "sar_vv": None,
                "sar_vh": None,
                "available": False,
                "acquisition_date": None,
                "source": "Sentinel-1 RTC (Planetary Computer)",
                "error": f"STAC HTTP {resp.status_code}"
            }
            return result

        items = resp.json().get("features", [])
        if not items:
            result = {
                "sar_vv": None,
                "sar_vh": None,
                "available": False,
                "acquisition_date": None,
                "source": "Sentinel-1 RTC (Planetary Computer)",
                "error": "No Sentinel-1 scenes found within 30-day window"
            }
            return result

        item = items[0]
        acq_date = item.get("properties", {}).get("datetime")
        vv_url = item["assets"].get("vv", {}).get("href")
        vh_url = item["assets"].get("vh", {}).get("href")
        crs_epsg = item.get("properties", {}).get("proj:epsg", 32646)

        if not vv_url or not vh_url:
            return {
                "sar_vv": None,
                "sar_vh": None,
                "available": False,
                "acquisition_date": acq_date,
                "source": "Sentinel-1 RTC (Planetary Computer)",
                "error": "Asset href missing in STAC item"
            }

        token = _get_sas_token()
        signed_vv = f"{vv_url}?{token}" if token else vv_url
        signed_vh = f"{vh_url}?{token}" if token else vh_url

        vv_val = _read_pixel_from_cog(signed_vv, lon, lat, crs_epsg)
        vh_val = _read_pixel_from_cog(signed_vh, lon, lat, crs_epsg)

        if vv_val is not None and vh_val is not None:
            res = {
                "sar_vv": vv_val,
                "sar_vh": vh_val,
                "available": True,
                "acquisition_date": acq_date,
                "source": "Sentinel-1 RTC (Planetary Computer)",
                "error": None
            }
            _sar_coord_cache[cache_key] = (res, now_ts)
            return res
        else:
            return {
                "sar_vv": None,
                "sar_vh": None,
                "available": False,
                "acquisition_date": acq_date,
                "source": "Sentinel-1 RTC (Planetary Computer)",
                "error": "Failed reading pixel values from COG raster"
            }

    except Exception as e:
        return {
            "sar_vv": None,
            "sar_vh": None,
            "available": False,
            "acquisition_date": None,
            "source": "Sentinel-1 RTC (Planetary Computer)",
            "error": str(e)
        }
