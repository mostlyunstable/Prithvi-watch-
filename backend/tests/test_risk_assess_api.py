from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_risk_assess_endpoint():
    response = client.post("/api/risk/assess", json={"latitude": 26.18, "longitude": 91.75})
    assert response.status_code == 200
    data = response.json()
    assert "flood" in data
    assert "landslide" in data
    assert "assessedAt" in data
