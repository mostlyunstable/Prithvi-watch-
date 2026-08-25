import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Flame,
  ChevronRight,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';
import { Map } from '../components/Map';
import { useApp } from '../context/AppContext';
import { generateRiskInterpretation } from '../utils/riskInterpretation';
import { safeToFixed, formatPercent } from '../utils/geoAnalytics';
import { LiveOperationsPanel } from '../components/LiveOperationsPanel';

export const RiskMapPage: React.FC = () => {
  const {
    handleMapClickPrediction,
    selectPresetRegion,
    activeScenario,
    demoMode,
    selectedCoords,
    selectedRegionName,
    prediction,
    riskGridAnalytics,
    historicalRadiusStats
  } = useApp();

  const [isHotspotsOpen, setIsHotspotsOpen] = useState<boolean>(false);
  const [isOperationsOpen, setIsOperationsOpen] = useState<boolean>(false);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const strategicLocations = [
    { name: 'Shillong (Meghalaya Plateau)', lat: 25.5788, lng: 91.8933 },
    { name: 'Cherrapunji (Heavy Rain Corridor)', lat: 25.2700, lng: 91.7300 },
    { name: 'Guwahati (Brahmaputra Valley)', lat: 26.1445, lng: 91.7362 },
    { name: 'Gangtok (Sikkim High Relief)', lat: 27.3389, lng: 88.6065 },
    { name: 'Mangan (North Sikkim Steep Valley)', lat: 27.5050, lng: 88.5300 },
    { name: 'Itanagar (Arunachal Foothills)', lat: 27.0844, lng: 93.6053 },
    { name: 'Tawang (Eastern Himalayas)', lat: 27.5860, lng: 91.8650 },
    { name: 'Aizawl (Mizoram Steep Ridges)', lat: 23.7271, lng: 92.7176 },
    { name: 'Kohima (Nagaland Hills)', lat: 25.6751, lng: 94.1086 },
    { name: 'Imphal (Manipur Basin)', lat: 24.8170, lng: 93.9368 },
    { name: 'Agartala (Tripura Lowland)', lat: 23.8315, lng: 91.2868 },
  ];

  const filteredLocations = strategicLocations.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-950/80 border border-red-800 font-bold';
      case 'HIGH':
        return 'text-orange-400 bg-orange-950/80 border border-orange-800 font-bold';
      case 'MODERATE':
        return 'text-amber-400 bg-amber-950/80 border border-amber-800 font-bold';
      default:
        return 'text-emerald-400 bg-emerald-950/80 border border-emerald-800 font-bold';
    }
  };

  const interpretation = prediction
    ? generateRiskInterpretation(prediction, historicalRadiusStats)
    : null;

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col min-h-0 min-w-0">
      {/* 1. FULL-BLEED MAP WORKSPACE (100% Canvas) */}
      <Map
        onPredictionResult={(result, lat, lng) => {
          handleMapClickPrediction(lat, lng, result);
          setIsPanelOpen(true);
        }}
        activeScenario={activeScenario}
        demoMode={demoMode}
        selectedCoords={selectedCoords}
      />

      {/* 2. TOP-LEFT: SEARCH LOCATION TOOLBAR */}
      <div className="absolute top-4 left-64 z-20 max-w-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 sm:w-60 bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-800 rounded-md pl-7 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-600 shadow-xl font-medium"
          />
        </div>

        {searchQuery && (
          <div className="mt-1 bg-slate-900 border border-slate-800 rounded-md shadow-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-800 text-xs">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc, i) => (
                <div
                  key={i}
                  onClick={() => {
                    selectPresetRegion(loc.lat, loc.lng, loc.name);
                    setSearchQuery('');
                    setIsPanelOpen(true);
                  }}
                  className="p-2 hover:bg-slate-800 cursor-pointer text-slate-200 flex justify-between items-center transition"
                >
                  <span className="truncate">{loc.name}</span>
                  <ChevronRight className="w-3 h-3 text-slate-500" />
                </div>
              ))
            ) : (
              <div className="p-2 text-slate-500 text-[11px]">No matching locations.</div>
            )}
          </div>
        )}
      </div>

      {/* 3. TOP-RIGHT: TOP RISK AREAS & LIVE OPERATIONS TOOLBAR */}
      <div className="absolute top-4 right-48 z-20 flex items-center space-x-2">
        <button
          onClick={() => setIsOperationsOpen(!isOperationsOpen)}
          className={`backdrop-blur-md border px-2.5 py-1.5 rounded-md shadow-xl text-xs font-medium flex items-center space-x-1.5 transition ${
            isOperationsOpen
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800 font-bold'
              : 'bg-slate-900/90 hover:bg-slate-850 text-slate-200 border-slate-800'
          }`}
          title="Toggle live operations & telemetry drawer"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Live Operations</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setIsHotspotsOpen(!isHotspotsOpen)}
            className="bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-md shadow-xl text-xs font-medium flex items-center space-x-1.5 transition"
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Top Risk Areas</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isHotspotsOpen && riskGridAnalytics && (
            <div className="absolute right-0 mt-1 w-64 bg-slate-900 border border-slate-800 rounded-md shadow-2xl p-2.5 z-30 space-y-1.5 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400">
                  Highest Risk Hotspots
                </span>
                <span className="text-[9px] text-slate-500">Click to Inspect</span>
              </div>

              <div className="divide-y divide-slate-800/80 max-h-40 overflow-y-auto">
                {riskGridAnalytics.topHotspots.slice(0, 4).map((hotspot, idx) => (
                  <div
                    key={hotspot.id}
                    onClick={() => {
                      selectPresetRegion(
                        hotspot.lat,
                        hotspot.lng,
                        `High-Risk Hotspot #${idx + 1} (${safeToFixed(hotspot.lat, 3)}° N, ${safeToFixed(hotspot.lng, 3)}° E)`
                      );
                      setIsHotspotsOpen(false);
                      setIsPanelOpen(true);
                    }}
                    className="p-1.5 hover:bg-slate-850 cursor-pointer flex justify-between items-center transition text-[11px] font-mono"
                  >
                    <span className="text-slate-300">
                      {safeToFixed(hotspot.lat, 3)}° N, {safeToFixed(hotspot.lng, 3)}° E
                    </span>
                    <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${getRiskBadge(hotspot.riskLevel)}`}>
                      {formatPercent(hotspot.probability, 1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING LIVE OPERATIONS DRAWER */}
      {isOperationsOpen && (
        <div className="absolute top-14 left-4 z-20 w-80 sm:w-96 max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
          <LiveOperationsPanel />
        </div>
      )}

      {/* 4. COMPACT FLOATING LOCATION ASSESSMENT PANEL (Top-Right Overlay) */}
      {isPanelOpen && prediction && interpretation && (
        <div className="absolute top-14 right-2 sm:right-4 z-20 w-80 sm:w-[340px] max-w-[calc(100vw-1rem)] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg shadow-2xl p-3.5 space-y-3 text-xs text-slate-200 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-2">
            <div>
              <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                Selected Location
              </span>
              <h3 className="text-sm font-bold text-white truncate max-w-[240px]" title={selectedRegionName}>
                {selectedRegionName}
              </h3>
              <div className="text-[10px] font-mono text-slate-400">
                {safeToFixed(prediction.latitude, 4)}° N · {safeToFixed(prediction.longitude, 4)}° E
              </div>
            </div>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Risk Level Badge & Value */}
          <div className="p-2.5 bg-slate-950 rounded-md border border-slate-800 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                Estimated Risk
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${getRiskBadge(prediction.risk_level)}`}>
                {prediction.risk_level}
              </span>
            </div>

            <div className="flex items-baseline space-x-2 font-mono">
              <span className="text-2xl font-bold text-white">
                {formatPercent(prediction.landslide_probability, 1)}
              </span>
              <span className="text-[10px] text-slate-400 uppercase">Model Estimate</span>
            </div>

            <p className="text-[11px] text-slate-300 font-sans leading-relaxed pt-1">
              {interpretation.overviewText}
            </p>
          </div>

          {/* Risk Change & Velocity Section */}
          {prediction.risk_velocity && (
            <div className="p-2.5 bg-slate-950 rounded-md border border-slate-800 space-y-1.5 font-sans">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                  Risk Velocity (6h Delta)
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold"
                  style={{
                    backgroundColor: `${prediction.risk_velocity.fill}20`,
                    color: prediction.risk_velocity.fill,
                    border: `1px solid ${prediction.risk_velocity.fill}60`
                  }}
                >
                  {prediction.risk_velocity.trend.replace('_', ' ')}
                </span>
              </div>

              <div className="text-[11px] font-mono text-slate-200">
                {prediction.risk_velocity.risk_delta !== null ? (
                  <span>
                    Change:{' '}
                    <strong className="text-white">
                      {prediction.risk_velocity.risk_delta > 0 ? '+' : ''}
                      {(prediction.risk_velocity.risk_delta * 100).toFixed(1)} percentage pts
                    </strong>{' '}
                    over {prediction.risk_velocity.observation_age_hours ?? 6}h
                  </span>
                ) : (
                  <span className="text-slate-400">Baseline established · Awaiting second observation</span>
                )}
              </div>

              <div className="text-[10px] text-slate-400 leading-snug">
                <span className="text-slate-500 font-mono">Driver:</span> {prediction.risk_velocity.primary_driver}
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-850 text-[9px] font-mono text-slate-500">
                <span>Confidence: <strong className={prediction.risk_velocity.confidence === 'HIGH' ? 'text-emerald-400' : 'text-amber-400'}>{prediction.risk_velocity.confidence}</strong></span>
                {prediction.timeline_snapshots && prediction.timeline_snapshots.length > 1 && (
                  <span className="text-slate-400">{prediction.timeline_snapshots.length} observations</span>
                )}
              </div>
            </div>
          )}

          {/* Why is the risk high/low? (Top 3 Model Drivers) */}
          <div className="space-y-1">
            <span className="text-[9px] font-mono uppercase font-bold text-slate-400 tracking-wider block">
              Why is the risk {prediction.risk_level.toLowerCase()}?
            </span>
            <div className="divide-y divide-slate-800 bg-slate-950 rounded-md border border-slate-800">
              {interpretation.primaryDrivers.map((driver) => (
                <div
                  key={driver.number}
                  className="p-2 flex justify-between items-center text-[11px]"
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <div className="font-medium text-slate-200 flex items-center space-x-1.5">
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

          {/* Small Evidence Summary */}
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
            <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
              <span className="text-[8px] text-slate-500 uppercase block">Elevation</span>
              <span className="font-bold text-white">{safeToFixed(prediction.features?.elevation, 0, '0')} m</span>
            </div>
            <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
              <span className="text-[8px] text-slate-500 uppercase block">Steepness</span>
              <span className="font-bold text-white">{safeToFixed(prediction.features?.slope, 1, '0.0')}°</span>
            </div>
            <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
              <span className="text-[8px] text-slate-500 uppercase block">7-Day Rain</span>
              <span className="font-bold text-slate-100">{safeToFixed(prediction.features?.rainfall_7d_mm, 1, '0.0')} mm</span>
            </div>
            <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
              <span className="text-[8px] text-slate-500 uppercase block">Past Events</span>
              <span className="font-bold text-slate-100">{historicalRadiusStats.within50km} (50km)</span>
            </div>
          </div>

          {/* Action Links */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <Link
              to="/assessment"
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-white font-medium rounded-md text-xs border border-slate-700 shadow flex items-center justify-center space-x-1.5 transition"
            >
              <span>Full Location Assessment</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </Link>

            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="w-full py-1 text-slate-400 hover:text-slate-200 text-[10px] font-mono transition flex items-center justify-center space-x-1"
            >
              <span>{showTechnicalDetails ? 'Hide technical values' : 'View technical values'}</span>
              {showTechnicalDetails ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>

            {showTechnicalDetails && (
              <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono text-slate-400 space-y-1">
                <div><strong>Model:</strong> XGBoost (ROC-AUC 0.7571)</div>
                <div><strong>Sentinel-1 VV:</strong> {safeToFixed(prediction.features?.sar_vv, 4, 'N/A')}</div>
                <div><strong>Sentinel-1 VH:</strong> {safeToFixed(prediction.features?.sar_vh, 4, 'N/A')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Re-open Button (if panel was closed) */}
      {!isPanelOpen && prediction && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="absolute bottom-5 right-5 z-20 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-800 text-slate-200 px-3 py-1.5 rounded-md shadow-2xl text-xs font-medium flex items-center space-x-1.5 transition"
        >
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>{selectedRegionName} ({prediction.risk_level})</span>
        </button>
      )}
    </div>
  );
};
