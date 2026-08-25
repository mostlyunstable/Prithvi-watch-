import requests
import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from app.data_fabric.base import BaseProvider, ProviderStatus

class PrecipitationProvider(BaseProvider):
    """
    Multi-temporal precipitation provider querying Open-Meteo ERA5 / ECMWF NWP.
    Extracts 1h, 3h, 6h, 24h, 72h, 7d, and 30d antecedent precipitation
    and computes rainfall anomaly relative to 30-year monthly ERA5 climatology.
    """
    def __init__(self):
        super().__init__(name="Open-Meteo ERA5 / ECMWF Precipitation", source_type="REST Reanalysis & NWP API")
        # 30-year monthly average rainfall baselines for NER (mm/month) from IMD/ERA5
        self.ner_monthly_climatology_mm = {
            1: 25.0, 2: 45.0, 3: 110.0, 4: 240.0, 5: 420.0, 6: 780.0,
            7: 850.0, 8: 620.0, 9: 450.0, 10: 180.0, 11: 35.0, 12: 15.0
        }

    def fetch(self, lat: float, lon: float, **kwargs) -> Dict[str, Any]:
        self.last_checked = datetime.now(timezone.utc)
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&hourly=precipitation&past_days=30&forecast_days=3&timezone=UTC"
        )
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                hourly = data.get("hourly", {}).get("precipitation", [])
                if hourly and len(hourly) >= 720: # 30 days * 24 hours
                    # Split past 30 days up to current hour (index 720)
                    past_hourly = [float(p) if p is not None else 0.0 for p in hourly[:720]]
                    
                    r_1h = float(past_hourly[-1])
                    r_3h = float(sum(past_hourly[-3:]))
                    r_6h = float(sum(past_hourly[-6:]))
                    r_24h = float(sum(past_hourly[-24:]))
                    r_72h = float(sum(past_hourly[-72:]))
                    r_7d = float(sum(past_hourly[-168:]))
                    r_30d = float(sum(past_hourly))

                    # Calculate anomaly relative to expected monthly climatology
                    cur_month = datetime.now(timezone.utc).month
                    expected_monthly = self.ner_monthly_climatology_mm.get(cur_month, 300.0)
                    anomaly_pct = round(((r_30d - expected_monthly) / max(10.0, expected_monthly)) * 100.0, 1)

                    self.status = ProviderStatus.AVAILABLE
                    self.last_error = None
                    return {
                        "rainfall_1h_mm": r_1h,
                        "rainfall_3h_mm": r_3h,
                        "rainfall_6h_mm": r_6h,
                        "rainfall_24h_mm": r_24h,
                        "rainfall_72h_mm": r_72h,
                        "rainfall_7d_mm": r_7d,
                        "rainfall_30d_mm": r_30d,
                        "monthly_climatology_mm": expected_monthly,
                        "rainfall_anomaly_pct": anomaly_pct,
                        "observation_timestamp": datetime.now(timezone.utc).isoformat()
                    }
        except Exception as e:
            self.last_error = str(e)

        self.status = ProviderStatus.DEGRADED
        return {
            "rainfall_1h_mm": None,
            "rainfall_3h_mm": None,
            "rainfall_6h_mm": None,
            "rainfall_24h_mm": None,
            "rainfall_72h_mm": None,
            "rainfall_7d_mm": None,
            "rainfall_30d_mm": None,
            "monthly_climatology_mm": self.ner_monthly_climatology_mm.get(datetime.now(timezone.utc).month, 300.0),
            "rainfall_anomaly_pct": None,
            "is_imputed": True,
            "observation_timestamp": None
        }

    def validate(self, raw_data: Dict[str, Any]) -> bool:
        if not raw_data:
            return False
        return True

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "rainfall_1h_mm": round(float(raw_data["rainfall_1h_mm"]), 1) if raw_data.get("rainfall_1h_mm") is not None else None,
            "rainfall_3h_mm": round(float(raw_data["rainfall_3h_mm"]), 1) if raw_data.get("rainfall_3h_mm") is not None else None,
            "rainfall_6h_mm": round(float(raw_data["rainfall_6h_mm"]), 1) if raw_data.get("rainfall_6h_mm") is not None else None,
            "rainfall_24h_mm": round(float(raw_data["rainfall_24h_mm"]), 1) if raw_data.get("rainfall_24h_mm") is not None else None,
            "rainfall_72h_mm": round(float(raw_data["rainfall_72h_mm"]), 1) if raw_data.get("rainfall_72h_mm") is not None else None,
            "rainfall_7d_mm": round(float(raw_data["rainfall_7d_mm"]), 1) if raw_data.get("rainfall_7d_mm") is not None else None,
            "rainfall_30d_mm": round(float(raw_data["rainfall_30d_mm"]), 1) if raw_data.get("rainfall_30d_mm") is not None else None,
            "rainfall_anomaly_pct": raw_data.get("rainfall_anomaly_pct"),
            "is_imputed": raw_data.get("is_imputed", False),
            "status": self.status,
            "provider": self.name,
            "observation_time": raw_data.get("observation_timestamp")
        }

    def metadata(self) -> Dict[str, Any]:
        return {
            "dataset": "Open-Meteo ERA5 / ECMWF IFS Forecast",
            "resolution": "0.1° (~10 km) hourly",
            "license": "CC-BY 4.0 (Copernicus)",
            "status": self.status
        }
