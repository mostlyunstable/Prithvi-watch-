import React, { useEffect } from 'react';
import type { ModelInfoResponse } from '../services/api';
import { safeToFixed } from '../utils/geoAnalytics';

interface ModelPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelInfo: ModelInfoResponse | null;
}

export const ModelPerformanceModal: React.FC<ModelPerformanceModalProps> = ({
  isOpen,
  onClose,
  modelInfo
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl text-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div>
            <span className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider block">
              Model Validation & Spatial Cross-Validation Audit
            </span>
            <h2 className="text-base font-bold text-white">
              PRITHVI WATCH — Predictive Model Assessment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Performance Comparison */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Spatial Holdout Cross-Validation (1° Geographic Block Holdout)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-850 p-3.5 rounded-lg border border-slate-700/80">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Topography Baseline
                </span>
                <div className="text-xl font-black text-slate-300 mt-0.5 font-mono">
                  ROC-AUC {safeToFixed(modelInfo?.audited_metrics?.terrain_only_baseline_roc_auc, 3, '0.575')}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  Static terrain parameters (Elevation, Slope, Aspect) provide basic susceptibility without temporal triggering sensitivity.
                </p>
              </div>

              <div className="bg-emerald-950/30 p-3.5 rounded-lg border border-emerald-600/60">
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                  Operational Multimodal Model
                </span>
                <div className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
                  ROC-AUC {safeToFixed(modelInfo?.audited_metrics?.clean_concurrent_era_roc_auc, 3, '0.757')}
                </div>
                <p className="text-[11px] text-emerald-300/90 mt-1 leading-snug">
                  Evaluated across unseen geographic holdouts with concurrent Sentinel-1 SAR and 7-day rainfall accumulation.
                </p>
              </div>
            </div>
          </div>

          {/* Model Features */}
          <div className="bg-slate-850 p-3.5 rounded-lg border border-slate-700/80 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              6-Dimensional Input Parameter Schema
            </h4>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
              {modelInfo?.features ? (
                modelInfo.features.map((feat, idx) => (
                  <div key={idx} className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-slate-500 text-[9px]">Parameter {idx + 1}</div>
                    <div className="font-bold text-white truncate">{feat}</div>
                  </div>
                ))
              ) : (
                <>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-slate-500 text-[9px]">Topography</div>
                    <div className="font-bold text-white">elevation (m)</div>
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-slate-500 text-[9px]">Steepness</div>
                    <div className="font-bold text-white">slope (degrees)</div>
                  </div>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                    <div className="text-slate-500 text-[9px]">Orientation</div>
                    <div className="font-bold text-white">aspect (degrees)</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Provenance */}
          <div className="bg-slate-850 p-3.5 rounded-lg border border-slate-700/80 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Geospatial Data Sources
            </h4>
            <div className="space-y-1">
              {modelInfo?.data_sources &&
                Object.entries(modelInfo.data_sources).map(([key, src]) => (
                  <div
                    key={key}
                    className="flex justify-between items-center bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 text-[11px]"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-slate-200">{src.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {src.type}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Operational Disclaimer */}
          <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[10px] text-slate-400 leading-relaxed font-mono">
            <strong>Validation Notice:</strong> Model validated using Spatial GroupKFold across geographic blocks in Meghalaya, Sikkim, and Assam. Model validation metrics reflect holdout test partitions and are not an operational accuracy guarantee.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
