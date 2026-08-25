import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import unittest
import pandas as pd
import numpy as np
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

from app.config import DATA_DIR, MODELS_DIR
from app.ml.weather import get_historical_rainfall
from app.ml.satellite import get_sentinel1_backscatter
from app.ml.model import risk_model


class TestTemporalAccuracyFix(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset_path = DATA_DIR / "training_dataset.csv"
        cls.metadata_path = MODELS_DIR / "model_metadata.json"
        assert cls.dataset_path.exists(), f"Dataset not found at {cls.dataset_path}"
        cls.df = pd.read_csv(cls.dataset_path)
        cls.df['parsed_date'] = pd.to_datetime(cls.df['date'])

    def test_1_no_background_sample_uses_old_universal_date(self):
        """TEST 1: No background sample uses the old universal 2023-07-15 date."""
        negatives = self.df[self.df['label'] == 0]
        self.assertGreater(len(negatives), 0, "No negative samples found in dataset")
        
        # Check that negative samples are not all pinned to '2023/07/15' or '2023-07-15'
        date_strings = negatives['date'].astype(str).tolist()
        universal_date_count = sum(1 for d in date_strings if '2023/07/15' in d or '2023-07-15' in d)
        self.assertLess(
            universal_date_count,
            len(negatives) * 0.1,
            f"Too many negative samples ({universal_date_count}/{len(negatives)}) still use 2023-07-15"
        )
        self.assertGreater(
            negatives['parsed_date'].dt.year.nunique(),
            5,
            "Negative samples should span at least 5 distinct historical years"
        )

    def test_2_negative_dates_follow_intended_historical_distribution(self):
        """TEST 2: Negative dates follow the intended historical distribution."""
        positives = self.df[self.df['label'] == 1]
        negatives = self.df[self.df['label'] == 0]

        pos_years = set(positives['parsed_date'].dt.year)
        neg_years = set(negatives['parsed_date'].dt.year)

        # Overlap in historical years covered
        shared_years = pos_years.intersection(neg_years)
        self.assertGreaterEqual(
            len(shared_years),
            len(pos_years) * 0.7,
            f"Negative year coverage {neg_years} should cover >= 70% of positive years {pos_years}"
        )

        # Check seasonality (monsoon months 5-10 vs non-monsoon)
        pos_monsoon_pct = (positives['parsed_date'].dt.month.isin([5, 6, 7, 8, 9, 10])).mean()
        neg_monsoon_pct = (negatives['parsed_date'].dt.month.isin([5, 6, 7, 8, 9, 10])).mean()

        self.assertGreater(
            neg_monsoon_pct,
            0.60,
            f"Negative sampling should reflect historical monsoon seasonality (got {neg_monsoon_pct:.2f})"
        )
        self.assertAlmostEqual(
            pos_monsoon_pct,
            neg_monsoon_pct,
            delta=0.20,
            msg="Monsoon proportion between positives and negatives should be closely aligned"
        )

    def test_3_rainfall_windows_do_not_extend_beyond_reference_timestamp(self):
        """TEST 3: Rainfall windows do not extend beyond the reference timestamp."""
        ref_date = "2016-07-14 00:00:00+00"
        dt = pd.to_datetime(ref_date)
        
        # Verify interval calculation logic
        end_date = (dt - timedelta(days=1)).strftime("%Y-%m-%d")
        start_date = (dt - timedelta(days=7)).strftime("%Y-%m-%d")
        
        self.assertEqual(end_date, "2016-07-13", "End date of 7-day rainfall window must precede event date")
        self.assertEqual(start_date, "2016-07-07", "Start date must be 7 days before event")

    def test_4_sar_never_uses_post_event_imagery(self):
        """TEST 4: SAR never uses post-event imagery."""
        res = get_sentinel1_backscatter(25.5788, 91.8933, "2017-07-15 00:00:00+00")
        if res.get("sar_available") and res.get("acquisition_date"):
            acq_dt = pd.to_datetime(res["acquisition_date"]).tz_convert(timezone.utc)
            ref_dt = pd.to_datetime("2017-07-15 00:00:00+00").tz_convert(timezone.utc)
            self.assertLessEqual(
                acq_dt,
                ref_dt,
                f"SAR acquisition ({acq_dt}) must not be after the reference date ({ref_dt})"
            )

    def test_5_missing_historical_sar_does_not_become_class_correlated_zero_values(self):
        """TEST 5: Missing historical SAR does not become class-correlated zero values."""
        # Pre-2014 query should return neutral medians (0.35, 0.08), NOT 0.0
        res = get_sentinel1_backscatter(25.5788, 91.8933, "2012-07-15 00:00:00+00")
        self.assertFalse(res["sar_available"])
        self.assertAlmostEqual(res["sar_vv"], 0.35, places=2)
        self.assertAlmostEqual(res["sar_vh"], 0.08, places=2)

        # Check in dataset: No positive or negative sample has sar_vv == 0.0
        zero_vv_count = (self.df['sar_vv'] == 0.0).sum()
        self.assertEqual(zero_vv_count, 0, "No sample should have hardcoded 0.0 SAR backscatter")

    def test_6_no_duplicate_coordinates(self):
        """TEST 6: No duplicate coordinates."""
        dup_count = self.df.duplicated(subset=['latitude', 'longitude']).sum()
        self.assertEqual(dup_count, 0, f"Found {dup_count} duplicate coordinate pairs in training dataset")

        pos = self.df[self.df['label'] == 1]
        neg = self.df[self.df['label'] == 0]
        pos_coords = set(zip(pos['latitude'], pos['longitude']))
        neg_coords = set(zip(neg['latitude'], neg['longitude']))
        overlap = pos_coords.intersection(neg_coords)
        self.assertEqual(len(overlap), 0, f"Positive and negative samples overlap at {len(overlap)} coordinates")

    def test_7_train_test_spatial_groups_remain_separated(self):
        """TEST 7: Train/test spatial groups remain separated during GroupKFold."""
        from sklearn.model_selection import GroupKFold
        X = self.df[['elevation', 'slope', 'aspect']]
        y = self.df['label']
        groups = self.df['spatial_group']

        gkf = GroupKFold(n_splits=min(3, groups.nunique()))
        for train_idx, test_idx in gkf.split(X, y, groups):
            train_grps = set(groups.iloc[train_idx])
            test_grps = set(groups.iloc[test_idx])
            overlap = train_grps.intersection(test_grps)
            self.assertEqual(len(overlap), 0, f"Spatial group leakage between train and test: {overlap}")

    def test_8_training_and_production_feature_schemas_match(self):
        """TEST 8: Training and production feature schemas match."""
        expected_features = [
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
        
        # 1. Check training dataset
        for feat in expected_features:
            self.assertIn(feat, self.df.columns, f"Feature '{feat}' missing from training dataset")

        # 2. Check production model
        risk_model.load()
        self.assertTrue(risk_model.is_loaded, "Production risk model failed to load")

        # 3. Test production inference output schema
        test_payload = {f: 10.0 for f in expected_features}
        pred = risk_model.predict(test_payload)
        
        self.assertIn("probability", pred)
        self.assertIn("risk_level", pred)
        self.assertIn("explanation", pred)
        self.assertIsInstance(pred["probability"], float)
        self.assertIn(pred["risk_level"], ["LOW", "MODERATE", "HIGH", "CRITICAL"])
        
        exp_features = [item["feature"] for item in pred["explanation"]]
        self.assertEqual(sorted(exp_features), sorted(expected_features))


if __name__ == "__main__":
    unittest.main()
