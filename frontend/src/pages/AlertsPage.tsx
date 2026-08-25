import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Map, Flame, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { safeToFixed, formatPercent } from '../utils/geoAnalytics';

export const AlertsPage: React.FC = () => {
  const {
    prediction,
    selectedRegionName,
    demoMode,
    selectScenario,
    riskGridAnalytics,
    selectPresetRegion
  } = useApp();
  const navigate = useNavigate();

  const isElevated = prediction?.risk_level === 'HIGH' || prediction?.risk_level === 'CRITICAL';

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

  const handleInspectHotspot = (lat: number, lng: number, name: string) => {
    selectPresetRegion(lat, lng, name);
    navigate('/map');
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-5 text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3">
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
          Advisories &amp; Hazard Zones
        </span>
        <h1 className="text-lg font-bold text-white tracking-tight">
          High-Risk Areas
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Model-estimated elevated landslide hazard areas under current conditions.
        </p>
      </div>

      {/* Main Advisory for Selected Location (Neutral Dark Card with Risk Accent) */}
      {isElevated && prediction ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 max-w-4xl">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Elevated {prediction.risk_level} Risk
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{selectedRegionName}</h2>
              <div className="text-xs font-mono text-slate-400">
                Coordinates: {safeToFixed(prediction.latitude, 4)}° N · {safeToFixed(prediction.longitude, 4)}° E
              </div>
            </div>

            <div className="text-right font-mono bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">Estimated Risk</span>
              <div className="text-2xl font-bold text-white">
                {formatPercent(prediction.landslide_probability, 1)}
              </div>
            </div>
          </div>

          {/* Environmental Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 font-mono text-xs">
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block">Ground Steepness</span>
              <span className="font-bold text-white">{safeToFixed(prediction.features?.slope, 1, '0.0')}°</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block">7-Day Rainfall</span>
              <span className="font-bold text-slate-100">{safeToFixed(prediction.features?.rainfall_7d_mm, 1, '0.0')} mm</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block">Satellite Observation</span>
              <span className="font-bold text-emerald-400">Available</span>
            </div>
          </div>

          {/* Actionable Guidance */}
          <div className="p-3 bg-slate-950 rounded border border-slate-850 space-y-1.5 text-xs">
            <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Recommended Precautions for Response Teams
            </h3>
            <ul className="space-y-1 list-disc list-inside text-slate-300 font-sans text-[11px]">
              <li>Keep district road clearing and excavation equipment on standby.</li>
              <li>Inspect vulnerable steep roadside slope cuts and drainage ditches.</li>
              <li>Warn local travelers along mountain highways during continuous rainfall.</li>
            </ul>
          </div>

          {/* Action Button */}
          <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
            <span>Decision-support tool for disaster teams. Not an official evacuation order.</span>
            <Link
              to="/map"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-white font-medium rounded text-xs border border-slate-700 flex items-center space-x-1.5 transition"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Show on Risk Map</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 text-center space-y-3 max-w-lg mx-auto">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              No Active High-Risk Warnings
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Current weather and ground conditions at <span className="text-slate-200 font-bold">{selectedRegionName}</span> do not show dangerous risk levels (Current Risk: {prediction?.risk_level ?? 'LOW'}).
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-center space-x-3 text-xs font-mono">
            <Link
              to="/map"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-xs font-medium border border-slate-700 transition flex items-center space-x-1.5"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Explore Risk Map</span>
            </Link>
            {demoMode && (
              <button
                onClick={() => selectScenario('C')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-xs font-medium border border-slate-700 transition"
              >
                Test Heavy Rain Scenario (Scenario C)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Regional Priority Ranking */}
      {riskGridAnalytics && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 space-y-3 max-w-4xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div>
              <div className="flex items-center space-x-1.5 font-bold text-white text-sm">
                <Flame className="w-4 h-4 text-slate-400" />
                <span>Highest-Risk Grid Cells in Region</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated across the visible region under current conditions.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {riskGridAnalytics.topHotspots.length} Locations
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-[10px] text-slate-400 uppercase">
                  <th className="p-2">Priority</th>
                  <th className="p-2">Coordinates</th>
                  <th className="p-2">Risk Level</th>
                  <th className="p-2">Estimated Risk</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {riskGridAnalytics.topHotspots.map((h, i) => (
                  <tr key={h.id} className="hover:bg-slate-850/50">
                    <td className="p-2 text-slate-500 font-bold">#{i + 1}</td>
                    <td className="p-2 text-slate-200">
                      {safeToFixed(h.lat, 4)}° N · {safeToFixed(h.lng, 4)}° E
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${getRiskBadge(h.riskLevel)}`}>
                        {h.riskLevel}
                      </span>
                    </td>
                    <td className="p-2 text-sm font-bold text-white">
                      {formatPercent(h.probability, 1)}
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() =>
                          handleInspectHotspot(
                            h.lat,
                            h.lng,
                            `High-Risk Zone #${i + 1} (${safeToFixed(h.lat, 3)}° N, ${safeToFixed(h.lng, 3)}° E)`
                          )
                        }
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded text-[10px] font-medium transition inline-flex items-center space-x-1 border border-slate-700"
                      >
                        <span>Inspect on Map</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
