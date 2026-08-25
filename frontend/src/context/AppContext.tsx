import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import {
  checkHealth,
  fetchModelInfo,
  fetchHistoricalLandslides,
  fetchRiskMap,
  runPrediction,
  type ModelInfoResponse,
  type PredictionResponse
} from '../services/api';
import {
  computeHistoricalContext,
  computeRiskGridAnalytics,
  type HistoricalRadiusStats,
  type RiskGridAnalytics
} from '../utils/geoAnalytics';

export interface ScenarioComparisonData {
  baseline: PredictionResponse | null;
  scenarioA: PredictionResponse | null;
  scenarioB: PredictionResponse | null;
  scenarioC: PredictionResponse | null;
  isLoading: boolean;
}

export interface AppContextType {
  selectedCoords: { lat: number; lng: number } | null;
  selectedRegionName: string;
  prediction: PredictionResponse | null;
  isLoading: boolean;
  lastUpdated: string | null;
  demoMode: boolean;
  activeScenario: string;
  modelInfo: ModelInfoResponse | null;
  backendStatus: 'checking' | 'ok' | 'error';
  historicalLandslides: any | null;
  historicalRadiusStats: HistoricalRadiusStats;
  riskGridData: any | null;
  riskGridAnalytics: RiskGridAnalytics | null;
  riskGridLoading: boolean;
  scenarioComparison: ScenarioComparisonData;
  errorMessage: string | null;
  selectPresetRegion: (lat: number, lng: number, name: string) => Promise<void>;
  handleMapClickPrediction: (lat: number, lng: number, preloadedResult?: PredictionResponse) => Promise<void>;
  refreshAssessment: () => Promise<void>;
  toggleDemoMode: () => Promise<void>;
  selectScenario: (scenario: string) => Promise<void>;
  loadScenarioComparison: () => Promise<void>;
  dismissError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check URL parameters on initial load
  const initialParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const rawLat = initialParams?.get('lat') ? parseFloat(initialParams.get('lat')!) : 25.5788;
  const rawLng = initialParams?.get('lon') ? parseFloat(initialParams.get('lon')!) : 91.8933;
  const initialLat = !isNaN(rawLat) ? rawLat : 25.5788;
  const initialLng = !isNaN(rawLng) ? rawLng : 91.8933;

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>({
    lat: initialLat,
    lng: initialLng
  });
  const [selectedRegionName, setSelectedRegionName] = useState<string>('Shillong (Meghalaya Plateau)');
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string>('A');
  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [historicalLandslides, setHistoricalLandslides] = useState<any | null>(null);
  const [riskGridData, setRiskGridData] = useState<any | null>(null);
  const [riskGridLoading, setRiskGridLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [scenarioComparison, setScenarioComparison] = useState<ScenarioComparisonData>({
    baseline: null,
    scenarioA: null,
    scenarioB: null,
    scenarioC: null,
    isLoading: false
  });

  const latestRequestId = useRef<number>(0);

  // Sync URL search params when location changes
  const updateUrlCoords = (lat: number, lng: number) => {
    if (typeof window !== 'undefined' && !isNaN(lat) && !isNaN(lng)) {
      const url = new URL(window.location.href);
      url.searchParams.set('lat', lat.toFixed(4));
      url.searchParams.set('lon', lng.toFixed(4));
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Compute Multi-Radius Historical Context on the fly
  const historicalRadiusStats = useMemo(() => {
    if (!selectedCoords || !historicalLandslides) {
      return {
        within10km: 0,
        within25km: 0,
        within50km: 0,
        nearestEvent: null,
        recentEventsInRadius: []
      };
    }
    return computeHistoricalContext(selectedCoords.lat, selectedCoords.lng, historicalLandslides);
  }, [selectedCoords, historicalLandslides]);

  // Compute Spatial Analytics from Risk Grid
  const riskGridAnalytics = useMemo(() => {
    return computeRiskGridAnalytics(riskGridData);
  }, [riskGridData]);

  // Initialize API Health, Model Info, Historical Data, and Risk Grid
  useEffect(() => {
    checkHealth()
      .then(() => {
        setBackendStatus('ok');
        return fetchModelInfo();
      })
      .then((info) => setModelInfo(info))
      .catch((err) => {
        console.error('API health check error:', err);
        setBackendStatus('error');
      });

    fetchHistoricalLandslides()
      .then((data) => setHistoricalLandslides(data))
      .catch((err) => console.warn('Historical landslides load warning:', err));

    // Load regional 0.05° risk grid for analytics
    setRiskGridLoading(true);
    fetchRiskMap(89.0, 24.5, 95.0, 28.0, 0.05)
      .then((grid) => setRiskGridData(grid))
      .catch((err) => console.warn('Risk map grid fetch warning:', err))
      .finally(() => setRiskGridLoading(false));

    // Initial prediction
    selectPresetRegion(initialLat, initialLng, 'Shillong (Meghalaya Plateau)');
  }, []);

  const selectPresetRegion = async (lat: number, lng: number, name: string) => {
    const safeLat = !isNaN(lat) ? lat : 25.5788;
    const safeLng = !isNaN(lng) ? lng : 91.8933;
    setSelectedCoords({ lat: safeLat, lng: safeLng });
    setSelectedRegionName(name);
    updateUrlCoords(safeLat, safeLng);
    setIsLoading(true);
    setErrorMessage(null);
    const reqId = ++latestRequestId.current;

    try {
      const scenarioParam = demoMode ? activeScenario : undefined;
      const result = await runPrediction(safeLat, safeLng, scenarioParam);
      if (reqId === latestRequestId.current) {
        result.region_name = name;
        setPrediction(result);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
      }
    } catch (err: any) {
      if (reqId === latestRequestId.current) {
        console.error('Assessment failed for preset region:', err);
        setErrorMessage('Observation telemetry timed out or sensor unavailable.');
      }
    } finally {
      if (reqId === latestRequestId.current) {
        setIsLoading(false);
      }
    }
  };

  const handleMapClickPrediction = async (lat: number, lng: number, preloadedResult?: PredictionResponse) => {
    const safeLat = !isNaN(lat) ? lat : 25.5788;
    const safeLng = !isNaN(lng) ? lng : 91.8933;
    setSelectedCoords({ lat: safeLat, lng: safeLng });
    const locationName = `Location (${safeLat.toFixed(4)}° N, ${safeLng.toFixed(4)}° E)`;
    setSelectedRegionName(locationName);
    updateUrlCoords(safeLat, safeLng);

    // If result was already fetched (e.g. by map inspector), apply immediately
    if (preloadedResult) {
      preloadedResult.region_name = locationName;
      setPrediction(preloadedResult);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    const reqId = ++latestRequestId.current;

    try {
      const scenarioParam = demoMode ? activeScenario : undefined;
      const result = await runPrediction(safeLat, safeLng, scenarioParam);
      if (reqId === latestRequestId.current) {
        result.region_name = locationName;
        setPrediction(result);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
      }
    } catch (err: any) {
      if (reqId === latestRequestId.current) {
        console.error('Assessment failed on map click:', err);
        setErrorMessage('Observation request failed. Try another coordinate.');
      }
    } finally {
      if (reqId === latestRequestId.current) {
        setIsLoading(false);
      }
    }
  };

  const refreshAssessment = async () => {
    if (!selectedCoords) return;
    setIsLoading(true);
    setErrorMessage(null);
    const reqId = ++latestRequestId.current;

    try {
      const scenarioParam = demoMode ? activeScenario : undefined;
      const result = await runPrediction(selectedCoords.lat, selectedCoords.lng, scenarioParam);
      if (reqId === latestRequestId.current) {
        result.region_name = selectedRegionName;
        setPrediction(result);
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
      }
    } catch (err) {
      if (reqId === latestRequestId.current) {
        console.error('Refresh failed:', err);
        setErrorMessage('Sensor telemetry refresh failed.');
      }
    } finally {
      if (reqId === latestRequestId.current) {
        setIsLoading(false);
      }
    }
  };

  const toggleDemoMode = async () => {
    const nextMode = !demoMode;
    setDemoMode(nextMode);
    if (selectedCoords) {
      setIsLoading(true);
      const reqId = ++latestRequestId.current;
      try {
        const scenarioParam = nextMode ? activeScenario : undefined;
        const result = await runPrediction(selectedCoords.lat, selectedCoords.lng, scenarioParam);
        if (reqId === latestRequestId.current) {
          result.region_name = selectedRegionName;
          setPrediction(result);
          setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
        }
      } catch (err) {
        if (reqId === latestRequestId.current) {
          console.error('Demo mode switch re-prediction failed:', err);
        }
      } finally {
        if (reqId === latestRequestId.current) {
          setIsLoading(false);
        }
      }
    }
  };

  const selectScenario = async (scenario: string) => {
    setActiveScenario(scenario);
    if (selectedCoords) {
      setIsLoading(true);
      const reqId = ++latestRequestId.current;
      try {
        const result = await runPrediction(selectedCoords.lat, selectedCoords.lng, scenario);
        if (reqId === latestRequestId.current) {
          result.region_name = selectedRegionName;
          setPrediction(result);
          setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
        }
      } catch (err) {
        if (reqId === latestRequestId.current) {
          console.error('Scenario run failed:', err);
        }
      } finally {
        if (reqId === latestRequestId.current) {
          setIsLoading(false);
        }
      }
    }
  };

  const loadScenarioComparison = async () => {
    if (!selectedCoords) return;
    setScenarioComparison((prev) => ({ ...prev, isLoading: true }));
    try {
      const [base, scA, scB, scC] = await Promise.all([
        runPrediction(selectedCoords.lat, selectedCoords.lng),
        runPrediction(selectedCoords.lat, selectedCoords.lng, 'A'),
        runPrediction(selectedCoords.lat, selectedCoords.lng, 'B'),
        runPrediction(selectedCoords.lat, selectedCoords.lng, 'C')
      ]);
      setScenarioComparison({
        baseline: base,
        scenarioA: scA,
        scenarioB: scB,
        scenarioC: scC,
        isLoading: false
      });
    } catch (err) {
      console.error('Scenario comparison load failed:', err);
      setScenarioComparison((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const dismissError = () => setErrorMessage(null);

  return (
    <AppContext.Provider
      value={{
        selectedCoords,
        selectedRegionName,
        prediction,
        isLoading,
        lastUpdated,
        demoMode,
        activeScenario,
        modelInfo,
        backendStatus,
        historicalLandslides,
        historicalRadiusStats,
        riskGridData,
        riskGridAnalytics,
        riskGridLoading,
        scenarioComparison,
        errorMessage,
        selectPresetRegion,
        handleMapClickPrediction,
        refreshAssessment,
        toggleDemoMode,
        selectScenario,
        loadScenarioComparison,
        dismissError
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
