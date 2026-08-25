from datetime import datetime, timezone
from typing import Dict, Any
from app.data_fabric.base import BaseProvider, ProviderStatus
from app.ml.satellite import get_live_sentinel1

class SatelliteSARProvider(BaseProvider):
    """
    Sentinel-1 C-band Synthetic Aperture Radar (SAR) Provider via Planetary Computer STAC.
    Extracts radiometrically terrain corrected VV and VH backscatter and VV/VH ratio.
    """
    def __init__(self):
        super().__init__(name="ESA Copernicus Sentinel-1 RTC", source_type="Planetary Computer STAC COG")

    def fetch(self, lat: float, lon: float, **kwargs) -> Dict[str, Any]:
        self.last_checked = datetime.now(timezone.utc)
        try:
            sar_res = get_live_sentinel1(lat, lon)
            if sar_res.get("available") and sar_res.get("sar_vv") is not None:
                self.status = ProviderStatus.AVAILABLE
                self.last_error = None
                return {
                    "sar_vv": round(float(sar_res["sar_vv"]), 4),
                    "sar_vh": round(float(sar_res["sar_vh"]), 4),
                    "sar_ratio": round(float(sar_res["sar_vv"]) / (float(sar_res["sar_vh"]) + 1e-4), 3),
                    "acquisition_date": sar_res.get("acquisition_date"),
                    "orbit_pass": sar_res.get("orbit_pass", "DESCENDING"),
                    "instrument": "Sentinel-1 C-SAR GRD RTC"
                }
        except Exception as e:
            self.last_error = str(e)

        self.status = ProviderStatus.DEGRADED
        return {
            "sar_vv": None,
            "sar_vh": None,
            "sar_ratio": None,
            "acquisition_date": None,
            "orbit_pass": "UNOBSERVED",
            "instrument": "Sentinel-1 C-SAR (Unobserved)"
        }

    def validate(self, raw_data: Dict[str, Any]) -> bool:
        return bool(raw_data and "sar_vv" in raw_data)

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "sar_vv": raw_data.get("sar_vv", 0.35),
            "sar_vh": raw_data.get("sar_vh", 0.08),
            "sar_ratio": raw_data.get("sar_ratio", 4.375),
            "acquisition_date": raw_data.get("acquisition_date"),
            "orbit_pass": raw_data.get("orbit_pass", "DESCENDING"),
            "status": self.status,
            "provider": self.name
        }

    def metadata(self) -> Dict[str, Any]:
        return {
            "dataset": "ESA Copernicus Sentinel-1 RTC",
            "resolution": "10 meters",
            "license": "Copernicus Open Access Policy",
            "status": self.status
        }
