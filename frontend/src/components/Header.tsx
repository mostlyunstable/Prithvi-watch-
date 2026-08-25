import React, { useEffect, useState } from 'react';
import type { ModelInfoResponse } from '../services/api';
import { safeToFixed } from '../utils/geoAnalytics';

interface HeaderProps {
  backendStatus: 'checking' | 'ok' | 'error';
  demoMode: boolean;
  onToggleDemoMode: () => void;
  onSelectPresetRegion: (lat: number, lng: number, name: string) => void;
  onOpenArchitectureModal: () => void;
  onOpenModelModal: () => void;
  modelInfo: ModelInfoResponse | null;
  selectedCoords: { lat: number; lng: number } | null;
}

export const Header: React.FC<HeaderProps> = ({
  backendStatus,
  demoMode,
  onToggleDemoMode,
  onSelectPresetRegion,
  onOpenArchitectureModal,
  onOpenModelModal,
  modelInfo,
  selectedCoords
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const presetRegions = [
    { name: 'Shillong (Meghalaya Plateau)', lat: 25.5788, lng: 91.8933 },
    { name: 'Cherrapunji (High Monsoon Corridor)', lat: 25.2700, lng: 91.7300 },
    { name: 'Guwahati (Brahmaputra Valley)', lat: 26.1445, lng: 91.7362 },
    { name: 'Gangtok (Sikkim High Relief)', lat: 27.3389, lng: 88.6065 },
    { name: 'Mangan (North Sikkim Vulnerable Zone)', lat: 27.5050, lng: 88.5300 },
    { name: 'Itanagar (Arunachal Foothills)', lat: 27.0844, lng: 93.6053 },
    { name: 'Tawang (Eastern Himalayas)', lat: 27.5860, lng: 91.8650 },
    { name: 'Aizawl (Mizoram Steep Ridges)', lat: 23.7271, lng: 92.7176 },
    { name: 'Kohima (Nagaland Hills)', lat: 25.6751, lng: 94.1086 },
    { name: 'Imphal (Manipur Basin)', lat: 24.8170, lng: 93.9368 },
    { name: 'Agartala (Tripura Lowland)', lat: 23.8315, lng: 91.2868 },
  ];

  // Find if current coords match any preset
  const matchedPreset = presetRegions.find(
    (r) =>
      selectedCoords &&
      Math.abs(r.lat - selectedCoords.lat) < 0.001 &&
      Math.abs(r.lng - selectedCoords.lng) < 0.001
  );

  const selectValue = matchedPreset
    ? `${matchedPreset.lat}|${matchedPreset.lng}|${matchedPreset.name}`
    : selectedCoords
    ? 'custom'
    : '';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex flex-wrap justify-between items-center z-20 shadow-sm">
      {/* Title & Institutional Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded flex items-center justify-center text-orange-400 font-black text-sm">
          PW
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-bold tracking-wider uppercase text-slate-100">
              PRITHVI <span className="text-orange-400">WATCH</span>
            </h1>
            <span className="text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded">
              NER OPERATIONS
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Landslide Risk Monitoring & Early Warning System · North Eastern Region
          </p>
        </div>
      </div>

      {/* Region Selector & System Metadata */}
      <div className="flex items-center space-x-2.5 my-1 lg:my-0">
        <div className="flex items-center space-x-1.5 bg-slate-850 border border-slate-700/80 rounded px-2 py-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Monitoring Region:
          </label>
          <select
            value={selectValue}
            onChange={(e) => {
              const val = e.target.value;
              if (!val || val === 'custom') return;
              const [lat, lng, name] = val.split('|');
              onSelectPresetRegion(parseFloat(lat), parseFloat(lng), name);
            }}
            className="bg-transparent text-slate-200 text-xs focus:outline-none font-medium cursor-pointer max-w-[220px]"
          >
            <option value="" disabled className="bg-slate-900 text-slate-400">Select Region...</option>
            {presetRegions.map((r, i) => (
              <option key={i} value={`${r.lat}|${r.lng}|${r.name}`} className="bg-slate-900 text-slate-200">
                {r.name}
              </option>
            ))}
            {!matchedPreset && selectedCoords && (
              <option value="custom" className="bg-slate-900 text-amber-400">
                Custom Point ({safeToFixed(selectedCoords.lat, 3, '25.800')}°, {safeToFixed(selectedCoords.lng, 3, '92.800')}°)
              </option>
            )}
          </select>
        </div>

        {/* Validation & Architecture Modals */}
        <button
          onClick={onOpenModelModal}
          className="text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 px-2.5 py-1 rounded font-medium transition flex items-center space-x-1"
          title="View Scientific Validation & Spatial Cross-Validation Metrics"
        >
          <span className="text-slate-400">Validation:</span>
          <span className="font-mono text-emerald-400 font-semibold">
            ROC-AUC {safeToFixed(modelInfo?.audited_metrics?.clean_concurrent_era_roc_auc, 3, '0.757')}
          </span>
        </button>

        <button
          onClick={onOpenArchitectureModal}
          className="text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 px-2.5 py-1 rounded font-medium transition"
          title="System Architecture & Data Pipeline"
        >
          Pipeline
        </button>
      </div>

      {/* Mode Control & Operational Clock */}
      <div className="flex items-center space-x-3">
        {/* Mode Toggle */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => {
              if (demoMode) onToggleDemoMode();
            }}
            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider transition ${
              !demoMode
                ? 'bg-emerald-600 text-white font-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Data
          </button>
          <button
            onClick={() => {
              if (!demoMode) onToggleDemoMode();
            }}
            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider transition ${
              demoMode
                ? 'bg-amber-600 text-white font-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Demo Scenarios
          </button>
        </div>

        {/* Telemetry Status & Clock */}
        <div className="hidden md:flex items-center space-x-2 text-right border-l border-slate-800 pl-3">
          <div>
            <div className="flex items-center justify-end space-x-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendStatus === 'ok'
                    ? 'bg-emerald-400'
                    : 'bg-red-500'
                }`}
              />
              <span className="text-[10px] font-mono font-bold text-slate-300">
                {backendStatus === 'ok' ? 'SYSTEM ONLINE' : 'DISCONNECTED'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{timeStr}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
