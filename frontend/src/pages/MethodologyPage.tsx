import React from 'react';

export const MethodologyPage: React.FC = () => {
  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-wider block">
          SCIENTIFIC ARCHITECTURE &amp; WORKFLOW
        </span>
        <h1 className="text-xl font-bold text-white tracking-tight">
          System Methodology &amp; Engineering Pipeline
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          End-to-end technical specifications for data ingestion, feature alignment, statistical inference, explainability, and spatial decision support.
        </p>
      </div>

      {/* Pipeline Diagram */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs">
        <span className="text-[10px] text-slate-400 uppercase font-bold block">
          End-to-End Operational Pipeline
        </span>

        <div className="space-y-3">
          {/* Layer 1: Ingestion */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-[9px] text-slate-500 uppercase">NASA SRTM</div>
              <div className="font-bold text-white text-xs mt-0.5">30m Global DEM</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-[9px] text-slate-500 uppercase">NASA GLC</div>
              <div className="font-bold text-white text-xs mt-0.5">Ground Truth Inventory</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-[9px] text-slate-500 uppercase">Open-Meteo / ECMWF</div>
              <div className="font-bold text-orange-400 text-xs mt-0.5">ERA5 Rainfall</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-[9px] text-slate-500 uppercase">ESA Copernicus</div>
              <div className="font-bold text-cyan-400 text-xs mt-0.5">Sentinel-1 SAR</div>
            </div>
          </div>

          <div className="text-center text-slate-500 font-bold text-[10px]">
            ↓ Geospatial Extraction &amp; Spherical Gradient Alignment
          </div>

          {/* Layer 2: Feature Engineering */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center">
            <div className="text-[9px] text-slate-500 uppercase font-bold">6-Dimensional Feature Vector</div>
            <div className="text-slate-200 font-bold text-xs mt-0.5">
              [ Elevation | Slope (deg) | Aspect (deg) | Rainfall 7d (mm) | Sentinel-1 VV | Sentinel-1 VH ]
            </div>
          </div>

          <div className="text-center text-slate-500 font-bold text-[10px]">
            ↓ Statistical Classification &amp; Game-Theoretic Attribution
          </div>

          {/* Layer 3: ML Inference */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-center">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-[9px] text-orange-400 uppercase font-bold">XGBoost Classifier</div>
              <div className="font-bold text-white text-xs mt-0.5">Calibrated Risk Probability</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-[9px] text-cyan-400 uppercase font-bold">SHAP TreeExplainer</div>
              <div className="font-bold text-white text-xs mt-0.5">Physical Factor Attribution</div>
            </div>
          </div>

          <div className="text-center text-slate-500 font-bold text-[10px]">
            ↓ GIS Rendering &amp; Emergency Decision Support
          </div>

          {/* Layer 4: Outputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-center">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-[9px] text-emerald-400 uppercase font-bold">MapLibre GL Workstation</div>
              <div className="font-bold text-white text-xs mt-0.5">0.05° Spatial Risk Surface</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-[9px] text-red-400 uppercase font-bold">Early Warning System</div>
              <div className="font-bold text-white text-xs mt-0.5">Operational SOP Advisories</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Deep Dive Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-300">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <h3 className="font-bold text-white text-sm">1. Problem Formulation</h3>
          <p className="leading-relaxed font-sans text-slate-400">
            Landslides in the North Eastern Region are complex interactions between steep mountain topography and monsoonal precipitation forcing. PRITHVI WATCH formulates landslide occurrence as a probabilistic binary classification task parameterized by terrain geometry, antecedent cumulative moisture, and surface radar scattering.
          </p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <h3 className="font-bold text-white text-sm">2. Spatial Gradient Calculation</h3>
          <p className="leading-relaxed font-sans text-slate-400">
            Topographic gradient and surface normals are computed using local plane regression across the 30m SRTM DEM. To eliminate east-west metric distortion across the 24°–29° latitude range, longitude degrees are scaled by cos(mean_lat), preventing an 11% gradient underestimation.
          </p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <h3 className="font-bold text-white text-sm">3. Spatial Holdout Cross-Validation</h3>
          <p className="leading-relaxed font-sans text-slate-400">
            Evaluated using Spatial GroupKFold where entire 1-degree geographic tiles in Meghalaya, Sikkim, and Assam are held out as unseen test sets. This strictly prevents spatial autocorrelation leakage and guarantees that ROC-AUC metrics reflect generalizability to new terrain.
          </p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <h3 className="font-bold text-white text-sm">4. Fault-Tolerant Telemetry</h3>
          <p className="leading-relaxed font-sans text-slate-400">
            If external satellite STAC or weather APIs timeout, the system imputes neutral regional background medians rather than zero, preventing artificial risk inflation while explicitly flagging the degraded data quality to the operator.
          </p>
        </div>
      </div>
    </div>
  );
};
