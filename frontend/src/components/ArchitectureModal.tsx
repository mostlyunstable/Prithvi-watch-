import React, { useEffect } from 'react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
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
        className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl text-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div>
            <span className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider block">
              System Architecture & Data Flow
            </span>
            <h2 className="text-base font-bold text-white">
              PRITHVI WATCH Processing Pipeline
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
          {/* Workflow Diagram */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 font-mono text-[11px]">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              End-to-End Operational Pipeline
            </h3>

            <div className="space-y-2.5">
              {/* Layer 1: Ingestion */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                  <div className="text-[9px] text-slate-400">NASA SRTM</div>
                  <div className="font-bold text-slate-200">30m DEM</div>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                  <div className="text-[9px] text-slate-400">NASA GLC</div>
                  <div className="font-bold text-slate-200">Ground Truth</div>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                  <div className="text-[9px] text-slate-400">Open-Meteo</div>
                  <div className="font-bold text-orange-400">ERA5 Weather</div>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                  <div className="text-[9px] text-slate-400">ESA Copernicus</div>
                  <div className="font-bold text-cyan-400">Sentinel-1 SAR</div>
                </div>
              </div>

              <div className="text-center text-slate-500 font-bold text-[10px]">↓ Feature Extraction & Spatial Alignment</div>

              {/* Layer 2: Feature Engineering */}
              <div className="p-2.5 bg-slate-900 border border-slate-700 rounded text-center">
                <div className="text-[9px] text-slate-400 uppercase font-bold">6-Dimensional Feature Vector</div>
                <div className="text-slate-200 text-[11px] font-bold mt-0.5">
                  [ Elevation | Slope | Aspect | 7d Rainfall | Sentinel-1 VV | Sentinel-1 VH ]
                </div>
              </div>

              <div className="text-center text-slate-500 font-bold text-[10px]">↓ Statistical Classification & Attribution</div>

              {/* Layer 3: ML Inference */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 bg-slate-900 border border-slate-700 rounded">
                  <div className="text-[9px] text-orange-400 uppercase font-bold">XGBoost Classifier</div>
                  <div className="font-bold text-white text-[11px] mt-0.5">Landslide Risk Probability</div>
                </div>
                <div className="p-2.5 bg-slate-900 border border-slate-700 rounded">
                  <div className="text-[9px] text-cyan-400 uppercase font-bold">SHAP TreeExplainer</div>
                  <div className="font-bold text-white text-[11px] mt-0.5">Physical Factor Attribution</div>
                </div>
              </div>

              <div className="text-center text-slate-500 font-bold text-[10px]">↓ GIS Rendering & Decision Support</div>

              {/* Layer 4: Outputs */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                  <div className="text-[9px] text-slate-400">MapLibre GL</div>
                  <div className="font-bold text-emerald-400">0.05° Spatial Risk Grid</div>
                </div>
                <div className="p-2 bg-slate-900 border border-slate-700 rounded">
                  <div className="text-[9px] text-slate-400">Emergency Support</div>
                  <div className="font-bold text-red-400">Early Warning Advisory</div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              System Design Principles
            </h4>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li className="flex items-start space-x-2">
                <span className="text-orange-400 font-bold">•</span>
                <span>
                  <strong>Real Topography & Weather:</strong> 30m SRTM digital elevation model with latitude-adjusted spherical gradient calculation (cos(mean_lat)) and ERA5 7-day cumulative precipitation.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-orange-400 font-bold">•</span>
                <span>
                  <strong>Spatial Validation Integrity:</strong> Validated strictly across unseen geographic holdouts using Spatial GroupKFold to avoid spatial autocorrelation overfitting.
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-orange-400 font-bold">•</span>
                <span>
                  <strong>Sensor Fault Tolerance:</strong> Explicit data availability semantics with neutral background median imputation on satellite telemetry dropout, preventing false critical risk alarms.
                </span>
              </li>
            </ul>
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
