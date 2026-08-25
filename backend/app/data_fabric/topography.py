import numpy as np
import rasterio
import rasterio.windows
from pathlib import Path
from typing import Dict, Any
from datetime import datetime, timezone
from app.config import DATA_DIR
from app.data_fabric.base import BaseProvider, ProviderStatus

class TopographyProvider(BaseProvider):
    """
    Extracts real terrain elevation, slope, aspect, TRI, local relief, and curvature
    from NASA/USGS SRTM 30m Global DEM raster mosaic.
    """
    def __init__(self):
        super().__init__(name="NASA/USGS SRTM 30m Topography", source_type="Local GeoTIFF Raster")
        self.dem_path = DATA_DIR / "dem" / "real_dem.tif"
        self.slope_path = DATA_DIR / "dem" / "slope.tif"
        self.aspect_path = DATA_DIR / "dem" / "aspect.tif"

    def fetch(self, lat: float, lon: float, **kwargs) -> Dict[str, Any]:
        self.last_checked = datetime.now(timezone.utc)
        if not (self.dem_path.exists() and self.slope_path.exists() and self.aspect_path.exists()):
            self.status = ProviderStatus.UNAVAILABLE
            self.last_error = "DEM GeoTIFF rasters not found on disk."
            return {}

        try:
            with rasterio.open(self.dem_path) as src_dem, \
                 rasterio.open(self.slope_path) as src_slope, \
                 rasterio.open(self.aspect_path) as src_aspect:

                bounds = src_dem.bounds
                if not (bounds.left <= lon <= bounds.right and bounds.bottom <= lat <= bounds.top):
                    self.status = ProviderStatus.DEGRADED
                    self.last_error = "Coordinate outside active NER DEM coverage bounds."
                    return {"out_of_bounds": True}

                r, c = src_dem.index(lon, lat)
                if not (0 <= r < src_dem.height and 0 <= c < src_dem.width):
                    self.status = ProviderStatus.DEGRADED
                    return {"out_of_bounds": True}

                # 1x1 point reads
                elev = float(src_dem.read(1, window=rasterio.windows.Window(c, r, 1, 1))[0, 0])
                slope = float(src_slope.read(1, window=rasterio.windows.Window(c, r, 1, 1))[0, 0])
                aspect = float(src_aspect.read(1, window=rasterio.windows.Window(c, r, 1, 1))[0, 0])

                if elev == src_dem.nodata or elev < -500.0 or np.isnan(elev) or slope < 0.0 or np.isnan(slope):
                    self.status = ProviderStatus.DEGRADED
                    return {
                        "elevation": None,
                        "slope": None,
                        "aspect": None,
                        "tri": None,
                        "relief_5x5": None,
                        "plan_curvature": None
                    }

                # 5x5 window morphology
                mean_lat = (bounds.bottom + bounds.top) / 2.0
                res_x_m = src_dem.res[0] * 111319.5 * np.cos(np.radians(mean_lat))
                w = rasterio.windows.Window(max(0, c - 2), max(0, r - 2), 5, 5)
                win = src_dem.read(1, window=w).astype(float)
                win[win == src_dem.nodata] = np.nan

                tri_val, relief_val, plan_c = 0.0, 0.0, 0.0
                if win.shape == (5, 5) and not np.isnan(win).any():
                    center_z = win[2, 2]
                    win3 = win[1:4, 1:4]
                    tri_val = np.sqrt(np.sum((win3 - center_z)**2) / 8.0)
                    relief_val = np.max(win) - np.min(win)

                    z1, z2, z3 = win3[0, 0], win3[0, 1], win3[0, 2]
                    z4, z5, z6 = win3[1, 0], win3[1, 1], win3[1, 2]
                    z7, z8, z9 = win3[2, 0], win3[2, 1], win3[2, 2]
                    L = res_x_m
                    D = ((z4 + z6) / 2.0 - z5) / (L**2)
                    E = ((z2 + z8) / 2.0 - z5) / (L**2)
                    F = (-z1 + z3 + z7 - z9) / (4.0 * (L**2))
                    G = (-z4 + z6) / (2.0 * L)
                    H = (z2 - z8) / (2.0 * L)
                    p = G**2 + H**2
                    plan_c = 2.0 * (D * (H**2) + E * (G**2) - F * G * H) / (p**1.5) if p > 1e-10 else 0.0

                self.status = ProviderStatus.AVAILABLE
                self.last_error = None
                return {
                    "elevation": elev,
                    "slope": slope,
                    "aspect": aspect,
                    "tri": float(tri_val),
                    "relief_5x5": float(relief_val),
                    "plan_curvature": float(plan_c * 100.0)
                }
        except Exception as e:
            self.last_error = str(e)

        self.status = ProviderStatus.DEGRADED
        return {
            "elevation": None,
            "slope": None,
            "aspect": None,
            "tri": None,
            "relief_5x5": None,
            "plan_curvature": None
        }

    def validate(self, raw_data: Dict[str, Any]) -> bool:
        if not raw_data:
            return False
        return True

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "elevation": round(float(raw_data["elevation"]), 1) if raw_data.get("elevation") is not None else None,
            "slope": round(float(raw_data["slope"]), 1) if raw_data.get("slope") is not None else None,
            "aspect": round(float(raw_data["aspect"]), 1) if raw_data.get("aspect") is not None else None,
            "tri": round(float(raw_data["tri"]), 2) if raw_data.get("tri") is not None else None,
            "relief_5x5": round(float(raw_data["relief_5x5"]), 1) if raw_data.get("relief_5x5") is not None else None,
            "plan_curvature": round(float(raw_data["plan_curvature"]), 4) if raw_data.get("plan_curvature") is not None else None,
            "status": self.status,
            "provider": self.name
        }

    def metadata(self) -> Dict[str, Any]:
        return {
            "dataset": "NASA/USGS SRTM 30m Global",
            "resolution": "30m spatial",
            "license": "Public Domain (NASA/USGS)",
            "coverage": "NER (N25E091, N26E091, N27E088, N27E092)",
            "status": self.status
        }
