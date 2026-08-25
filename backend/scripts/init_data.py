import json
from pathlib import Path
import os

def create_dummy_ner_geojson():
    base_dir = Path(__file__).resolve().parent.parent.parent
    data_dir = base_dir / "data" / "boundaries"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    filepath = data_dir / "ner_boundaries.geojson"
    
    # Very rough bounding box of NER India
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": "North Eastern Region",
                    "id": "NER_01"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [89.8, 21.9],
                            [97.4, 21.9],
                            [97.4, 29.5],
                            [89.8, 29.5],
                            [89.8, 21.9]
                        ]
                    ]
                }
            }
        ]
    }
    
    with open(filepath, "w") as f:
        json.dump(geojson, f, indent=2)
    print(f"Created {filepath}")

if __name__ == "__main__":
    create_dummy_ner_geojson()
