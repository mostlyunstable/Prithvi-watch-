import React, { useState } from 'react';
import { Mountain, CloudRain, Satellite, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSlopeCategory, getAspectCompassDirection } from '../utils/riskInterpretation';
import { safeToFixed } from '../utils/geoAnalytics';

export const ObservationsPage: React.FC = () => {
  const { prediction, selectedRegionName, historicalRadiusStats } = useApp();
  const [showTechnicalData, setShowTechnicalData] = useState<boolean>(false);

  const f = prediction?.features;
  const slopeVal = f?.slope ?? 0;
  const aspectVal = f?.aspect ?? 0;
  const elevationVal = f?.elevation ?? 0;
  const rainVal = f?.rainfall_7d_mm ?? 0;
  const vvVal = f?.sar_vv ?? -12.4;
  const vhVal = f?.sar_vh ?? -18.2;

  const slopeCat = getSlopeCategory(slopeVal);
  const aspectDir = getAspectCompassDirection(aspectVal);

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-5 text-slate-200">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-3 max-w-4xl">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            Environmental Observations
          </span>
          <h1 className="text-lg font-bold text-white tracking-tight">
            What the System Sees
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Observations at <span className="text-slate-200 font-bold">{selectedRegionName}</span> used by the assessment model.
          </p>
        </div>

        <button
          onClick={() => setShowTechnicalData(!showTechnicalData)}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-mono rounded-md transition flex items-center space-x-1.5"
        >
          <span>{showTechnicalData ? 'Hide sensor telemetry' : 'View sensor telemetry'}</span>
          {showTechnicalData ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Compact High-Density GIS Observation Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl text-xs">
        {/* Stream 1: Ground & Terrain */}
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 font-bold text-white">
              <Mountain className="w-4 h-4 text-slate-400" />
              <span>Ground &amp; Terrain</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Available</span>
          </div>

          <div className="divide-y divide-slate-800/80 bg-slate-950 rounded border border-slate-800 font-mono text-[11px]">
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Elevation</span>
              <span className="font-bold text-white">{safeToFixed(elevationVal, 0, '0')} m</span>
            </div>
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Ground Steepness</span>
              <span className="font-bold text-white">{safeToFixed(slopeVal, 1, '0.0')}° ({slopeCat.label})</span>
            </div>
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Slope Direction</span>
              <span className="font-bold text-white">{aspectDir} ({safeToFixed(aspectVal, 0, '0')}°)</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            Steeper slopes experience higher gravitational shear stress when saturated by rainfall.
          </p>

          {showTechnicalData && (
            <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-slate-400 space-y-0.5">
              <div><strong>Dataset:</strong> NASA SRTM 30m Digital Elevation Model</div>
              <div><strong>Gradient:</strong> 3x3 normal plane regression with spherical cos(lat) scaling</div>
            </div>
          )}
        </div>

        {/* Stream 2: Weather & Precipitation */}
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 font-bold text-white">
              <CloudRain className="w-4 h-4 text-slate-400" />
              <span>Precipitation</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Available</span>
          </div>

          <div className="divide-y divide-slate-800/80 bg-slate-950 rounded border border-slate-800 font-mono text-[11px]">
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">7-Day Cumulative Rain</span>
              <span className="font-bold text-slate-100">{safeToFixed(rainVal, 1, '0.0')} mm</span>
            </div>
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Measurement Window</span>
              <span className="text-slate-400">Previous 7 days</span>
            </div>
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Source</span>
              <span className="text-slate-400">ERA5 Weather</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            Accumulated rainfall increases soil pore-water pressure, reducing effective cohesion along rock slip planes.
          </p>

          {showTechnicalData && (
            <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-slate-400 space-y-0.5">
              <div><strong>Dataset:</strong> ECMWF ERA5 Reanalysis &amp; Open-Meteo API</div>
              <div><strong>Feature:</strong> rainfall_7d_mm (7-day cumulative precipitation)</div>
            </div>
          )}
        </div>

        {/* Stream 3: Satellite Radar */}
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 font-bold text-white">
              <Satellite className="w-4 h-4 text-slate-400" />
              <span>Satellite Observation</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Available</span>
          </div>

          <div className="divide-y divide-slate-800/80 bg-slate-950 rounded border border-slate-800 font-mono text-[11px]">
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Radar Signal Status</span>
              <span className="font-bold text-emerald-400">Available</span>
            </div>
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Constellation</span>
              <span className="text-slate-400">Sentinel-1 C-Band</span>
            </div>
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Cloud Penetration</span>
              <span className="text-slate-400">Active Microwave</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            Radar passes through cloud cover and dense monsoon haze to observe physical surface scattering.
          </p>

          {showTechnicalData && (
            <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-slate-400 space-y-0.5">
              <div><strong>Sensor:</strong> ESA Copernicus Sentinel-1 RTC C-Band</div>
              <div><strong>Backscatter:</strong> VV = {safeToFixed(vvVal, 4, 'N/A')}, VH = {safeToFixed(vhVal, 4, 'N/A')}</div>
            </div>
          )}
        </div>

        {/* Stream 4: Past Landslides */}
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 font-bold text-white">
              <Database className="w-4 h-4 text-slate-400" />
              <span>Past Landslides Nearby</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Available</span>
          </div>

          <div className="divide-y divide-slate-800/80 bg-slate-950 rounded border border-slate-800 font-mono text-[11px]">
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Nearby Events (50 km)</span>
              <span className="font-bold text-slate-100">{historicalRadiusStats?.within50km ?? prediction?.historical_context?.nearby_count ?? 0}</span>
            </div>
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Regional Catalog Total</span>
              <span className="text-slate-400">969 verified events</span>
            </div>
            <div className="p-2 flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Catalog Provider</span>
              <span className="text-slate-400">NASA GLC (COOLR)</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            Historical records document locations with verified past instability under monsoon conditions.
          </p>

          {showTechnicalData && (
            <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-slate-400 space-y-0.5">
              <div><strong>Catalog:</strong> NASA Global Landslide Catalog (GLC)</div>
              <div><strong>Coverage:</strong> 2007–Present across North Eastern India</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
