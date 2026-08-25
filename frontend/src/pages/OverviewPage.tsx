import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Map } from '../components/Map';
import { useApp } from '../context/AppContext';
import { generateRiskInterpretation } from '../utils/riskInterpretation';
import { safeToFixed, formatPercent } from '../utils/geoAnalytics';

export const OverviewPage: React.FC = () => {
  const {
    selectedCoords,
    selectedRegionName,
    prediction,
    activeScenario,
    demoMode,
    handleMapClickPrediction,
    riskGridAnalytics,
    riskGridLoading,
    historicalLandslides,
    historicalRadiusStats
  } = useApp();

  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

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

  const totalHistorical = historicalLandslides?.features?.length ?? 969;
  const highAreasCount = riskGridAnalytics?.highCount ?? 0;
  const critAreasCount = riskGridAnalytics?.critCount ?? 0;

  const interpretation = prediction
    ? generateRiskInterpretation(prediction, historicalRadiusStats)
    : null;

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col min-h-0 min-w-0">
      {/* 1. FULL-BLEED REGIONAL MAP WORKSPACE (100% Canvas) */}
      <Map
        onPredictionResult={(result, lat, lng) => {
          handleMapClickPrediction(lat, lng, result);
          setIsPanelOpen(true);
        }}
        activeScenario={activeScenario}
        demoMode={demoMode}
        selectedCoords={selectedCoords}
      />

      {/* 2. FLOATING REGIONAL SUMMARY STRIP (Top Left / Center) */}
      <div className="absolute top-4 left-60 z-20 hidden md:flex items-center space-x-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3.5 py-1.5 rounded-md shadow-2xl text-xs font-mono text-slate-200">
        <div className="flex items-center space-x-1.5 pr-2 border-r border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-white text-[11px] font-sans">NER REGIONAL MONITOR</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <div>
            <span className="text-slate-400 mr-1">Past Events:</span>
            <span className="font-bold text-white">{totalHistorical}</span>
          </div>
          <div>
            <span className="text-slate-400 mr-1">High-Risk:</span>
            <span className="font-bold text-orange-400">
              {riskGridLoading ? '...' : highAreasCount}
            </span>
          </div>
          <div>
            <span className="text-slate-400 mr-1">Critical:</span>
            <span className="font-bold text-red-400">
              {riskGridLoading ? '...' : critAreasCount}
            </span>
          </div>
        </div>
      </div>

      {/* 3. COMPACT FLOATING LOCATION ASSESSMENT PANEL (Top-Right Overlay) */}
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
          className="absolute bottom-5 right-5 z-20 bg-slate-900/90 hover:bg-slate-850 backdrop-blur-md border border-slate-800 text-slate-200 px-3 py-1.5 rounded-md shadow-2xl text-xs font-medium flex items-center space-x-1.5 transition"
        >
          <MapPin className="w-3.5 h-3.5 text-red-400" />
          <span>{selectedRegionName} ({prediction.risk_level})</span>
        </button>
      )}
    </div>
  );
};
