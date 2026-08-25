"""
PRITHVI WATCH — Weather & Atmospheric Data Ingestion Service
Queries Open-Meteo ERA5 Reanalysis and Live ECMWF Forecast APIs with resilient backoff.
"""

import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from app.ingestion.download_manager import download_manager

logger = logging.getLogger("prithvi.weather_ingestion")

class WeatherIngestionService:
    """Ingestion client for ERA5 historical reanalysis and live meteorological observations."""

    ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
    FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

    def fetch_live_environmental_conditions(self, lat: float, lon: float) -> Dict[str, Any]:
        """
        Retrieves real-time atmospheric variables:
        - 7-day antecedent cumulative precipitation
        - 24-hour forecast precipitation
        - 2m air temperature
        - Relative humidity
        - Surface soil moisture (0-7 cm)
        """
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "precipitation,soil_moisture_0_to_7cm,relative_humidity_2m,temperature_2m",
            "past_days": 7,
            "forecast_days": 2,
            "timezone": "UTC"
        }

        t0 = time.time()
        try:
            data = download_manager.fetch_json(self.FORECAST_URL, params=params)
            hourly = data.get("hourly", {})
            precip_list = hourly.get("precipitation", [])
            temp_list = hourly.get("temperature_2m", [])
            soil_list = hourly.get("soil_moisture_0_to_7cm", [])
            humidity_list = hourly.get("relative_humidity_2m", [])

            # Past 7 days (7 * 24 = 168 hours)
            past_168 = precip_list[:168] if len(precip_list) >= 168 else precip_list
            rainfall_7d_mm = float(sum(p for p in past_168 if p is not None))

            # Next 24 hours forecast
            next_24 = precip_list[168:192] if len(precip_list) >= 192 else []
            forecast_24h_mm = float(sum(p for p in next_24 if p is not None)) if next_24 else 0.0

            current_temp = float(temp_list[167]) if len(temp_list) > 167 and temp_list[167] is not None else 22.0
            current_soil = float(soil_list[167]) if len(soil_list) > 167 and soil_list[167] is not None else 0.35
            current_humidity = float(humidity_list[167]) if len(humidity_list) > 167 and humidity_list[167] is not None else 85.0

            dt_ms = (time.time() - t0) * 1000

            return {
                "available": True,
                "provider": "Open-Meteo / ECMWF IFS & ERA5",
                "rainfall_7d_mm": round(rainfall_7d_mm, 2),
                "forecast_24h_mm": round(forecast_24h_mm, 2),
                "temperature_2m_c": round(current_temp, 1),
                "soil_moisture_0_7cm": round(current_soil, 3),
                "relative_humidity_pct": round(current_humidity, 1),
                "latency_ms": round(dt_ms, 1),
                "status": "AVAILABLE"
            }
        except Exception as e:
            logger.warning(f"Live weather API error at ({lat}, {lon}): {e}")
            return {
                "available": False,
                "provider": "Open-Meteo / ECMWF IFS & ERA5",
                "rainfall_7d_mm": 35.0, # Climatological baseline with explicit degradation notice
                "forecast_24h_mm": 0.0,
                "temperature_2m_c": 22.0,
                "soil_moisture_0_7cm": 0.35,
                "relative_humidity_pct": 80.0,
                "latency_ms": round((time.time() - t0) * 1000, 1),
                "status": "DEGRADED",
                "error": str(e)
            }

weather_ingestion = WeatherIngestionService()
