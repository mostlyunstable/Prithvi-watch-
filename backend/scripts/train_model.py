import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import GroupKFold
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix
)
from pathlib import Path
from datetime import datetime, timezone

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

def evaluate_predictions(y_true, y_prob, threshold=0.5):
    y_pred = (y_prob >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred).tolist()
    return {
        "roc_auc": float(roc_auc_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else None,
        "pr_auc": float(average_precision_score(y_true, y_prob)) if len(np.unique(y_true)) > 1 else None,
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "brier_score": float(brier_score_loss(y_true, y_prob)),
        "confusion_matrix": cm
    }

def train():
    print("=" * 60)
    print("PRITHVI WATCH — PHASE 2 MODEL RETRAINING (10 PHYSICAL FEATURES)")
    print("=" * 60)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    dataset_path = DATA_DIR / "training_dataset.csv"
    if not dataset_path.exists():
        print(f"Training dataset not found at {dataset_path}.")
        return
        
    df = pd.read_csv(dataset_path)
    df['parsed_date'] = pd.to_datetime(df['date'])
    df['year'] = df['parsed_date'].dt.year
    
    full_features = [
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
    
    # Fill any NaNs safely with neutral physical medians
    for c in full_features:
        if c not in df.columns:
            df[c] = 0.0
        df[c] = df[c].fillna(0.0)
        
    X = df[full_features]
    y = df['label']
    groups = df['spatial_group']
    
    print(f"Total samples: {len(df)} (Positives: {sum(y==1)}, Negatives: {sum(y==0)})")
    print(f"Feature Schema ({len(full_features)} features): {full_features}")
    print(f"Unique spatial groups: {groups.nunique()} ({list(groups.unique())})")
    print(f"Temporal range: {df['year'].min()} to {df['year'].max()}")
    
    # ----------------------------------------------------
    # 1. SPATIAL GROUPKFOLD VALIDATION
    # ----------------------------------------------------
    print("\n--- 1. SPATIAL GROUPKFOLD VALIDATION (1-Degree Grid) ---")
    gkf = GroupKFold(n_splits=min(3, groups.nunique()))
    
    spatial_metrics = {"precisions": [], "recalls": [], "f1s": [], "roc_aucs": [], "pr_aucs": [], "brier_scores": []}
    spatial_preds, spatial_probs, spatial_trues = [], [], []
    
    for fold, (train_idx, test_idx) in enumerate(gkf.split(X, y, groups)):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        
        if len(np.unique(y_test)) < 2:
            continue
            
        model = xgb.XGBClassifier(eval_metric='logloss', random_state=42)
        model.fit(X_train, y_train)
        
        y_prob = model.predict_proba(X_test)[:, 1]
        eval_res = evaluate_predictions(y_test, y_prob)
        
        spatial_metrics["precisions"].append(eval_res["precision"])
        spatial_metrics["recalls"].append(eval_res["recall"])
        spatial_metrics["f1s"].append(eval_res["f1"])
        spatial_metrics["roc_aucs"].append(eval_res["roc_auc"])
        spatial_metrics["pr_aucs"].append(eval_res["pr_auc"])
        spatial_metrics["brier_scores"].append(eval_res["brier_score"])
        
        spatial_trues.extend(y_test.tolist())
        spatial_probs.extend(y_prob.tolist())
        spatial_preds.extend((y_prob >= 0.5).astype(int).tolist())
        
        print(f"  Fold {fold+1} Test Groups {list(df['spatial_group'].iloc[test_idx].unique())}: "
              f"ROC-AUC={eval_res['roc_auc']:.4f}, PR-AUC={eval_res['pr_auc']:.4f}, F1={eval_res['f1']:.4f}")
              
    avg_spatial = {k: float(np.mean(v)) for k, v in spatial_metrics.items()}
    overall_spatial_cm = confusion_matrix(spatial_trues, spatial_preds).tolist()
    print(f"\nAverage Spatial Holdout Metrics:")
    print(f"  ROC-AUC:     {avg_spatial['roc_aucs']:.4f}")
    print(f"  PR-AUC:      {avg_spatial['pr_aucs']:.4f}")
    print(f"  Precision:   {avg_spatial['precisions']:.4f}")
    print(f"  Recall:      {avg_spatial['recalls']:.4f}")
    print(f"  F1 Score:    {avg_spatial['f1s']:.4f}")
    print(f"  Brier Score: {avg_spatial['brier_scores']:.4f}")
    print(f"  Overall CM:  {overall_spatial_cm}")
    
    # ----------------------------------------------------
    # 2. TEMPORAL HOLDOUT VALIDATION (Pre-2014 vs 2014-2018)
    # ----------------------------------------------------
    print("\n--- 2. TEMPORAL HOLDOUT VALIDATION (Train <= 2013, Test >= 2014) ---")
    train_mask = df['year'] <= 2013
    test_mask = df['year'] >= 2014
    
    X_train_t, y_train_t = X[train_mask], y[train_mask]
    X_test_t, y_test_t = X[test_mask], y[test_mask]
    
    temp_model = xgb.XGBClassifier(eval_metric='logloss', random_state=42)
    temp_model.fit(X_train_t, y_train_t)
    
    y_prob_t = temp_model.predict_proba(X_test_t)[:, 1]
    temporal_eval = evaluate_predictions(y_test_t, y_prob_t)
    
    print(f"  Temporal Train Samples (<= 2013): {len(X_train_t)}")
    print(f"  Temporal Test Samples (>= 2014):  {len(X_test_t)}")
    print(f"  Temporal ROC-AUC:     {temporal_eval['roc_auc']:.4f}")
    print(f"  Temporal PR-AUC:      {temporal_eval['pr_auc']:.4f}")
    print(f"  Temporal Precision:   {temporal_eval['precision']:.4f}")
    print(f"  Temporal Recall:      {temporal_eval['recall']:.4f}")
    print(f"  Temporal F1 Score:    {temporal_eval['f1']:.4f}")
    print(f"  Temporal Brier Score: {temporal_eval['brier_score']:.4f}")
    print(f"  Temporal CM:          {temporal_eval['confusion_matrix']}")
    
    # ----------------------------------------------------
    # 3. FEATURE ABLATION STUDY
    # ----------------------------------------------------
    print("\n--- 3. FEATURE ABLATION STUDY (Identical Spatial CV) ---")
    ablation_schemas = {
        "1. Baseline (Elevation, Slope, Aspect)": ['elevation', 'slope', 'aspect'],
        "2. Morphology (TRI, Relief, Plan Curvature)": ['elevation', 'slope', 'aspect', 'tri', 'relief_5x5', 'plan_curvature'],
        "3. Morphology + Rain (7d)": ['elevation', 'slope', 'aspect', 'tri', 'relief_5x5', 'plan_curvature', 'rainfall_7d_mm'],
        "4. Full Enhanced (10 Features)": full_features
    }
    
    ablation_results = {}
    for name, schema in ablation_schemas.items():
        aucs, f1s, briers = [], [], []
        for train_idx, test_idx in gkf.split(df[schema], y, groups):
            if len(np.unique(y.iloc[test_idx])) < 2:
                continue
            m = xgb.XGBClassifier(eval_metric='logloss', random_state=42).fit(df[schema].iloc[train_idx], y.iloc[train_idx])
            p = m.predict_proba(df[schema].iloc[test_idx])[:, 1]
            e = evaluate_predictions(y.iloc[test_idx], p)
            aucs.append(e["roc_auc"])
            f1s.append(e["f1"])
            briers.append(e["brier_score"])
        ablation_results[name] = {
            "features": schema,
            "roc_auc": float(np.mean(aucs)),
            "f1": float(np.mean(f1s)),
            "brier_score": float(np.mean(briers))
        }
        print(f"  {name:45s} | ROC-AUC: {np.mean(aucs):.4f} | F1: {np.mean(f1s):.4f} | Brier: {np.mean(briers):.4f}")
        
    # ----------------------------------------------------
    # 4. SUBGROUP PERFORMANCE (Spatial Groups & SAR)
    # ----------------------------------------------------
    print("\n--- 4. SUBGROUP PERFORMANCE ---")
    production_model = xgb.XGBClassifier(eval_metric='logloss', random_state=42)
    production_model.fit(X, y)
    
    df['pred_prob'] = production_model.predict_proba(X)[:, 1]
    df['pred_label'] = (df['pred_prob'] >= 0.5).astype(int)
    
    per_group_perf = {}
    for grp, grp_df in df.groupby('spatial_group'):
        if len(np.unique(grp_df['label'])) > 1:
            per_group_perf[grp] = {
                "samples": len(grp_df),
                "roc_auc": float(roc_auc_score(grp_df['label'], grp_df['pred_prob'])),
                "f1": float(f1_score(grp_df['label'], grp_df['pred_label'], zero_division=0))
            }
            print(f"  Spatial Group {grp:8s}: Samples={len(grp_df):3d}, ROC-AUC={per_group_perf[grp]['roc_auc']:.4f}, F1={per_group_perf[grp]['f1']:.4f}")
            
    # ----------------------------------------------------
    # 5. SAVE VERSIONED PRODUCTION MODEL & METADATA
    # ----------------------------------------------------
    model_path = MODELS_DIR / "xgboost_model.json"
    production_model.save_model(model_path)
    
    metadata_path = MODELS_DIR / "model_metadata.json"
    metadata = {
        "model_version": "v4.2-multimodal-morphology-enhanced",
        "dataset_version": "v4.2-morphology-infrastructure",
        "features": full_features,
        "training_samples": len(df),
        "positive_samples": int(sum(y == 1)),
        "background_samples": int(sum(y == 0)),
        "temporal_coverage": f"{df['year'].min()}–{df['year'].max()}",
        "validation_methods": [
            "Spatial GroupKFold (1-degree holdout)",
            "Temporal Holdout (<= 2013 vs >= 2014)"
        ],
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "random_seed": 42,
        "spatial_holdout_metrics": {
            "roc_auc": avg_spatial["roc_aucs"],
            "pr_auc": avg_spatial["pr_aucs"],
            "precision": avg_spatial["precisions"],
            "recall": avg_spatial["recalls"],
            "f1_score": avg_spatial["f1s"],
            "brier_score": avg_spatial["brier_scores"],
            "confusion_matrix": overall_spatial_cm
        },
        "temporal_holdout_metrics": {
            "train_period": "<= 2013",
            "test_period": "2014–2018",
            "roc_auc": temporal_eval["roc_auc"],
            "pr_auc": temporal_eval["pr_auc"],
            "precision": temporal_eval["precision"],
            "recall": temporal_eval["recall"],
            "f1_score": temporal_eval["f1"],
            "brier_score": temporal_eval["brier_score"],
            "confusion_matrix": temporal_eval["confusion_matrix"]
        },
        "feature_ablations": ablation_results,
        "subgroup_performance": {
            "spatial_groups": per_group_perf
        }
    }
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\nProduction model cleanly saved to: {model_path}")
    print(f"Updated metadata written to:      {metadata_path}")
    print("=" * 60)


if __name__ == "__main__":
    train()

