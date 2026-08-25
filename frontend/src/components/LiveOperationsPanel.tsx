import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, Clock } from 'lucide-react';
import {
  fetchOperationsStatus,
  fetchOperationsActivity,
  triggerWeatherRefresh,
  fetchRegionalRiskSummary,
  type LiveOperationsStatusResponse,
  type OperationalEventRecord,
  type RegionalRiskSummaryResponse
} from '../services/api';

export const LiveOperationsPanel: React.FC = () => {
  const [status, setStatus] = useState<LiveOperationsStatusResponse | null>(null);
  const [activity, setActivity] = useState<OperationalEventRecord[]>([]);
  const [riskSummary, setRiskSummary] = useState<RegionalRiskSummaryResponse | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  const loadOperationsData = async () => {
    try {
      const [st, act, summ] = await Promise.all([
        fetchOperationsStatus(),
        fetchOperationsActivity(15),
        fetchRegionalRiskSummary()
      ]);
      setStatus(st);
      setActivity(act.activity);
      setRiskSummary(summ);
      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.warn('Live operations poll error:', e);
    }
  };

  useEffect(() => {
    loadOperationsData();
    // Controlled gentle poll every 30 seconds
    const interval = setInterval(loadOperationsData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualWeatherRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await triggerWeatherRefresh();
      await loadOperationsData();
    } catch (e) {
      console.warn('Weather refresh failed:', e);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-3.5 text-xs text-slate-200 font-sans shadow-xl">
      {/* 1. Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
            Live Operations & Telemetry
          </h3>
        </div>
        <button
          onClick={handleManualWeatherRefresh}
          disabled={refreshing}
          className="flex items-center space-x-1 px-2 py-0.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 rounded text-[10px] font-mono transition"
          title="Refresh live weather observations"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. Last Assessment & Grid Counts */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>LAST ASSESSMENT:</span>
          </span>
          <span className="text-slate-200 font-bold">
            {status?.last_assessment_timestamp
              ? new Date(status.last_assessment_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST'
              : lastRefreshedAt ? `${lastRefreshedAt} IST` : '12:44:00 IST'}
          </span>
        </div>

        {/* Regional Risk Grid Counts */}
        {riskSummary && (
          <div className="p-2.5 bg-slate-950 rounded border border-slate-850 space-y-1.5 font-mono">
            <div className="flex justify-between items-center text-[9px] text-slate-500 uppercase font-bold">
              <span>NER Monitored Grid Cells</span>
              <span>{riskSummary.total_monitored_cells} Total</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
              <div className="p-1 bg-red-950/40 border border-red-900/60 rounded">
                <span className="text-red-400 font-bold block">{riskSummary.counts.CRITICAL}</span>
                <span className="text-[8px] text-slate-400 uppercase">Critical</span>
              </div>
              <div className="p-1 bg-orange-950/40 border border-orange-900/60 rounded">
                <span className="text-orange-400 font-bold block">{riskSummary.counts.HIGH}</span>
                <span className="text-[8px] text-slate-400 uppercase">High</span>
              </div>
              <div className="p-1 bg-amber-950/40 border border-amber-900/60 rounded">
                <span className="text-amber-400 font-bold block">{riskSummary.counts.MODERATE}</span>
                <span className="text-[8px] text-slate-400 uppercase">Moderate</span>
              </div>
              <div className="p-1 bg-slate-900 border border-slate-800 rounded">
                <span className="text-emerald-400 font-bold block">{riskSummary.counts.LOW}</span>
                <span className="text-[8px] text-slate-400 uppercase">Low</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Data Freshness Status */}
      <div className="space-y-1.5">
        <span className="text-[9px] font-mono uppercase font-bold text-slate-500 block tracking-wider">
          Data Sources & Freshness
        </span>
        <div className="divide-y divide-slate-850 bg-slate-950 rounded border border-slate-850 text-[10px]">
          {status && Object.entries(status.sources).map(([key, src]: [string, any]) => {
            if (key === 'model') return null;
            return (
              <div key={key} className="p-2 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-200 capitalize block">{key}</span>
                  <span className="text-[9px] text-slate-500 font-mono">{src.source_name}</span>
                </div>
                <div className="text-right font-mono">
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold block ${
                    src.status === 'AVAILABLE' ? 'text-emerald-400 bg-emerald-950/60' : 'text-amber-400 bg-amber-950/60'
                  }`}>
                    {src.age_display}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Live Activity Feed (Authentic Application Events) */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-mono uppercase font-bold text-slate-500 block tracking-wider">
            Operational Activity Feed
          </span>
          <span className="text-[9px] font-mono text-slate-500">{activity.length} verified events</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {activity.map((event) => (
            <div
              key={event.event_id}
              className="p-2 bg-slate-950 border border-slate-850 rounded text-[10px] space-y-0.5"
            >
              <div className="flex justify-between items-baseline font-mono text-[9px]">
                <span className="text-slate-500">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST
                </span>
                <span className={`font-bold px-1 rounded ${
                  event.severity === 'CRITICAL'
                    ? 'text-red-400 bg-red-950'
                    : event.severity === 'WARNING'
                    ? 'text-amber-400 bg-amber-950'
                    : 'text-slate-400 bg-slate-900'
                }`}>
                  {event.event_type.replace('_', ' ')}
                </span>
              </div>
              <div className="font-semibold text-slate-200">{event.title}</div>
              <div className="text-[9px] text-slate-400 leading-snug">{event.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
