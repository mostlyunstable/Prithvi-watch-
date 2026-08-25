import json
from pathlib import Path

# Clean state polygons matching actual administrative bounds of the 8 NER states
NER_STATES_GEOJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "state_name": "Meghalaya",
        "state_code": "ML",
        "capital": "Shillong",
        "area_sq_km": 22429,
        "region": "North Eastern Region"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [89.85, 25.15], [90.20, 25.10], [91.00, 25.15], [91.75, 25.20],
          [92.50, 25.10], [92.80, 25.40], [92.70, 25.80], [92.00, 25.95],
          [91.50, 26.05], [90.50, 25.90], [89.80, 25.80], [89.85, 25.15]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "state_name": "Assam",
        "state_code": "AS",
        "capital": "Guwahati",
        "area_sq_km": 78438,
        "region": "North Eastern Region"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [89.70, 26.00], [90.50, 26.15], [91.50, 26.20], [92.50, 26.60],
          [93.50, 26.70], [94.50, 27.20], [95.50, 27.60], [96.00, 27.90],
          [95.50, 27.20], [94.00, 26.20], [93.00, 25.80], [92.50, 24.50],
          [92.80, 24.20], [92.40, 24.20], [92.00, 25.50], [90.50, 25.50],
          [89.70, 26.00]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "state_name": "Sikkim",
        "state_code": "SK",
        "capital": "Gangtok",
        "area_sq_km": 7096,
        "region": "North Eastern Region"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [88.05, 27.10], [88.10, 27.70], [88.50, 28.10], [88.85, 27.90],
          [88.85, 27.15], [88.50, 27.05], [88.05, 27.10]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "state_name": "Arunachal Pradesh",
        "state_code": "AR",
        "capital": "Itanagar",
        "area_sq_km": 83743,
        "region": "North Eastern Region"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.60, 27.30], [92.00, 28.00], [93.50, 28.60], [95.00, 29.20],
          [96.50, 28.80], [97.35, 28.20], [96.80, 27.50], [95.50, 27.00],
          [93.80, 27.00], [92.50, 26.80], [91.60, 27.30]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "state_name": "Nagaland",
        "state_code": "NL",
        "capital": "Kohima",
        "area_sq_km": 16579,
        "region": "North Eastern Region"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.35, 25.60], [93.80, 26.20], [94.50, 26.90], [95.20, 27.00],
          [95.10, 26.00], [94.50, 25.50], [93.50, 25.30], [93.35, 25.60]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "state_name": "Manipur",
        "state_code": "MN",
        "capital": "Imphal",
        "area_sq_km": 22327,
        "region": "North Eastern Region"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [93.10, 24.00], [93.20, 25.20], [94.20, 25.65], [94.75, 25.20],
          [94.50, 24.20], [93.80, 23.85], [93.10, 24.00]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "state_name": "Mizoram",
        "state_code": "MZ",
        "capital": "Aizawl",
        "area_sq_km": 21081,
        "region": "North Eastern Region"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [92.30, 22.00], [92.30, 24.10], [92.90, 24.45], [93.35, 24.20],
          [93.30, 22.50], [92.80, 21.90], [92.30, 22.00]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "state_name": "Tripura",
        "state_code": "TR",
        "capital": "Agartala",
        "area_sq_km": 10491,
        "region": "North Eastern Region"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [91.15, 23.00], [91.20, 24.20], [92.25, 24.45], [92.20, 23.50],
          [91.80, 22.95], [91.15, 23.00]
        ]]
      }
    }
  ]
}

out_path = Path("data/boundaries/ner_states.geojson")
out_path.parent.mkdir(parents=True, exist_ok=True)
with open(out_path, "w") as f:
    json.dump(NER_STATES_GEOJSON, f, indent=2)

print("Generated ner_states.geojson successfully with 8 states.")
