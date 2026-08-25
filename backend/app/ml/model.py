import xgboost as xgb
import shap
import pandas as pd
from typing import Dict, Any, List
from app.config import MODELS_DIR

class LandslideRiskModel:
    def __init__(self):
        self.model = xgb.XGBClassifier()
        self.model_path = MODELS_DIR / "xgboost_model.json"
        self.is_loaded = False
        self.explainer = None
        
    def load(self):
        if self.model_path.exists():
            self.model.load_model(self.model_path)
            self.is_loaded = True
            # Tree explainer for SHAP
            self.explainer = shap.TreeExplainer(self.model)
        else:
            print(f"Model artifact not found at {self.model_path}. Please train the model.")
            
    def predict(self, features: dict) -> Dict[str, Any]:
        if not self.is_loaded:
            self.load()
            
        df = pd.DataFrame([features])
        # Ensure column order exactly matches the real training dataset
        cols = [
            'elevation',
            'slope',
            'aspect',
            'tri',
            'relief_5x5',
            'plan_curvature',
            'dist_to_infrastructure_km',
            'rainfall_7d_mm',
            'sar_vv',
            'sar_vh'
        ]
        for c in cols:
            if c not in df.columns or df[c].iloc[0] is None:
                df[c] = 0.0
        df = df[cols]
        
        prob = float(self.model.predict_proba(df)[0][1]) # Probability of class 1
        
        if prob < 0.40:
            risk_level = "LOW"
        elif prob < 0.60:
            risk_level = "MODERATE"
        elif prob < 0.80:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"
            
        # SHAP Explainability
        explanation: List[Dict[str, Any]] = []
        if self.explainer:
            shap_values = self.explainer.shap_values(df)[0]
            feature_names = list(df.columns)
            for idx, val in enumerate(shap_values):
                mag = abs(val)
                if mag > 1.0:
                    impact = "VERY HIGH"
                elif mag > 0.5:
                    impact = "HIGH"
                elif mag > 0.1:
                    impact = "MODERATE"
                else:
                    impact = "LOW"
                    
                explanation.append({
                    "feature": feature_names[idx],
                    "impact": impact,
                    "value": round(float(val), 4)
                })
                
        return {
            "probability": float(prob),
            "risk_level": risk_level,
            "explanation": explanation
        }

risk_model = LandslideRiskModel()
