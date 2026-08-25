import React from 'react';
import type { PredictionResponse } from '../services/api';
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
        ) : (
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
        )}
      </div>
    </aside>
  );
};
