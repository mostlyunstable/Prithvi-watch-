import React, { useState, useEffect } from 'react';
import type { PredictionResponse } from '../services/api';
import { fetchFabricEnrich, fetchFloodAssessment, type FabricEnrichResponse, type FloodAssessmentResponse } from '../services/api';
import { safeToFixed, formatHistoricalDate, formatPercent } from '../utils/geoAnalytics';

interface RiskIntelligencePanelProps {
  prediction: PredictionResponse | null;
  isLoading: boolean;
  demoMode: boolean;
  activeScenario: string;
  onSelectScenario: (scenario: string) => void;
}

export const RiskIntelligencePanel: React.FC<RiskIntelligencePanelProps> = ({
  prediction,
  isLoading,
  demoMode,
  activeScenario,
  onSelectScenario
}) => {
  const [activeTab, setActiveTab] = useState<'model' | 'fabric'>('model');
  const [fabricData, setFabricData] = useState<FabricEnrichResponse | null>(null);
  const [floodData, setFloodData] = useState<FloodAssessmentResponse | null>(null);
  const [isFabricLoading, setIsFabricLoading] = useState<boolean>(false);

  useEffect(() => {
    if (prediction && prediction.latitude && prediction.longitude) {
      setIsFabricLoading(true);
      Promise.all([
        fetchFabricEnrich(prediction.latitude, prediction.longitude),
        fetchFloodAssessment(prediction.latitude, prediction.longitude)
      ])
        .then(([fab, fld]) => {
          setFabricData(fab);
          setFloodData(fld);
          setIsFabricLoading(false);
        })
        .catch(() => {
          setIsFabricLoading(false);
        });
    } else {
      setFabricData(null);
      setFloodData(null);
    }
  }, [prediction?.latitude, prediction?.longitude]);

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-950/40',
          border: 'border-red-600/80',
          text: 'text-red-400',
          badge: 'bg-red-600 text-white font-bold',
          bar: 'bg-red-500'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-950/40',
          border: 'border-orange-600/80',
          text: 'text-orange-400',
          badge: 'bg-orange-500 text-white font-bold',
          bar: 'bg-orange-500'
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-950/40',
          border: 'border-amber-600/80',
          text: 'text-amber-400',
          badge: 'bg-amber-500 text-slate-950 font-bold',
          bar: 'bg-amber-400'
        };
      default:
        return {
          bg: 'bg-emerald-950/40',
          border: 'border-emerald-600/80',
          text: 'text-emerald-400',
          badge: 'bg-emerald-600 text-white font-bold',
          bar: 'bg-emerald-500'
        };
    }
  };

  const currentTheme = getRiskColor(prediction?.risk_level);

  return (
    <aside className="w-full lg:w-[410px] bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-y-auto text-slate-200">
      {/* Navigation View Mode Tabs */}
      <div className="bg-slate-950 px-3.5 pt-3 pb-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex space-x-1.5 p-0.5 bg-slate-900 rounded-lg border border-slate-800 w-full">
          <button
            onClick={() => setActiveTab('model')}
            className={`flex-1 py-1 text-[11px] font-bold rounded tracking-wide transition ${
              activeTab === 'model'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Assessment
          </button>
          <button
            onClick={() => setActiveTab('fabric')}
            className={`flex-1 py-1 text-[11px] font-bold rounded tracking-wide transition flex items-center justify-center space-x-1 ${
              activeTab === 'fabric'
                ? 'bg-cyan-900/60 text-cyan-200 shadow-sm border border-cyan-700/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Real Data Fabric</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </button>
        </div>
      </div>
      {/* Demonstration Scenario Controller */}
      {demoMode && (
        <div className="bg-amber-950/50 border-b border-amber-700/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Demonstration Mode
            </span>
            <span className="text-[9px] font-mono bg-amber-900/60 text-amber-200 border border-amber-600/60 px-1.5 py-0.5 rounded">
              SIMULATED CONDITIONS
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onSelectScenario('A')}
              className={`py-1 px-2 rounded text-[11px] font-bold border transition ${
                activeScenario === 'A'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              Scenario A<br/><span className="text-[9px] font-normal opacity-90">Normal</span>
            </button>
            <button
              onClick={() => onSelectScenario('B')}
              className={`py-1 px-2 rounded text-[11px] font-bold border transition ${
                activeScenario === 'B'
                  ? 'bg-orange-600 text-white border-orange-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              Scenario B<br/><span className="text-[9px] font-normal opacity-90">Heavy Rain</span>
            </button>
            <button
              onClick={() => onSelectScenario('C')}
              className={`py-1 px-2 rounded text-[11px] font-bold border transition ${
                activeScenario === 'C'
                  ? 'bg-red-600 text-white border-red-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              Scenario C<br/><span className="text-[9px] font-normal opacity-90">Cloudburst</span>
            </button>
          </div>
          <p className="text-[10px] text-amber-300/80 leading-tight italic">
            Simulated environmental forcing — for emergency response protocol verification only.
          </p>
        </div>
      )}

      {/* Main Assessment Body */}
      <div className="p-3.5 space-y-3.5 flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-2.5">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono font-medium text-slate-300">
              QUERYING TERRAIN, WEATHER & SATELLITE...
            </p>
            <p className="text-[11px] text-slate-500">Extracting environmental measurements for location</p>
          </div>
        ) : !prediction ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 space-y-3">
            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">No Location Selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                Click anywhere on the map or select a preset region from the top navigation bar to evaluate risk.
              </p>
            </div>
          </div>
        ) : activeTab === 'model' ? (
          <>
            {/* 1. Target Location & Assessment Header */}
            <div className={`p-3.5 rounded-lg border ${currentTheme.border} ${currentTheme.bg} space-y-2.5`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider block">
                    Monitoring Location
                  </span>
                  <h2 className="text-sm font-bold text-white leading-tight">{prediction.region_name}</h2>
                  <span className="text-[11px] font-mono text-slate-300">
                    {safeToFixed(prediction.latitude, 4)}° N, {safeToFixed(prediction.longitude, 4)}° E
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${currentTheme.badge}`}>
                  {prediction.risk_level}
                </span>
              </div>

              {/* Numerical Assessment Readout */}
              <div className="pt-2 border-t border-slate-700/60 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Assessed Landslide Probability
                  </span>
                  <div className="text-2xl font-black text-white tracking-tight font-mono">
                    {formatPercent(prediction.landslide_probability, 1)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Data Mode
                  </span>
                  <span className="text-[11px] font-mono text-slate-300 font-bold">
                    {prediction.mode === 'REAL DATA' ? 'Live Telemetry' : 'Simulated Scenario'}
                  </span>
                </div>
              </div>

              {/* Risk Level Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${currentTheme.bar} transition-all duration-300`}
                  style={{ width: `${Math.min(100, Math.max(5, (prediction.landslide_probability ?? 0) * 100))}%` }}
                />
              </div>
            </div>

            {/* 2. Early Warning Advisory Box */}
            {(prediction.risk_level === 'HIGH' || prediction.risk_level === 'CRITICAL') && (
              <div className="bg-red-950/60 border border-red-500/80 p-3 rounded-lg text-slate-200 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-red-400 font-bold text-xs uppercase tracking-wider">
                  <span>⚠️ EARLY WARNING ADVISORY</span>
                </div>
                <p className="text-xs text-red-200 leading-snug">
                  Elevated landslide risk detected from steep terrain gradient and antecedent moisture accumulation.
                </p>
                <div className="text-[11px] text-red-300/90 bg-red-900/30 p-2 rounded border border-red-800/40 space-y-1">
                  <div><strong>Recommended Action:</strong> Alert district emergency road clearance teams and monitor active slope cut sections.</div>
                </div>
                <div className="text-[9px] text-red-400/80 italic text-right">
                  Decision-support advisory — Not an official evacuation order.
                </div>
              </div>
            )}

            {/* 3. Environmental Observations Table (Raw Real Measurements) */}
            <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Environmental Observations
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block font-medium">Elevation</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {safeToFixed(prediction.features?.elevation, 0, '0')} m
                  </span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block font-medium">Slope</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {safeToFixed(prediction.features?.slope, 1, '0.0')}°
                  </span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block font-medium">Aspect</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {safeToFixed(prediction.features?.aspect, 0, '0')}°
                  </span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block font-medium">7d Rainfall</span>
                  <span className="text-xs font-mono font-bold text-orange-400">
                    {safeToFixed(prediction.features?.rainfall_7d_mm, 1, '0.0')} mm
                  </span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block font-medium">Sentinel-1 VV</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {safeToFixed(prediction.features?.sar_vv, 3, 'N/A')}
                  </span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase block font-medium">Sentinel-1 VH</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {safeToFixed(prediction.features?.sar_vh, 3, 'N/A')}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Primary Contributing Factors (SHAP Feature Attributions) */}
            <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Primary Contributing Factors
                </span>
                <span className="text-[9px] font-mono text-slate-500">Directional Influence</span>
              </div>

              <div className="space-y-1.5 pt-0.5">
                {prediction.explanation?.map((exp, idx) => {
                  const isPositive = (exp.value ?? 0) >= 0;
                  const absVal = Math.abs(exp.value ?? 0);
                  const barWidth = Math.min(100, Math.max(10, absVal * 25));

                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-300 capitalize text-[11px]">
                          {exp.feature.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-[9px] font-mono font-bold ${
                              isPositive ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {isPositive ? '↑ +risk' : '↓ -risk'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isPositive ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Historical Context (NASA Global Landslide Catalog) */}
            {prediction.historical_context && (
              <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Historical Landslide Evidence (NASA GLC)
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 text-[11px]">
                    Recorded Events (50 km radius):
                  </span>
                  <span className="font-mono font-bold text-orange-400 text-[11px]">
                    {prediction.historical_context.nearby_count} events
                  </span>
                </div>
                {prediction.historical_context.nearest_event && (
                  <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 space-y-0.5 font-mono">
                    <div>
                      <strong>Nearest Event:</strong> {safeToFixed(prediction.historical_context.nearest_event.distance_km, 1, '0.0')} km
                    </div>
                    <div>
                      <strong>Recorded Date:</strong> {formatHistoricalDate(prediction.historical_context.nearest_event.event_date)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. Multi-Horizon Risk Projection */}
            <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Forecast Horizon Assessment
              </span>
              <div className="grid grid-cols-4 gap-1 text-center">
                {Object.entries(prediction.timeline).map(([horizon, level]) => {
                  const theme = getRiskColor(level);
                  return (
                    <div key={horizon} className="p-1.5 bg-slate-900 rounded border border-slate-800">
                      <div className="text-[9px] font-mono text-slate-400">{horizon}</div>
                      <div className={`text-[10px] font-bold mt-0.5 ${theme.text}`}>{level}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7. Data Sources & Sensor Telemetry Status */}
            {prediction.data_quality && (
              <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Data Quality Status
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                  <div className="p-1 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[8px] text-slate-400 uppercase block">SRTM 30m</span>
                    <span className={`text-[9px] font-bold ${prediction.data_quality.dem === 'AVAILABLE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      ● {prediction.data_quality.dem}
                    </span>
                  </div>
                  <div className="p-1 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[8px] text-slate-400 uppercase block">ERA5 Rain</span>
                    <span className={`text-[9px] font-bold ${prediction.data_quality.weather === 'AVAILABLE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      ● {prediction.data_quality.weather}
                    </span>
                  </div>
                  <div className="p-1 bg-slate-900 rounded border border-slate-800">
                    <span className="text-[8px] text-slate-400 uppercase block">Sentinel-1</span>
                    <span className={`text-[9px] font-bold ${prediction.data_quality.satellite === 'AVAILABLE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      ● {prediction.data_quality.satellite}
                    </span>
                  </div>
                </div>
                {prediction.telemetry?.sar_imputed && (
                  <div className="text-[9px] text-amber-400 bg-amber-950/40 p-1.5 rounded border border-amber-800/50 mt-1 font-mono">
                    ⚠️ Sentinel-1 observation unavailable for target grid cell. Using vegetation background median ({prediction.features.sar_vv}) to prevent false critical bias.
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* REAL GEOSPATIAL DATA FABRIC VIEW */
          <div className="space-y-3.5">
            {isFabricLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2.5">
                <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono font-medium text-cyan-300">QUERYING DATA FABRIC...</p>
                <p className="text-[11px] text-slate-500">Hydrology, Land Cover, Multi-Temporal Rain & Sentinel-2</p>
              </div>
            ) : !fabricData ? (
              <div className="text-center py-16 text-slate-400 text-xs font-mono">
                No Data Fabric observations retrieved for this location.
              </div>
            ) : (
              <>
                {/* 1. Fabric Health & Coordinates Header */}
                <div className="p-3 bg-cyan-950/40 border border-cyan-700/60 rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                        Real Data Fabric Node
                      </span>
                      <h3 className="text-xs font-bold text-white leading-tight">
                        {fabricData.infrastructure?.nearest_settlement}, {fabricData.infrastructure?.settlement_state}
                      </h3>
                      <span className="text-[10px] font-mono text-cyan-200">
                        {safeToFixed(fabricData.latitude, 4)}° N, {safeToFixed(fabricData.longitude, 4)}° E
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-900/80 text-cyan-300 border border-cyan-600/60">
                      {fabricData.fabric_health?.completeness_pct}% Data Completeness
                    </span>
                  </div>
                </div>

                {/* Flood Risk Intelligence Card */}
                {floodData && (
                  <div className="p-3.5 bg-blue-950/40 border border-blue-600/70 rounded-lg space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-wider block">
                          Hydrologic & Flood Assessment
                        </span>
                        <div className="text-xs text-slate-300 font-medium leading-tight mt-0.5">
                          {floodData.flood_susceptibility?.nearest_river} ({floodData.flood_susceptibility?.distance_to_river_km} km)
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          floodData.assessment?.risk_level === 'CRITICAL' ? 'bg-red-600 text-white' :
                          floodData.assessment?.risk_level === 'HIGH' ? 'bg-orange-500 text-white' :
                          floodData.assessment?.risk_level === 'MODERATE' ? 'bg-amber-500 text-slate-950' :
                          'bg-emerald-600 text-white'
                        }`}>
                          {floodData.assessment?.risk_level} FLOOD RISK
                        </span>
                        <span className="text-[8px] font-mono text-cyan-300">
                          ● {floodData.data_confidence?.confidence_level}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline pt-1 border-t border-blue-800/50">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Flood Inundation Probability</span>
                      <span className="text-xl font-black text-white font-mono">{formatPercent(floodData.assessment?.flood_probability, 1)}</span>
                    </div>

                    {/* Current Flood Evidence (Sentinel-1 Radar) */}
                    <div className="p-2 bg-slate-900/90 rounded border border-blue-800/40 text-xs space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-cyan-300">Current Radar Evidence:</span>
                        <span className={`font-mono font-bold ${floodData.current_flood_evidence?.detected ? 'text-red-400' : 'text-emerald-400'}`}>
                          {floodData.current_flood_evidence?.evidence_level}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-snug">
                        {floodData.current_flood_evidence?.detection_label}
                      </p>
                    </div>

                    {/* Feature Contributions & Explainability */}
                    <div className="space-y-1 text-[10px]">
                      <span className="text-slate-400 font-bold uppercase tracking-wider block">Key Physical Drivers & Weights:</span>
                      {floodData.feature_contributions?.slice(0, 4).map((fc, idx) => (
                        <div key={idx} className="flex justify-between items-center py-0.5 border-b border-slate-800/80">
                          <span className="text-slate-300">{fc.feature}:</span>
                          <div className="flex items-center space-x-1.5 font-mono">
                            <span className="text-slate-400">{fc.value}</span>
                            <span className="text-cyan-400 font-bold">({fc.contribution_pct}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Topography & Morphology (SRTM 30m) */}
                <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Terrain & Morphology (SRTM 30m)
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400">● {fabricData.topography?.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 block uppercase">Elevation</span>
                      <span className="text-xs font-mono font-bold text-slate-200">{fabricData.topography?.elevation} m</span>
                    </div>
                    <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 block uppercase">Slope Gradient</span>
                      <span className="text-xs font-mono font-bold text-slate-200">{fabricData.topography?.slope}°</span>
                    </div>
                    <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 block uppercase">Aspect</span>
                      <span className="text-xs font-mono font-bold text-slate-200">{fabricData.topography?.aspect}°</span>
                    </div>
                    <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 block uppercase">Ruggedness (TRI)</span>
                      <span className="text-xs font-mono font-bold text-amber-400">{fabricData.topography?.tri} m</span>
                    </div>
                    <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 block uppercase">Local Relief (5x5)</span>
                      <span className="text-xs font-mono font-bold text-amber-400">{fabricData.topography?.relief_5x5} m</span>
                    </div>
                    <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 block uppercase">Plan Curvature</span>
                      <span className="text-xs font-mono font-bold text-cyan-400">{fabricData.topography?.plan_curvature}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Hydrology & River Systems (HydroSHEDS) */}
                <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Hydrology & Drainage (HydroSHEDS)
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400">● {fabricData.hydrology?.status}</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nearest Major River:</span>
                      <span className="font-bold text-cyan-300">{fabricData.hydrology?.nearest_river}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Distance to River Channel:</span>
                      <span className="font-mono font-bold text-slate-200">{fabricData.hydrology?.distance_km} km ({fabricData.hydrology?.distance_m} m)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hydrologic Basin:</span>
                      <span className="font-bold text-slate-300">{fabricData.hydrology?.basin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mean Annual Discharge:</span>
                      <span className="font-mono text-cyan-400">{fabricData.hydrology?.mean_discharge_m3s} m³/s</span>
                    </div>
                  </div>
                </div>

                {/* 4. Multi-Temporal Precipitation & Anomaly (ERA5 / ECMWF) */}
                <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Precipitation Regime (ERA5 / ECMWF)
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400">● {fabricData.precipitation?.status}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div className="p-1 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 block">1h Rain</span>
                      <span className="text-xs font-mono font-bold text-orange-400">{fabricData.precipitation?.rainfall_1h_mm} mm</span>
                    </div>
                    <div className="p-1 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 block">6h Rain</span>
                      <span className="text-xs font-mono font-bold text-orange-400">{fabricData.precipitation?.rainfall_6h_mm} mm</span>
                    </div>
                    <div className="p-1 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 block">24h Rain</span>
                      <span className="text-xs font-mono font-bold text-orange-400">{fabricData.precipitation?.rainfall_24h_mm} mm</span>
                    </div>
                    <div className="p-1 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[8px] text-slate-400 block">7d Rain</span>
                      <span className="text-xs font-mono font-bold text-orange-400">{fabricData.precipitation?.rainfall_7d_mm} mm</span>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">30-Day Total & Climatological Anomaly:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {fabricData.precipitation?.rainfall_30d_mm} mm ({fabricData.precipitation?.rainfall_anomaly_pct > 0 ? '+' : ''}{fabricData.precipitation?.rainfall_anomaly_pct}%)
                    </span>
                  </div>
                </div>

                {/* 5. Satellite Multi-Modal (Sentinel-1 SAR & Sentinel-2 Optical) */}
                <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Copernicus Satellite Multi-Modal
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-cyan-300">Sentinel-1 SAR</span>
                        <span className="text-[8px] font-mono text-emerald-400">● {fabricData.satellite_sar?.status}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>VV Backscatter:</span>
                        <span className="font-mono text-slate-200 font-bold">{fabricData.satellite_sar?.sar_vv}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>VH Backscatter:</span>
                        <span className="font-mono text-slate-200 font-bold">{fabricData.satellite_sar?.sar_vh}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>VV/VH Ratio:</span>
                        <span className="font-mono text-cyan-400 font-bold">{fabricData.satellite_sar?.sar_ratio}</span>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-emerald-300">Sentinel-2 Optical</span>
                        <span className="text-[8px] font-mono text-emerald-400">● {fabricData.satellite_optical?.status}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>NDVI Index:</span>
                        <span className="font-mono text-emerald-400 font-bold">{fabricData.satellite_optical?.ndvi}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Vegetation:</span>
                        <span className="text-[10px] font-bold text-slate-200">{fabricData.satellite_optical?.vegetation_health}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Cloud Cover:</span>
                        <span className="font-mono text-slate-300">{fabricData.satellite_optical?.cloud_cover_pct}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Land Cover & Infrastructure Exposure */}
                <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Surface Classification & Exposure
                  </span>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ESA WorldCover 10m Class:</span>
                      <span className="font-bold text-emerald-400">{fabricData.land_cover?.class_label} (Code {fabricData.land_cover?.class_code})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nearest National Highway:</span>
                      <span className="font-bold text-amber-300">{fabricData.infrastructure?.nearest_highway}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Distance to Transport Corridor:</span>
                      <span className="font-mono font-bold text-slate-200">{fabricData.infrastructure?.distance_to_highway_km} km</span>
                    </div>
                  </div>
                </div>

                {/* 7. Historical Hazards (Landslides & Floods) */}
                <div className="bg-slate-850 p-3 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Historical Disaster Hazards
                  </span>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">NASA GLC Landslides (&le;25 km):</span>
                      <span className="font-mono font-bold text-orange-400">{fabricData.historical_hazards?.nearest_landslide?.events_within_25km} recorded events</span>
                    </div>
                    {fabricData.historical_hazards?.nearest_flood?.location && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nearest CWC/ASDMA Flood Reach:</span>
                        <span className="font-bold text-cyan-300">
                          {fabricData.historical_hazards?.nearest_flood?.location} ({fabricData.historical_hazards?.nearest_flood?.distance_km} km)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

