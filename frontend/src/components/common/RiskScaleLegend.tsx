import React from 'react';

export const RiskScaleLegend: React.FC = () => {
  return (
    <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-800 space-y-2 text-xs">
      <div className="flex justify-between items-center border-b border-slate-800 pb-1 font-mono">
        <span className="text-[10px] uppercase font-bold text-slate-400">
          Risk Scale Reference
        </span>
        <span className="text-[9px] text-slate-500">4-Tier Scale</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-[11px]">
        <div className="p-2 bg-slate-950 rounded border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-bold text-emerald-400">Low (Green)</span>
          </div>
          <p className="text-[10px] text-slate-400 font-sans leading-tight">
            Baseline environmental conditions.
          </p>
        </div>

        <div className="p-2 bg-slate-950 rounded border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-bold text-amber-400">Moderate (Yellow)</span>
          </div>
          <p className="text-[10px] text-slate-400 font-sans leading-tight">
            Some elevated terrain or moisture factors.
          </p>
        </div>

        <div className="p-2 bg-slate-950 rounded border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="font-bold text-orange-400">High (Orange)</span>
          </div>
          <p className="text-[10px] text-slate-400 font-sans leading-tight">
            Elevated rainfall on steep terrain.
          </p>
        </div>

        <div className="p-2 bg-slate-950 rounded border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="font-bold text-red-400">Critical (Red)</span>
          </div>
          <p className="text-[10px] text-slate-400 font-sans leading-tight">
            Heavy cumulative rainfall on steep slopes.
          </p>
        </div>
      </div>
      <div className="text-[10px] text-slate-500 font-sans italic pt-1 border-t border-slate-800">
        * Note: These are model estimates to help teams plan ahead, not guaranteed future events.
      </div>
    </div>
  );
};
