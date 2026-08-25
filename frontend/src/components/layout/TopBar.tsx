import React from 'react';
import { useApp } from '../../context/AppContext';
import { Logo } from '../common/Logo';
import { safeToFixed } from '../../utils/geoAnalytics';

export const TopBar: React.FC = () => {
  const {
    backendStatus,
    demoMode,
    toggleDemoMode,
    selectPresetRegion,
    selectedCoords
  } = useApp();

  const presetRegions = [
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
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex justify-between items-center z-30 shrink-0">
      {/* 1. Official Minimal Branding: Logo + Product Name ONLY */}
      <div className="flex items-center space-x-2">
        <Logo size={26} />
      </div>

      {/* 2. Location Selector */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1">
          <label className="text-[10px] font-mono font-medium text-slate-400 uppercase">
            Location:
          </label>
          <select
            value={selectValue}
            onChange={(e) => {
              const val = e.target.value;
              if (!val || val === 'custom') return;
              const [lat, lng, name] = val.split('|');
              selectPresetRegion(parseFloat(lat), parseFloat(lng), name);
            }}
            className="bg-transparent text-slate-200 text-xs focus:outline-none font-medium cursor-pointer max-w-[240px]"
          >
            <option value="" disabled className="bg-slate-900 text-slate-400">Select location...</option>
            {presetRegions.map((r, i) => (
              <option key={i} value={`${r.lat}|${r.lng}|${r.name}`} className="bg-slate-900 text-slate-200">
                {r.name}
              </option>
            ))}
            {!matchedPreset && selectedCoords && (
              <option value="custom" className="bg-slate-900 text-slate-300">
                Custom Point ({safeToFixed(selectedCoords.lat, 3, '25.800')}° N, {safeToFixed(selectedCoords.lng, 3, '92.800')}° E)
              </option>
            )}
          </select>
        </div>
      </div>

      {/* 3. Mode Toggle & Essential Status */}
      <div className="flex items-center space-x-3 font-mono text-xs">
        {/* Restrained Mode Switch */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => {
              if (demoMode) toggleDemoMode();
            }}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition ${
              !demoMode
                ? 'bg-slate-800 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Real Data
          </button>
          <button
            onClick={() => {
              if (!demoMode) toggleDemoMode();
            }}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition ${
              demoMode
                ? 'bg-slate-800 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            What-If Scenarios
          </button>
        </div>

        {/* Minimal System Online Indicator */}
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 border-l border-slate-800 pl-3">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              backendStatus === 'ok' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span>{backendStatus === 'ok' ? 'Online' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
};
