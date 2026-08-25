import React from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { useApp } from '../../context/AppContext';

export const AppShell: React.FC = () => {
  const { errorMessage, dismissError, demoMode, activeScenario, selectScenario } = useApp();

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* 1. Persistent Top Operations Header */}
      <TopBar />

      {/* Demonstration Mode Global Top Banner (if active) */}
      {demoMode && (
        <div className="bg-amber-950/90 border-b border-amber-600/60 px-4 py-1.5 flex flex-wrap items-center justify-between z-30 text-xs shrink-0">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
              DEMONSTRATION MODE ACTIVE
            </span>
            <span className="text-amber-200/80 text-[10px] hidden md:inline">
              — Simulated weather conditions to test model response.
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => selectScenario('A')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                activeScenario === 'A'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Normal (45 mm)
            </button>
            <button
              onClick={() => selectScenario('B')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                activeScenario === 'B'
                  ? 'bg-orange-600 text-white border-orange-400'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Heavy Rain (218 mm)
            </button>
            <button
              onClick={() => selectScenario('C')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                activeScenario === 'C'
                  ? 'bg-red-600 text-white border-red-400'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Cloudburst (412 mm)
            </button>
          </div>
        </div>
      )}

      {/* 2. Workspace Body: Persistent Sidebar + Routed Page Content */}
      <div className="flex-1 flex overflow-hidden relative min-h-0 w-full">
        {/* Error Notification Toast (if any) */}
        {errorMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-red-900 text-white text-xs px-4 py-2 rounded-lg shadow-xl border border-red-700 flex items-center space-x-2 font-mono">
            <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
            <span>{errorMessage}</span>
            <button onClick={dismissError} className="font-bold underline ml-2 hover:text-red-200">
              Dismiss
            </button>
          </div>
        )}

        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden relative min-h-0 min-w-0 bg-slate-950">
          <Outlet />
        </main>
      </div>

      {/* 3. Slim Clean Status Bar */}
      <footer className="bg-slate-900 border-t border-slate-800 text-[10px] font-mono text-slate-400 px-4 py-1 flex justify-between items-center z-20 shrink-0">
        <span className="text-slate-400">PRITHVI WATCH · North Eastern India Landslide Early Warning</span>
        <span className="text-slate-500">Real SRTM 30m · ERA5 Rain · Sentinel-1 Radar · NASA GLC Ground Truth</span>
      </footer>
    </div>
  );
};
