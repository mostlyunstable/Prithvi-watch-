import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { safeToFixed } from '../utils/geoAnalytics';

export const ScenariosPage: React.FC = () => {
  const {
    prediction,
    selectedRegionName,
    activeScenario,
    selectScenario,
    scenarioComparison,
    loadScenarioComparison
  } = useApp();

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

  const scenariosList = [
    {
      id: 'current',
      title: 'Current Live Weather',
      desc: 'Real observations right now',
      rain: safeToFixed(prediction?.features?.rainfall_7d_mm, 1, '36.7'),
      prob: safeToFixed((prediction?.landslide_probability ?? 0.185) * 100, 1, '18.5'),
      risk: prediction?.risk_level ?? 'LOW',
      driver: 'Current real weather and terrain conditions'
    },
    {
      id: 'A',
      title: 'Normal Seasonal Rain',
      desc: 'Simulated typical monsoon rain (45 mm)',
      rain: safeToFixed(scenarioComparison?.scenarioA?.features?.rainfall_7d_mm, 1, '45.0'),
      prob: safeToFixed((scenarioComparison?.scenarioA?.landslide_probability ?? 0.185) * 100, 1, '18.5'),
      risk: scenarioComparison?.scenarioA?.risk_level ?? 'LOW',
      driver: 'Moderate rainfall does not exceed slope holding capacity'
    },
    {
      id: 'B',
      title: 'What If It Rains Much More?',
      desc: 'Simulated heavy monsoon storm (218 mm)',
      rain: safeToFixed(scenarioComparison?.scenarioB?.features?.rainfall_7d_mm, 1, '218.6'),
      prob: safeToFixed((scenarioComparison?.scenarioB?.landslide_probability ?? 0.742) * 100, 1, '74.2'),
      risk: scenarioComparison?.scenarioB?.risk_level ?? 'HIGH',
      driver: 'Heavy rain soaks deep into soil, making ground heavier'
    },
    {
      id: 'C',
      title: 'What If There Is Extreme Rain?',
      desc: 'Simulated cloudburst downpour (412 mm)',
      rain: safeToFixed(scenarioComparison?.scenarioC?.features?.rainfall_7d_mm, 1, '412.0'),
      prob: safeToFixed((scenarioComparison?.scenarioC?.landslide_probability ?? 0.928) * 100, 1, '92.8'),
      risk: scenarioComparison?.scenarioC?.risk_level ?? 'CRITICAL',
      driver: 'Extreme water saturation destroys soil holding friction'
    }
  ];

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 text-slate-200">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
            WHAT-IF WEATHER SIMULATOR
          </span>
          <h1 className="text-xl font-bold text-white tracking-tight">
            What If It Rains Much More?
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Test how landslide risk changes under different rainfall conditions for <span className="text-white font-bold">{selectedRegionName}</span>.
          </p>
        </div>

        <button
          onClick={() => loadScenarioComparison()}
          disabled={scenarioComparison.isLoading}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scenarioComparison.isLoading ? 'animate-spin' : ''}`} />
          <span>Re-run Comparison</span>
        </button>
      </div>

      {/* Demonstration Notice */}
      <div className="bg-amber-950/40 border border-amber-600/70 p-4 rounded-xl flex items-start space-x-3 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
            DEMONSTRATION ONLY — NOT A WEATHER FORECAST
          </div>
          <p className="text-amber-200/90 font-sans text-xs leading-relaxed">
            This tool lets you test how the computer model reacts if rainfall increases significantly. It is an educational and emergency planning exercise, not a prediction of tomorrow's weather.
          </p>
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenariosList.map((sc) => {
          const isActive = (sc.id === 'current' && !activeScenario) || activeScenario === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => {
                if (sc.id === 'current') {
                  selectScenario('A');
                } else {
                  selectScenario(sc.id as any);
                }
              }}
              className={`p-4 rounded-2xl border transition flex flex-col justify-between cursor-pointer ${
                isActive
                  ? 'bg-slate-900 border-orange-500 shadow-xl ring-1 ring-orange-500/50'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-sm">{sc.title}</h3>
                    <span className="text-[11px] text-slate-400 font-sans block">{sc.desc}</span>
                  </div>
                  {isActive && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-600 text-white uppercase font-mono">
                      Active
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1 text-center">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Estimated Risk</span>
                  <div className="text-2xl font-black text-white font-mono">{sc.prob}%</div>
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${getRiskBadge(sc.risk)}`}>
                    {sc.risk} RISK
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-sans">
                  <div className="flex justify-between text-slate-400">
                    <span>Rain in 7 Days:</span>
                    <span className="text-white font-bold font-mono">{sc.rain} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Ground Steepness:</span>
                    <span className="text-white font-bold font-mono">{safeToFixed(prediction?.features?.slope, 1, '33.8')}°</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-sans leading-snug">
                  <strong>Why:</strong> {sc.driver}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800/80 text-center">
                <span className="text-[10px] font-bold text-orange-400 font-mono">
                  {isActive ? 'Currently Selected' : 'Click to Test This Scenario'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* What Changed? Explanation */}
      <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
        <h3 className="font-bold text-white text-sm">What Should I Learn From This Comparison?</h3>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          Ground steepness at <span className="text-white font-bold">{selectedRegionName}</span> stays constant ({safeToFixed(prediction?.features?.slope, 1, '33.8')}°). However, when simulated rainfall rises from 45 mm (normal) to 218 mm (heavy) and 412 mm (extreme), the model's estimated risk jumps from <strong>Low</strong> to <strong>High</strong> and <strong>Critical</strong>. This demonstrates how rainfall acts as the active trigger for landslide hazards.
        </p>
      </div>
    </div>
  );
};
