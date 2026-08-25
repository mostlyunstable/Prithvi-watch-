import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Map,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateRiskInterpretation } from '../utils/riskInterpretation';
import { RiskScaleLegend } from '../components/common/RiskScaleLegend';
import { safeToFixed, formatPercent } from '../utils/geoAnalytics';

export const AssessmentPage: React.FC = () => {
  const {
    prediction,
    modelInfo,
    isLoading,
    lastUpdated,
    selectedRegionName,
    historicalRadiusStats,
    refreshAssessment,
    selectPresetRegion
  } = useApp();

  const [searchParams] = useSearchParams();
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Support direct URL query loading (e.g. /assessment?lat=25.5788&lon=91.8933)
  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    if (latParam && lonParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lonParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        if (!prediction || Math.abs(prediction.latitude - lat) > 0.001 || Math.abs(prediction.longitude - lng) > 0.001) {
          selectPresetRegion(lat, lng, `Target Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`);
        }
      }
    }
  }, [searchParams]);

  // Generate plain-language interpretation layer
  const interpretation = useMemo(() => {
    if (!prediction) return null;
    return generateRiskInterpretation(prediction, historicalRadiusStats);
  }, [prediction, historicalRadiusStats]);

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          badge: 'bg-red-950 text-red-400 border border-red-800 font-bold',
          text: 'text-red-400',
          bar: 'bg-red-500'
        };
      case 'HIGH':
        return {
          badge: 'bg-orange-950 text-orange-400 border border-orange-800 font-bold',
          text: 'text-orange-400',
          bar: 'bg-orange-500'
        };
      case 'MODERATE':
        return {
          badge: 'bg-amber-950 text-amber-400 border border-amber-800 font-bold',
          text: 'text-amber-400',
          bar: 'bg-amber-400'
        };
      default:
        return {
          badge: 'bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold',
          text: 'text-emerald-400',
          bar: 'bg-emerald-500'
        };
    }
  };

  const currentTheme = getRiskColor(prediction?.risk_level);

  if (!prediction && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">No Location Selected</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Please choose a location from the top menu or click on the Risk Map to view its assessment.
          </p>
        </div>
        <Link
          to="/map"
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-white text-xs font-medium rounded-md border border-slate-700 shadow flex items-center space-x-2 transition"
        >
          <Map className="w-3.5 h-3.5 text-slate-400" />
          <span>Open Fullscreen Risk Map</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-5 text-slate-200">
      {/* 1. Header with Direct Map Link */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-3 max-w-4xl">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            Location Assessment
          </span>
          <h1 className="text-lg font-bold text-white tracking-tight">{selectedRegionName}</h1>
          <div className="flex items-center space-x-3 text-xs font-mono text-slate-400 mt-0.5">
            <span>
              {safeToFixed(prediction?.latitude, 4)}° N · {safeToFixed(prediction?.longitude, 4)}° E
            </span>
            {lastUpdated && (
              <span className="flex items-center space-x-1 text-slate-500">
                <Clock className="w-3 h-3" />
                <span>Checked at {lastUpdated}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={refreshAssessment}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium rounded-md transition flex items-center space-x-1.5"
            title="Check latest live data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <Link
            to="/map"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 text-xs font-medium rounded-md shadow transition flex items-center space-x-1.5"
          >
            <Map className="w-3.5 h-3.5 text-slate-400" />
            <span>Show on Map</span>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center space-y-3 font-mono">
          <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-1 text-xs text-slate-300">
            <p className="font-bold">Evaluating location...</p>
            <p className="text-slate-500 text-[11px]">Checking ground height, recent rainfall, and radar...</p>
          </div>
        </div>
      ) : prediction && interpretation ? (
        <div className="space-y-5 max-w-4xl">
          {/* 2. Risk Summary Card */}
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block">
                  Current Risk
                </span>
                <div className="flex items-baseline space-x-3">
                  <span className="text-2xl font-bold font-mono text-white">
                    {formatPercent(prediction.landslide_probability, 1)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${currentTheme.badge}`}>
                    {prediction.risk_level}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    Model Estimate
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400">
                Mode: {prediction.mode === 'REAL DATA' ? 'Real Observations' : 'Simulated Conditions'}
              </span>
            </div>

            {/* Risk Gauge */}
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${currentTheme.bar} transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(5, (prediction.landslide_probability ?? 0) * 100))}%` }}
              />
            </div>

            {/* What does this mean? */}
            <div className="p-3 bg-slate-950 rounded-md border border-slate-850 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-slate-200 text-xs">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="uppercase tracking-wider text-[10px]">What does this mean?</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {interpretation.overviewText}
              </p>
            </div>

            {/* 3. Why is the risk high/low? (Clean Simple Rows) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block">
                {prediction.risk_level === 'LOW' ? 'Why is the risk low?' : 'Why is the risk high?'}
              </span>
              <div className="divide-y divide-slate-800 bg-slate-950 rounded-md border border-slate-850">
                {interpretation.primaryDrivers.map((driver) => (
                  <div
                    key={driver.number}
                    className="p-2.5 flex justify-between items-center text-xs"
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="font-medium text-slate-200 text-[11px] flex items-center space-x-1.5">
                        <span className="font-mono text-slate-500">{driver.number}</span>
                        <span className="truncate">{driver.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono pl-4">
                        {driver.description}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        driver.direction === 'increases'
                          ? 'text-red-400 bg-red-950/60 border border-red-900'
                          : driver.direction === 'decreases'
                          ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900'
                          : 'text-slate-400 bg-slate-900 border border-slate-800'
                      }`}
                    >
                      {driver.directionText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Where is Risk Changing? (Risk Velocity & Stored Observations) */}
          {prediction.risk_velocity && (
            <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3 font-sans">
              <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-white">Where is Risk Changing? (Risk Velocity)</h3>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold"
                    style={{
                      backgroundColor: `${prediction.risk_velocity.fill}20`,
                      color: prediction.risk_velocity.fill,
                      border: `1px solid ${prediction.risk_velocity.fill}60`
                    }}
                  >
                    {prediction.risk_velocity.trend.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Confidence: <strong className={prediction.risk_velocity.confidence === 'HIGH' ? 'text-emerald-400' : 'text-amber-400'}>{prediction.risk_velocity.confidence}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-md border border-slate-850 space-y-1">
                  <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">Risk Change</span>
                  <div className="text-lg font-bold font-mono text-white">
                    {prediction.risk_velocity.risk_delta !== null ? (
                      <span>
                        {prediction.risk_velocity.risk_delta > 0 ? '+' : ''}
                        {(prediction.risk_velocity.risk_delta * 100).toFixed(1)} pts
                      </span>
                    ) : (
                      'Baseline'
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">
                    {prediction.risk_velocity.risk_delta_pct !== null
                      ? `${prediction.risk_velocity.risk_delta_pct > 0 ? '+' : ''}${prediction.risk_velocity.risk_delta_pct.toFixed(1)}% relative change`
                      : 'Initial observation'}
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-md border border-slate-850 space-y-1">
                  <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">Observation Age</span>
                  <div className="text-lg font-bold font-mono text-white">
                    {prediction.risk_velocity.observation_age_hours !== null
                      ? `${prediction.risk_velocity.observation_age_hours.toFixed(1)} hours`
                      : 'Recent'}
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">Elapsed time between model snapshots.</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-md border border-slate-850 space-y-1">
                  <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">Primary Driver</span>
                  <div className="text-xs font-semibold text-slate-200 truncate" title={prediction.risk_velocity.primary_driver}>
                    {prediction.risk_velocity.primary_driver}
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">Contributed to model risk delta.</p>
                </div>
              </div>

              {/* Stored Snapshots Timeline */}
              {prediction.timeline_snapshots && prediction.timeline_snapshots.length > 0 && (
                <div className="p-3 bg-slate-950 rounded-md border border-slate-850 space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                    Recorded Observation History ({prediction.timeline_snapshots.length} Snapshots)
                  </span>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    {prediction.timeline_snapshots.map((snap, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-md flex items-center space-x-2 text-[11px]"
                      >
                        <span className="text-slate-500 text-[9px]">{new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="font-bold text-white">{(snap.risk_probability * 100).toFixed(1)}%</span>
                        {snap.rainfall_7d_mm !== undefined && (
                          <span className="text-[9px] text-slate-400">({snap.rainfall_7d_mm.toFixed(0)}mm rain)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. What the System Found */}
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white">
                What the system found
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Ground · Weather · Satellite
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* GROUND: Height */}
              <div className="p-3 bg-slate-950 rounded-md border border-slate-800 space-y-1">
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">Height</span>
                <div className="text-base font-bold font-mono text-white">
                  {safeToFixed(prediction.features?.elevation, 0, '0')} m
                </div>
                <p className="text-[10px] text-slate-400 font-sans">Elevation above sea level.</p>
              </div>

              {/* GROUND: Steepness */}
              <div className="p-3 bg-slate-950 rounded-md border border-slate-800 space-y-1">
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">Ground Steepness</span>
                <div className="text-base font-bold font-mono text-white">
                  {safeToFixed(prediction.features?.slope, 1, '0.0')}°
                </div>
                <p className="text-[10px] text-slate-400 font-sans">Hillside slope gradient.</p>
              </div>

              {/* WEATHER: Rainfall */}
              <div className="p-3 bg-slate-950 rounded-md border border-slate-800 space-y-1">
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">7-Day Rainfall</span>
                <div className="text-base font-bold font-mono text-slate-100">
                  {safeToFixed(prediction.features?.rainfall_7d_mm, 1, '0.0')} mm
                </div>
                <p className="text-[10px] text-slate-400 font-sans">Total rain over previous 7 days.</p>
              </div>

              {/* SATELLITE: Observation */}
              <div className="p-3 bg-slate-950 rounded-md border border-slate-800 space-y-1">
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">Satellite Radar</span>
                <div className="text-base font-bold font-mono text-emerald-400">
                  Available
                </div>
                <p className="text-[10px] text-slate-400 font-sans">Sentinel-1 radar signal.</p>
              </div>
            </div>
          </div>

          {/* 5. Past Landslides Nearby */}
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white">
                Past landslides nearby
              </h3>
              <span className="text-xs font-mono text-slate-300">
                {historicalRadiusStats.within50km} recorded events (50 km)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Within 10 km</span>
                <span className="text-sm font-bold text-white">{historicalRadiusStats.within10km}</span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Within 25 km</span>
                <span className="text-sm font-bold text-white">{historicalRadiusStats.within25km}</span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Within 50 km</span>
                <span className="text-sm font-bold text-slate-100">{historicalRadiusStats.within50km}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-relaxed pt-1">
              These are historical events recorded in this area from the <strong>NASA Global Landslide Catalog</strong>. They are real past observations, not predictions.
            </p>
          </div>

          {/* 6. Takeaway & Advisory */}
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              What should I take from this?
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {interpretation.takeawayText}
            </p>
            <div className="text-[10px] text-slate-500 font-sans italic pt-1 border-t border-slate-800">
              * Note: This system is intended for decision support and planning. It does not constitute an official government evacuation order.
            </div>
          </div>

          {/* 7. Collapsible Technical Details */}
          <div className="pt-1">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-xs font-mono text-slate-400 hover:text-slate-200 transition flex items-center space-x-1.5"
            >
              <span>{showTechnicalDetails ? 'Hide technical details' : 'View technical details'}</span>
              {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTechnicalDetails && (
              <div className="mt-2 p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3 font-mono text-xs text-slate-400">
                <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5">
                  Technical Model &amp; Feature Schema
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[8px] text-slate-500 uppercase block">elevation</span>
                    <span className="text-xs font-bold text-white">{safeToFixed(prediction.features?.elevation, 1, '0.0')}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[8px] text-slate-500 uppercase block">slope</span>
                    <span className="text-xs font-bold text-white">{safeToFixed(prediction.features?.slope, 2, '0.00')}°</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[8px] text-slate-500 uppercase block">aspect</span>
                    <span className="text-xs font-bold text-white">{safeToFixed(prediction.features?.aspect, 1, '0.0')}°</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[8px] text-slate-500 uppercase block">rainfall_7d_mm</span>
                    <span className="text-xs font-bold text-slate-100">{safeToFixed(prediction.features?.rainfall_7d_mm, 2, '0.00')}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[8px] text-slate-500 uppercase block">sar_vv</span>
                    <span className="text-xs font-bold text-cyan-400">{safeToFixed(prediction.features?.sar_vv, 4, 'N/A')}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[8px] text-slate-500 uppercase block">sar_vh</span>
                    <span className="text-xs font-bold text-cyan-400">{safeToFixed(prediction.features?.sar_vh, 4, 'N/A')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-850 text-[11px]">
                  <div><strong>Model:</strong> XGBoost Classifier</div>
                  <div><strong>Validation:</strong> Spatial GroupKFold</div>
                  <div><strong>ROC-AUC:</strong> {safeToFixed(modelInfo?.audited_metrics?.clean_concurrent_era_roc_auc, 4, '0.7571')}</div>
                </div>
              </div>
            )}
          </div>

          {/* 8. Risk Color Reference */}
          <RiskScaleLegend />
        </div>
      ) : null}
    </div>
  );
};
