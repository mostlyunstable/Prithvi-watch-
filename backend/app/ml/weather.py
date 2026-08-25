import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any, Tuple

# Connection-pooled session
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

# In-memory weather cache (TTL: 30 minutes)
_weather_cache: Dict[Tuple[float, float], Tuple[Dict[str, Any], float]] = {}
CACHE_TTL_SECONDS = 1800


def get_live_rainfall(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetches the past 7 days accumulated rainfall from Open-Meteo live API.
    
    Returns:
    {
        "rainfall_7d_mm": float | None,
        "available": bool,
        "source": "Open-Meteo ERA5/ECMWF Live",
        "error": str | None
    }
    """
    cache_key = (round(lat, 2), round(lon, 2))
    now_ts = time.time()
    if cache_key in _weather_cache:
        cached_val, cached_time = _weather_cache[cache_key]
        if now_ts - cached_time < CACHE_TTL_SECONDS:
            return cached_val

    url = (
        "https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        "&daily=precipitation_sum&past_days=7&forecast_days=2&timezone=UTC"
    )
    
    try:
        resp = _session.get(url, timeout=(3.0, 5.0))
        if resp.status_code == 200:
            data = resp.json()
            if "daily" in data and "precipitation_sum" in data["daily"]:
                precip = data["daily"]["precipitation_sum"]
                past_7 = precip[:7]
                valid_past = [p for p in past_7 if p is not None]
                total_rain = round(sum(valid_past), 2)
                res = {
                    "rainfall_7d_mm": total_rain,
                    "available": True,
                    "source": "Open-Meteo ERA5/ECMWF Live",
                    "error": None
                }
                _weather_cache[cache_key] = (res, now_ts)
                return res
        return {
            "rainfall_7d_mm": None,
            "available": False,
            "source": "Open-Meteo ERA5/ECMWF Live",
            "error": f"HTTP {resp.status_code}"
        }
    except Exception as e:
        return {
            "rainfall_7d_mm": None,
            "available": False,
            "source": "Open-Meteo ERA5/ECMWF Live",
            "error": str(e)
        }


def get_historical_rainfall(lat: float, lon: float, date_str: str) -> float:
    """
    Fetches 7-day antecedent cumulative precipitation strictly prior to the reference timestamp
    using the Open-Meteo ERA5 historical reanalysis API.
    
    Temporal interval: [T - 7 days, T - 1 day]
    """
    try:
        import pandas as pd
        from datetime import timedelta
        
        dt = pd.to_datetime(date_str)
        if dt.tzinfo is not None:
            dt = dt.tz_convert(None)
            
        end_date = (dt - timedelta(days=1)).strftime("%Y-%m-%d")
        start_date = (dt - timedelta(days=7)).strftime("%Y-%m-%d")
        
        url = (
            f"https://archive-api.open-meteo.com/v1/era5?"
            f"latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}"
            f"&daily=precipitation_sum&timezone=UTC"
        )
        resp = _session.get(url, timeout=(4.0, 8.0))
        if resp.status_code == 200:
            data = resp.json()
            precip = data.get("daily", {}).get("precipitation_sum", [])
            valid = [p for p in precip if p is not None]
            if valid:
                return round(float(sum(valid)), 1)
        return 20.0
    except Exception:
        return 20.0

