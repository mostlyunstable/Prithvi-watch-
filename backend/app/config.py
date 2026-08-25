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
