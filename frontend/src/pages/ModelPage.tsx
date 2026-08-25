import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { safeToFixed } from '../utils/geoAnalytics';

export const ModelPage: React.FC = () => {
  const { modelInfo, prediction, selectedRegionName } = useApp();
  const [selectedFeature, setSelectedFeature] = useState<string>('rainfall_7d_mm');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  const featureDetails: Record<string, {
    label: string;
    unit: string;
    simpleExplanation: string;
    whyItMatters: string;
    sensor: string;
  }> = {
    rainfall_7d_mm: {
      label: '7-Day Rainfall',
      unit: 'mm',
      simpleExplanation: 'How much rain fell in this area over the past 7 days.',
      whyItMatters: 'Water adds immense weight to hillsides and lubricates rock layers, acting as the primary landslide trigger.',
      sensor: 'ERA5 Weather Satellite & Ground Stations'
    },
    slope: {
      label: 'Ground Steepness',
      unit: 'degrees (°)',
      simpleExplanation: 'How steep the hillside is at this location.',
      whyItMatters: 'Steeper mountainsides pull downward with greater force, making loose rock and wet mud slide more easily.',
      sensor: 'NASA SRTM 30-meter Topography Radar'
    },
    elevation: {
      label: 'Height Above Sea Level',
      unit: 'meters (m)',
      simpleExplanation: 'How high this mountain is above sea level.',
      whyItMatters: 'Helps identify mountainous relief and ridge-valley transitions across the Himalayas and Meghalaya plateau.',
      sensor: 'NASA Space Shuttle Radar (SRTM)'
    },
    aspect: {
      label: 'Slope Facing Direction',
      unit: 'degrees azimuth (°)',
      simpleExplanation: 'Which direction the slope faces (e.g. South, North, East, West).',
      whyItMatters: 'South-facing Himalayan ridges take the full brunt of incoming monsoon winds and moisture.',
      sensor: 'Calculated from NASA 3D Elevation Terrain'
    },
    sar_vv: {
      label: 'Satellite Radar (Vertical-Vertical)',
      unit: 'decibels (dB)',
      simpleExplanation: 'Radar waves bouncing vertically off ground vegetation and rock.',
      whyItMatters: 'Radar sees right through thick monsoon clouds and nighttime darkness to measure physical ground conditions.',
      sensor: 'European Space Agency Sentinel-1 Radar Satellite'
    },
    sar_vh: {
      label: 'Satellite Radar (Vertical-Horizontal)',
      unit: 'decibels (dB)',
      simpleExplanation: 'Radar waves that twist and reflect off complex tree canopy and rough mountain soil.',
      whyItMatters: 'Reveals differences between dense forest canopy, bare exposed rocks, and wet muddy slopes.',
      sensor: 'European Space Agency Sentinel-1 Radar Satellite'
    }
  };

  const metrics = modelInfo?.audited_metrics ?? {
    clean_concurrent_era_roc_auc: 0.7571,
    terrain_only_baseline_roc_auc: 0.5750
  };

  const currentFeatureValue = prediction?.features?.[selectedFeature as keyof typeof prediction.features] ?? null;
  const currentShap = prediction?.explanation?.find((e) => e.feature === selectedFeature);

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 text-slate-200">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            Model Explanation &amp; Science
          </span>
          <h1 className="text-lg font-bold text-white tracking-tight">
            How the System Predicts Landslides
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Clear, transparent explanation of the 6 environmental measurements driving model decisions.
          </p>
        </div>

        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-lg text-xs font-mono transition flex items-center space-x-1.5"
        >
          <span>{showTechnicalDetails ? 'Hide engineering specs' : 'View engineering specs'}</span>
          {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 1. Simple 3-Step Process Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
          <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center font-bold font-mono text-xs">
            1
          </div>
          <h3 className="font-bold text-white text-sm">Gather Observations</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            The system combines NASA elevation terrain data, European Sentinel radar satellites, and weather rainfall history for every 100m grid cell.
          </p>
        </div>

        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
          <div className="w-7 h-7 rounded-lg bg-orange-950 border border-orange-800 text-orange-400 flex items-center justify-center font-bold font-mono text-xs">
            2
          </div>
          <h3 className="font-bold text-white text-sm">Compare Historical Patterns</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Our machine learning model compares current conditions against 969 real historical landslides recorded across Northeast India.
          </p>
        </div>

        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold font-mono text-xs">
            3
          </div>
          <h3 className="font-bold text-white text-sm">Explain the Result</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Instead of giving a black-box percentage, the system tells you exactly which factors (steepness, rain, height) are increasing or decreasing risk.
          </p>
        </div>
      </div>

      {/* 2. Interactive Feature Explorer */}
      <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            Interactive Feature Explorer
          </span>
          <h2 className="text-sm font-bold text-white">
            The 6 Observations Used by the AI Model
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Click any measurement below to see what it means and how it affects landslide risk:
          </p>
        </div>

        {/* Feature Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(featureDetails).map(([key, f]) => {
            const isSelected = selectedFeature === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedFeature(key)}
                className={`p-2.5 rounded-lg border text-left transition ${
                  isSelected
                    ? 'bg-slate-800 border-slate-600 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-950'
                }`}
              >
                <span className="font-bold block text-xs truncate">{f.label}</span>
                <span className="text-[10px] font-mono text-slate-500 block">{f.unit}</span>
              </button>
            );
          })}
        </div>

        {/* Feature Detail Showcase */}
        {selectedFeature && featureDetails[selectedFeature] && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-850 pb-2">
              <div>
                <span className="text-sm font-bold text-white font-mono">
                  {featureDetails[selectedFeature].label}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans">
                  Measured in: {featureDetails[selectedFeature].unit}
                </span>
              </div>

              {currentFeatureValue !== null && (
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-500 uppercase block">Value at {selectedRegionName}</span>
                  <span className="font-bold text-orange-400 text-sm">
                    {typeof currentFeatureValue === 'number' ? safeToFixed(currentFeatureValue, 1, '0.0') : currentFeatureValue} {featureDetails[selectedFeature].unit}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  What It Tells the System
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {featureDetails[selectedFeature].simpleExplanation}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  Why It Causes Landslides
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {featureDetails[selectedFeature].whyItMatters}
                </p>
              </div>
            </div>

            {currentShap && (
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center text-xs font-sans">
                <span className="text-slate-300">
                  Effect on estimated risk at {selectedRegionName}:
                </span>
                <span
                  className={`font-bold font-mono text-xs ${
                    (currentShap.value ?? 0) >= 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {(currentShap.value ?? 0) >= 0 ? '↑ Making Risk Higher' : '↓ Keeping Risk Lower'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Collapsible Level 2: Technical Engineering & Scientific Details */}
      {showTechnicalDetails && (
        <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs">
          <div className="border-b border-slate-800 pb-2">
            <span className="text-[10px] text-orange-400 uppercase font-bold block">
              PEER-REVIEW &amp; ENGINEERING SPECIFICATIONS
            </span>
            <h3 className="text-sm font-bold text-white">Full Technical Architecture</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block">Algorithm</span>
              <span className="font-bold text-white text-xs">XGBoost Classifier</span>
            </div>
            <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block">Validation</span>
              <span className="font-bold text-white text-xs">Spatial GroupKFold</span>
            </div>
            <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block">ROC-AUC (Spatial)</span>
              <span className="font-bold text-emerald-400 text-xs">{safeToFixed(metrics.clean_concurrent_era_roc_auc, 4, '0.7571')}</span>
            </div>
            <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block">Baseline ROC-AUC</span>
              <span className="font-bold text-slate-400 text-xs">{safeToFixed(metrics.terrain_only_baseline_roc_auc, 4, '0.5750')}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-1 text-[11px] text-slate-400 font-sans">
            <strong>Feature Schema:</strong> elevation (SRTM 30m), slope (plane regression gradient), aspect (downslope normal azimuth), rainfall_7d_mm (ERA5 antecedent precipitation), sar_vv (Sentinel-1 RTC C-Band), sar_vh (Sentinel-1 RTC C-Band).
          </div>
        </div>
      )}
    </div>
  );
};
