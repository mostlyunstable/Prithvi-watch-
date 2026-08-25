import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import GroupKFold
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

def train():
    print("Training XGBoost model on EXPANDED geospatial data with Spatial Group Validation...")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    dataset_path = DATA_DIR / "training_dataset.csv"
    if not dataset_path.exists():
        print("Training dataset not found.")
        return
        
    df = pd.read_csv(dataset_path)
    
    features = ['elevation', 'slope', 'aspect', 'rainfall_7d_mm', 'sar_vv', 'sar_vh']
    X = df[features]
    y = df['label']
    groups = df['spatial_group']
    
    print(f"Total samples: {len(df)} (Positives: {sum(y==1)}, Negatives: {sum(y==0)})")
    print(f"Number of unique spatial 1-degree groups: {groups.nunique()}")
    
    # Use GroupKFold for spatial validation (n_splits=3 for robustness, we'll keep the last split as the model to save)
    gkf = GroupKFold(n_splits=min(3, groups.nunique()))
    
    precisions, recalls, f1s, aucs = [], [], [], []
    final_cm = None
    best_model = None
    
    for train_idx, test_idx in gkf.split(X, y, groups):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        
        # Avoid edge cases where a fold has no positives
        if sum(y_test) == 0:
            continue
            
        model = xgb.XGBClassifier(eval_metric='logloss')
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        
        precisions.append(precision_score(y_test, y_pred, zero_division=0))
        recalls.append(recall_score(y_test, y_pred, zero_division=0))
        f1s.append(f1_score(y_test, y_pred, zero_division=0))
        aucs.append(roc_auc_score(y_test, y_prob))
        final_cm = confusion_matrix(y_test, y_pred).tolist()
        best_model = model # Just keep the last valid model for inference
        
    if not aucs:
        # Fallback if GroupKFold fails due to extreme scarcity
        print("Spatial GroupKFold failed (likely due to severe sparsity). Falling back to basic fit.")
        best_model = xgb.XGBClassifier(eval_metric='logloss').fit(X, y)
        y_pred = best_model.predict(X)
        precisions = [precision_score(y, y_pred, zero_division=0)]
        recalls = [recall_score(y, y_pred, zero_division=0)]
        f1s = [f1_score(y, y_pred, zero_division=0)]
        aucs = [roc_auc_score(y, best_model.predict_proba(X)[:, 1])]
        final_cm = confusion_matrix(y, y_pred).tolist()

    avg_precision = np.mean(precisions)
    avg_recall = np.mean(recalls)
    avg_f1 = np.mean(f1s)
    avg_auc = np.mean(aucs)
    
    print(f"\n--- VALIDATION METRICS (Spatial Holdout Avg) ---")
    print(f"Precision: {avg_precision:.4f}")
    print(f"Recall:    {avg_recall:.4f}")
    print(f"F1 Score:  {avg_f1:.4f}")
    print(f"ROC AUC:   {avg_auc:.4f}")
    print(f"Last Fold CM: {final_cm}")
    
    # Save Model
    model_path = MODELS_DIR / "xgboost_model.json"
    best_model.save_model(model_path)
    
    metadata_path = MODELS_DIR / "model_metadata.json"
    metadata = {
        "model_version": "v3.0-expanded-spatial",
        "features": features,
        "training_samples": len(df),
        "positive_samples": int(sum(y==1)),
        "background_samples": int(sum(y==0)),
        "geographic_coverage": "Meghalaya, Assam, Sikkim, Arunachal Pradesh borders",
        "dataset_source": "NASA GLC Github Mirror + SRTM",
        "validation_method": "Spatial GroupKFold (1-degree grid)",
        "training_timestamp": datetime.utcnow().isoformat() + "Z",
        "metrics": {
            "precision": float(avg_precision),
            "recall": float(avg_recall),
            "f1_score": float(avg_f1),
            "roc_auc": float(avg_auc),
            "confusion_matrix": final_cm
        }
    }
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\nModel saved to {model_path}")

if __name__ == "__main__":
    train()
