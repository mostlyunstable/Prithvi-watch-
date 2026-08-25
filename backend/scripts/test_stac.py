import requests
import rasterio

url = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
payload = {
    "collections": ["sentinel-1-rtc"],
    "intersects": {"type": "Point", "coordinates": [92.5, 25.5]},
    "datetime": "2023-06-01T00:00:00Z/2023-07-15T00:00:00Z",
    "limit": 1
}
resp = requests.post(url, json=payload).json()
vv_url = resp['features'][0]['assets']['vv']['href']

# Try to sign the url using planetary computer token API
token_url = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-1-rtc"
token_resp = requests.get(token_url).json()
signed_url = f"{vv_url}?{token_resp['token']}"

try:
    with rasterio.open(signed_url) as src:
        print("Successfully opened STAC asset via Rasterio!")
        r, c = src.index(92.5, 25.5)
        print("Value:", src.read(1)[r, c])
except Exception as e:
    print("Failed:", e)
