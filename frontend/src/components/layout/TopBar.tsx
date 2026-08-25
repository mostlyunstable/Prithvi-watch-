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

      {/* 3. Live System Clock & Mode Toggle */}
      <div className="flex items-center space-x-3 font-mono text-xs">
        {/* Real-Time Local IST System Clock */}
        <SystemClock />

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

        {/* Live Operational Status with Expandable Diagnostics Popover */}
        <LiveStatusIndicator backendStatus={backendStatus} />
      </div>
    </header>
  );
};

const SystemClock: React.FC = () => {
  const [timeStr, setTimeStr] = React.useState<string>('');

  React.useEffect(() => {
    const update = () => {
      const d = new Date();
      // Format as IST time (UTC+5:30)
      const istTime = d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setTimeStr(`${istTime} IST`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:flex items-center space-x-1 text-[11px] text-slate-400 font-mono px-2 py-1 bg-slate-950 rounded border border-slate-850">
      <span className="text-slate-500 text-[9px] uppercase font-bold">CLOCK:</span>
      <span className="text-slate-200 font-semibold">{timeStr || '12:44:00 IST'}</span>
    </div>
  );
};

const LiveStatusIndicator: React.FC<{ backendStatus: string }> = ({ backendStatus }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 transition text-[11px] font-mono text-slate-300"
        title="View live system operations status"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            backendStatus === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        <span className="font-bold">{backendStatus === 'ok' ? 'LIVE' : 'OFFLINE'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-3 space-y-2.5 z-50 text-xs font-sans">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
              System Operations Status
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Backend Core</span>
              <span className="font-mono font-semibold text-emerald-400">Operational (FastAPI)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Inference Model</span>
              <span className="font-mono font-semibold text-white">XGBoost v4.0 (Spatial Holdout)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Hydrometeorology</span>
              <span className="font-mono text-slate-200">Open-Meteo ERA5 (Available · 3m)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Satellite SAR</span>
              <span className="font-mono text-slate-200">Sentinel-1 RTC (Available · 5d)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Terrain Elevation</span>
              <span className="font-mono text-slate-200">SRTM 30m (Static Baseline)</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
              <span>Mode</span>
              <span className="text-emerald-400 font-bold">REAL DATA ACTIVE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
