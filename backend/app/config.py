import os
from pathlib import Path

def get_project_root() -> Path:
    """
    Deterministically locates the repository project root directory.
    Works whether launched from root, backend/, uvicorn, or pytest.
    """
    # Start from this file: backend/app/config.py
    current = Path(__file__).resolve().parent
    # Ascend until we find 'data' or 'models' or reach filesystem root
    for parent in [current] + list(current.parents):
        if (parent / "data").exists() and (parent / "models").exists():
            return parent
        if (parent / "backend").exists() and (parent / "frontend").exists():
            return parent
            
    # Fallback to backend parent
    return current.parent.parent

PROJECT_ROOT = get_project_root()
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"

# Operational Risk Velocity & Trend Classification Configuration
# (Operational visualization thresholds, not hazard guarantees)
VELOCITY_THRESHOLDS = {
    "RAPIDLY_DECREASING": -0.15,
    "DECREASING_LOWER": -0.15,
    "DECREASING_UPPER": -0.05,
    "STABLE_LOWER": -0.05,
    "STABLE_UPPER": 0.05,
    "INCREASING_LOWER": 0.05,
    "INCREASING_UPPER": 0.15,
    "RAPIDLY_INCREASING": 0.15
}

VELOCITY_COLORS = {
    "RAPIDLY_DECREASING": "#15803d",
    "DECREASING": "#4ade80",
    "STABLE": "#94a3b8",
    "INCREASING": "#f97316",
    "RAPIDLY_INCREASING": "#ef4444",
    "INSUFFICIENT_HISTORY": "#64748b"
}

