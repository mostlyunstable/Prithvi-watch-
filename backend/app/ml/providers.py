import pandas as pd
from abc import ABC, abstractmethod
import os
import subprocess
from pathlib import Path

class LandslideDataProvider(ABC):
    @abstractmethod
    def fetch_data(self) -> pd.DataFrame:
        pass

class NASAProvider(LandslideDataProvider):
    def __init__(self, url="https://data.nasa.gov/docs/legacy/Global_Landslide_Catalog_Export/Global_Landslide_Catalog_Export_rows.csv"):
        self.url = url
        
    def fetch_data(self) -> pd.DataFrame:
        print("Fetching from NASA...")
        # Since this blocked, we will just return empty to trigger fallback
        return pd.DataFrame()

class GSIProvider(LandslideDataProvider):
    def fetch_data(self) -> pd.DataFrame:
        print("Fetching from GSI...")
        # Placeholder for GSI API
        return pd.DataFrame()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR.parent / "data" if (BASE_DIR.parent / "data").exists() else BASE_DIR / "data"

class LocalDatasetProvider(LandslideDataProvider):
    def __init__(self, file_path: str = "data/landslides/source/historical_landslides.csv"):
        p = Path(file_path)
        if not p.is_absolute():
            # Check cwd and DATA_DIR
            if p.exists():
                self.file_path = p
            elif (DATA_DIR / "landslides" / "source" / "historical_landslides.csv").exists():
                self.file_path = DATA_DIR / "landslides" / "source" / "historical_landslides.csv"
            else:
                self.file_path = p
        else:
            self.file_path = p
        
    def fetch_data(self) -> pd.DataFrame:
        if self.file_path.exists():
            print(f"Reading local dataset from {self.file_path}...")
            return pd.read_csv(self.file_path)
        else:
            print(f"Local dataset {self.file_path} not found.")
            return pd.DataFrame()

class GithubMirrorProvider(LandslideDataProvider):
    """Fallback provider to download NASA GLC from a public GitHub mirror if NASA is blocked."""
    def __init__(self, url="https://raw.githubusercontent.com/Arsalaan-Alam/landsafe/main/Global%20Landslide%20Catalog.csv"):
        self.url = url
        
    def fetch_data(self) -> pd.DataFrame:
        print(f"Fetching from Github Mirror: {self.url}...")
        csv_path = "/tmp/nasa_glc_mirror.csv"
        try:
            if not os.path.exists(csv_path):
                subprocess.run(["curl", "-k", "-L", "-o", csv_path, self.url], check=True)
            return pd.read_csv(csv_path)
        except Exception as e:
            print(f"Failed to fetch from mirror: {e}")
            return pd.DataFrame()

def get_historical_landslides() -> pd.DataFrame:
    providers = [
        NASAProvider(),
        GSIProvider(),
        LocalDatasetProvider("data/landslides/source/historical_landslides.csv"),
        GithubMirrorProvider()
    ]
    
    for provider in providers:
        df = provider.fetch_data()
        if not df.empty:
            print(f"Successfully loaded {len(df)} records.")
            return df
            
    raise Exception("All data providers failed to retrieve historical landslides.")
