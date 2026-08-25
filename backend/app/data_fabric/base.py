from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime, timezone

class ProviderStatus:
    AVAILABLE = "AVAILABLE"
    DEGRADED = "DEGRADED"
    UNAVAILABLE = "UNAVAILABLE"

class BaseProvider(ABC):
    """
    Abstract base class for all Data Fabric ingestion and feature extraction providers.
    Enforces standardized lifecycle: fetch -> validate -> normalize -> metadata.
    """
    def __init__(self, name: str, source_type: str):
        self.name = name
        self.source_type = source_type
        self.status = ProviderStatus.AVAILABLE
        self.last_checked: Optional[datetime] = None
        self.last_error: Optional[str] = None

    @abstractmethod
    def fetch(self, lat: float, lon: float, **kwargs) -> Dict[str, Any]:
        """Fetch raw observations or geospatial query for the target location."""
        pass

    @abstractmethod
    def validate(self, raw_data: Dict[str, Any]) -> bool:
        """Validate observations against physical constraints and schema."""
        pass

    @abstractmethod
    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert validated observations into canonical normalized representations."""
        pass

    @abstractmethod
    def metadata(self) -> Dict[str, Any]:
        """Return dataset provenance, license, resolution, and availability metadata."""
        pass

    def get_status_info(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "source_type": self.source_type,
            "status": self.status,
            "last_checked": self.last_checked.isoformat() if self.last_checked else None,
            "last_error": self.last_error
        }
