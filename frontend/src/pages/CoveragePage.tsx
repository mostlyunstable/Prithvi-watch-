import React, { useEffect, useState } from 'react';
import { Database, ShieldCheck, Layers, Satellite, CloudRain, MapPin, AlertCircle, RefreshCw, HardDrive } from 'lucide-react';
import { fetchDataCoverage, fetchDataInventory, type DataCoverageResponse, type DataInventoryResponse } from '../services/api';

export const CoveragePage: React.FC = () => {
  const [coverage, setCoverage] = useState<DataCoverageResponse | null>(null);
  const [inventory, setInventory] = useState<DataInventoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [covRes, invRes] = await Promise.all([fetchDataCoverage(), fetchDataInventory()]);
      setCoverage(covRes);
      setInventory(invRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load data coverage and inventory metadata.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>PRITHVI WATCH Data Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Real Data Coverage & Provenance Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Audit of authoritative topography, hydrometeorology, satellite radar, and historical disaster datasets across the 8 North Eastern Region (NER) states. Zero synthetic substitution.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-center flex items-center space-x-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-mono border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metadata</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-md text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. High-Level KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-mono uppercase">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>SRTM 30m DEM</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {coverage ? `${coverage.overall_dem_coverage_pct}%` : '...'}
          </div>
          <p className="text-[10px] text-slate-500 font-sans">Core 5°×3° High-Res Mosaic</p>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-mono uppercase">
            <CloudRain className="w-3.5 h-3.5 text-blue-400" />
            <span>ERA5 Weather</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {coverage ? `${coverage.overall_weather_coverage_pct}%` : '...'}
          </div>
          <p className="text-[10px] text-slate-500 font-sans">100% Terrestrial Grid</p>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-mono uppercase">
            <Satellite className="w-3.5 h-3.5 text-purple-400" />
            <span>Sentinel-1 SAR</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {coverage ? `${coverage.overall_sar_coverage_pct}%` : '...'}
          </div>
          <p className="text-[10px] text-slate-500 font-sans">12-Day C-Band Orbit</p>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-mono uppercase">
            <MapPin className="w-3.5 h-3.5 text-red-400" />
            <span>Landslides</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {coverage ? `${coverage.total_historical_landslides}` : '...'}
          </div>
          <p className="text-[10px] text-slate-500 font-sans">NASA GLC Verified Events</p>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-mono uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>NER States</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {coverage ? `${coverage.states_count} / 8` : '...'}
          </div>
          <p className="text-[10px] text-slate-500 font-sans">Full Administrative Cover</p>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
          <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-mono uppercase">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>Total Area</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {coverage ? `${(coverage.total_geographic_area_sq_km / 1000).toFixed(0)}k` : '...'} <span className="text-xs text-slate-400 font-sans">km²</span>
          </div>
          <p className="text-[10px] text-slate-500 font-sans">Geographic Extent</p>
        </div>
      </div>

      {/* 2. State-by-State Real Coverage Breakdown */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-white">State-by-State Geographic Coverage (NER)</h2>
            <p className="text-[11px] text-slate-400">Authentic percentages computed directly from active GeoTIFF bounds and provider telemetry.</p>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {coverage ? `Audited ${new Date(coverage.audit_timestamp).toLocaleTimeString()}` : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">State Name</th>
                <th className="p-3">Capital</th>
                <th className="p-3 text-right">Area (km²)</th>
                <th className="p-3 text-right">SRTM DEM %</th>
                <th className="p-3 text-right">Rainfall %</th>
                <th className="p-3 text-right">Sentinel-1 %</th>
                <th className="p-3 text-right">Historical Events</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {coverage && Object.entries(coverage.states).map(([stateName, s]) => (
                <tr key={stateName} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-semibold text-white flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                      {s.state_code}
                    </span>
                    <span>{stateName}</span>
                  </td>
                  <td className="p-3 text-slate-300">{s.capital}</td>
                  <td className="p-3 text-right font-mono text-slate-300">{s.area_sq_km.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono">
                    <span className={s.dem_coverage_pct > 80 ? 'text-emerald-400 font-bold' : s.dem_coverage_pct > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                      {s.dem_coverage_pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-400 font-bold">{s.rainfall_coverage_pct.toFixed(1)}%</td>
                  <td className="p-3 text-right font-mono text-purple-400 font-bold">{s.sar_coverage_pct.toFixed(1)}%</td>
                  <td className="p-3 text-right font-mono text-slate-200">{s.historical_landslides}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                      s.status === 'OPERATIONAL'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900'
                        : 'bg-amber-950/60 text-amber-400 border border-amber-900'
                    }`}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Authoritative Datasets & Provenance Catalog */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white">Production Data Sources & Provenance Catalog</h2>
          <p className="text-[11px] text-slate-400">All registered datasets feeding feature extraction and model inference.</p>
        </div>

        <div className="divide-y divide-slate-800">
          {inventory && inventory.datasets.map((d) => (
            <div key={d.id} className="p-4 space-y-2 hover:bg-slate-850/50 transition">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-white">{d.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono text-[9px] border border-slate-700">
                    {d.id}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900 font-mono text-[9px] font-bold">
                  {d.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500 font-mono text-[10px] block">PROVIDER:</span>
                  <span className="font-medium">{d.provider}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-mono text-[10px] block">RESOLUTION:</span>
                  <span className="font-mono">{d.resolution}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-mono text-[10px] block">TEMPORAL RANGE:</span>
                  <span className="font-mono">{d.temporal_range}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-mono text-[10px] block">LICENSE:</span>
                  <span>{d.license}</span>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap gap-1">
                {d.variables.map((v, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono text-[10px]">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
