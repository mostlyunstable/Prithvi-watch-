import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Home, Layers, Map as MapIcon, ChevronDown, AlertTriangle } from 'lucide-react';
import { fetchRegions, fetchHistoricalLandslides, runPrediction, fetchRiskMap } from '../services/api';
import { computeAdaptiveResolution, safeToFixed } from '../utils/geoAnalytics';

interface MapProps {
  onPredictionResult: (result: any, lat: number, lng: number) => void;
  activeScenario?: string;
  demoMode: boolean;
  selectedCoords: { lat: number; lng: number } | null;
}

// 8 NER State Centroids for Regional Reference
const NER_STATES = [
  { name: 'MEGHALAYA', lat: 25.57, lng: 91.88, code: 'ML' },
  { name: 'SIKKIM', lat: 27.53, lng: 88.51, code: 'SK' },
  { name: 'ASSAM', lat: 26.20, lng: 92.93, code: 'AS' },
  { name: 'ARUNACHAL PRADESH', lat: 28.21, lng: 94.72, code: 'AR' },
  { name: 'NAGALAND', lat: 26.15, lng: 94.56, code: 'NL' },
  { name: 'MANIPUR', lat: 24.81, lng: 93.93, code: 'MN' },
  { name: 'MIZORAM', lat: 23.16, lng: 92.83, code: 'MZ' },
  { name: 'TRIPURA', lat: 23.83, lng: 91.90, code: 'TR' },
];

// Key NER Strategic Cities & Hubs for Navigation
const NER_CITIES = [
  { name: 'Guwahati', lat: 26.1445, lng: 91.7362, state: 'Assam', rank: 'major' },
  { name: 'Shillong', lat: 25.5788, lng: 91.8933, state: 'Meghalaya', rank: 'capital' },
  { name: 'Gangtok', lat: 27.3389, lng: 88.6065, state: 'Sikkim', rank: 'capital' },
  { name: 'Itanagar', lat: 27.0844, lng: 93.6053, state: 'Arunachal Pradesh', rank: 'capital' },
  { name: 'Aizawl', lat: 23.7271, lng: 92.7176, state: 'Mizoram', rank: 'capital' },
  { name: 'Kohima', lat: 25.6751, lng: 94.1086, state: 'Nagaland', rank: 'capital' },
  { name: 'Imphal', lat: 24.8170, lng: 93.9368, state: 'Manipur', rank: 'capital' },
  { name: 'Agartala', lat: 23.8315, lng: 91.2868, state: 'Tripura', rank: 'capital' },
  { name: 'Cherrapunji', lat: 25.2700, lng: 91.7300, state: 'Meghalaya', rank: 'town' },
  { name: 'Tawang', lat: 27.5860, lng: 91.8650, state: 'Arunachal Pradesh', rank: 'town' },
  { name: 'Mangan', lat: 27.5050, lng: 88.5300, state: 'Sikkim', rank: 'town' },
];

const citiesGeoJSON = {
  type: 'FeatureCollection' as const,
  features: NER_CITIES.map((c) => ({
    type: 'Feature' as const,
    properties: { name: c.name, state: c.state, rank: c.rank },
    geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] }
  }))
};

// High-Performance Cartographic Basemap Styles with Instant Tile Rendering (Zero Progressive Fade)
const BASEMAP_STYLES: Record<string, maplibregl.StyleSpecification> = {
  standard: {
    version: 8,
    sources: {
      'carto-voyager': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }
    },
    layers: [
      {
        id: 'carto-voyager-base',
        type: 'raster',
        source: 'carto-voyager',
        minzoom: 0,
        maxzoom: 20,
        paint: {
          'raster-fade-duration': 0,
          'raster-resampling': 'linear'
        }
      }
    ]
  },
  topo: {
    version: 8,
    sources: {
      'esri-topo': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
        maxzoom: 19
      }
    },
    layers: [
      {
        id: 'esri-topo-base',
        type: 'raster',
        source: 'esri-topo',
        minzoom: 0,
        maxzoom: 19,
        paint: {
          'raster-fade-duration': 0,
          'raster-resampling': 'linear',
          'raster-contrast': 0.05,
          'raster-saturation': 0.05
        }
      }
    ]
  },
  dark: {
    version: 8,
    sources: {
      'carto-dark': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }
    },
    layers: [
      {
        id: 'carto-dark-base',
        type: 'raster',
        source: 'carto-dark',
        minzoom: 0,
        maxzoom: 20,
        paint: {
          'raster-fade-duration': 0,
          'raster-resampling': 'linear'
        }
      }
    ]
  }
};

// Global in-memory GeoJSON cache across component lifecycles
let _globalBoundariesCache: any = null;
let _globalHistoricalCache: any = null;
const _globalRiskGridCache = new globalThis.Map<string, any>();

export const Map: React.FC<MapProps> = ({
  onPredictionResult,
  activeScenario,
  demoMode,
  selectedCoords
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const stateLabelMarkers = useRef<maplibregl.Marker[]>([]);
  const hoverPopup = useRef<maplibregl.Popup | null>(null);
  const lastRiskMapDataRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null);

  // Direct DOM refs for 60fps performance without React re-rendering on mousemove/zoom
  const coordsDisplayRef = useRef<HTMLSpanElement>(null);
  const zoomDisplayRef = useRef<HTMLSpanElement>(null);

  // Basemap & Layer Toggles (Terrain is the default visual foundation)
  const [basemap, setBasemap] = useState<'standard' | 'topo' | 'dark'>('topo');
  const [showBoundaries, setShowBoundaries] = useState<boolean>(true);
  const [showStateLabels, setShowStateLabels] = useState<boolean>(true);
  const [showRiskMap, setShowRiskMap] = useState<boolean>(true);
  const [showHistorical, setShowHistorical] = useState<boolean>(true);
  const [riskMapLoading, setRiskMapLoading] = useState<boolean>(false);
  const [isAssessing, setIsAssessing] = useState<boolean>(false);
  const [webGlError, setWebGlError] = useState<string | null>(null);

  // Compact Popover Controls
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState<boolean>(false);

  // Synchronized state refs to eliminate stale closures
  const demoModeRef = useRef(demoMode);
  const activeScenarioRef = useRef(activeScenario);
  const showRiskMapRef = useRef(showRiskMap);
  const showBoundariesRef = useRef(showBoundaries);
  const showStateLabelsRef = useRef(showStateLabels);
  const showHistoricalRef = useRef(showHistorical);

  useEffect(() => {
    demoModeRef.current = demoMode;
  }, [demoMode]);

  useEffect(() => {
    activeScenarioRef.current = activeScenario;
  }, [activeScenario]);

  useEffect(() => {
    showRiskMapRef.current = showRiskMap;
  }, [showRiskMap]);

  useEffect(() => {
    showBoundariesRef.current = showBoundaries;
  }, [showBoundaries]);

  useEffect(() => {
    showStateLabelsRef.current = showStateLabels;
  }, [showStateLabels]);

  useEffect(() => {
    showHistoricalRef.current = showHistorical;
  }, [showHistorical]);

  // Initial Center on Entire NER Region
  const initialLng = 92.8;
  const initialLat = 25.8;
  const initialZoom = 6.4;

  // Clean Drop Pin SVG
  const createGoogleMapsPinElement = useCallback(() => {
    const el = document.createElement('div');
    el.className = 'relative flex items-center justify-center cursor-pointer';
    el.innerHTML = `
      <div class="relative -top-6 flex flex-col items-center">
        <svg width="28" height="38" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-md">
          <path d="M16 0C7.16344 0 0 7.16344 0 16C0 27.5 16 42 16 42C16 42 32 27.5 32 16C32 7.16344 24.8366 0 16 0Z" fill="#EA4335"/>
          <path d="M16 1C7.71573 1 1 7.71573 1 16C1 26.8 15.6 40.5 16 40.9C16.4 40.5 31 26.8 31 16C31 7.71573 24.2843 1 16 1Z" stroke="#B31412" stroke-width="1.5"/>
          <circle cx="16" cy="15" r="5" fill="#FFFFFF"/>
        </svg>
        <div class="w-3 h-1 bg-slate-900/30 rounded-full blur-[1px] -mt-1"></div>
      </div>
    `;
    return el;
  }, []);

  // Home View Reset
  const handleResetHomeView = () => {
    if (!map.current) return;
    map.current.flyTo({
      center: [initialLng, initialLat],
      zoom: initialZoom,
      pitch: 0,
      bearing: 0,
      essential: true
    });
  };

  // Fly to selected coords
  useEffect(() => {
    if (selectedCoords && map.current) {
      map.current.flyTo({
        center: [selectedCoords.lng, selectedCoords.lat],
        zoom: Math.max(map.current.getZoom(), 8.5),
        speed: 1.2,
        curve: 1.4,
        essential: true
      });

      if (!marker.current) {
        marker.current = new maplibregl.Marker({
          element: createGoogleMapsPinElement(),
          anchor: 'bottom'
        })
          .setLngLat([selectedCoords.lng, selectedCoords.lat])
          .addTo(map.current);
      } else {
        marker.current.setLngLat([selectedCoords.lng, selectedCoords.lat]);
      }
    }
  }, [selectedCoords, createGoogleMapsPinElement]);

  // Click & Assess Function
  const handleInspectCoordinates = useCallback(async (lat: number, lng: number) => {
    if (!map.current) return;

    if (!marker.current) {
      marker.current = new maplibregl.Marker({
        element: createGoogleMapsPinElement(),
        anchor: 'bottom'
      })
        .setLngLat([lng, lat])
        .addTo(map.current);
    } else {
      marker.current.setLngLat([lng, lat]);
    }

    setIsAssessing(true);
    try {
      const scenarioParam = demoModeRef.current ? activeScenarioRef.current || 'A' : undefined;
      const res = await runPrediction(lat, lng, scenarioParam);
      onPredictionResult(res, lat, lng);
    } catch (err) {
      console.error('Inference trigger failed:', err);
    } finally {
      setIsAssessing(false);
    }
  }, [onPredictionResult, createGoogleMapsPinElement]);

  // Hover Popups on Risk Grid
  const handleRiskMouseEnter = useCallback((e: maplibregl.MapLayerMouseEvent) => {
    if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    if (!e.features || !e.features[0]) return;
    const props = e.features[0].properties || {};
    const probVal = props.risk_probability ?? props.probability ?? props.landslide_probability ?? 0;
    const probPct = (probVal * 100).toFixed(1);
    const riskLevel = props.risk_level ?? (probVal >= 0.8 ? 'CRITICAL' : probVal >= 0.6 ? 'HIGH' : probVal >= 0.4 ? 'MODERATE' : 'LOW');

    if (hoverPopup.current) hoverPopup.current.remove();
    hoverPopup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10
    })
      .setLngLat(e.lngLat)
      .setHTML(
        `<div style="background-color: #0f172a; color: #f8fafc; padding: 6px 10px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; border-radius: 6px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); border: 1px solid #334155;">
          <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">ESTIMATED RISK</div>
          <div style="font-size: 13px; font-weight: 800; color: ${props.fill ?? '#ea580c'}; margin-top: 1px;">${probPct}% · ${riskLevel}</div>
          <div style="font-size: 10px; color: #cbd5e1; margin-top: 3px;">Click to check this location</div>
        </div>`
      );
    if (map.current) {
      hoverPopup.current.addTo(map.current);
    }
  }, []);

  const handleRiskMouseLeave = useCallback(() => {
    if (map.current) map.current.getCanvas().style.cursor = '';
    if (hoverPopup.current) hoverPopup.current.remove();
  }, []);

  // Render Spatial Risk Map Layers with strictly controlled layer ordering
  const renderSpatialRiskLayers = useCallback((data: any) => {
    if (!map.current || !map.current.isStyleLoaded() || !data?.features) return;

    const beforeId = map.current.getLayer('historical-landslides-circles')
      ? 'historical-landslides-circles'
      : undefined;

    if (!map.current.getSource('spatial-risk-map')) {
      map.current.addSource('spatial-risk-map', { type: 'geojson', data });

      map.current.addLayer(
        {
          id: 'spatial-risk-layer',
          type: 'fill',
          source: 'spatial-risk-map',
          layout: { visibility: showRiskMapRef.current ? 'visible' : 'none' },
          paint: {
            'fill-color': ['get', 'fill'],
            'fill-opacity': 0.48
          }
        },
        beforeId
      );

      map.current.addLayer(
        {
          id: 'spatial-risk-outline',
          type: 'line',
          source: 'spatial-risk-map',
          layout: { visibility: showRiskMapRef.current ? 'visible' : 'none' },
          paint: {
            'line-color': ['get', 'fill'],
            'line-width': 0.5,
            'line-opacity': 0.35
          }
        },
        beforeId
      );

      map.current.off('mouseenter', 'spatial-risk-layer', handleRiskMouseEnter);
      map.current.off('mouseleave', 'spatial-risk-layer', handleRiskMouseLeave);
      map.current.on('mouseenter', 'spatial-risk-layer', handleRiskMouseEnter);
      map.current.on('mouseleave', 'spatial-risk-layer', handleRiskMouseLeave);
    } else {
      const src = map.current.getSource('spatial-risk-map') as maplibregl.GeoJSONSource;
      src.setData(data);

      if (beforeId && map.current.getLayer('spatial-risk-layer')) {
        try {
          map.current.moveLayer('spatial-risk-layer', beforeId);
          map.current.moveLayer('spatial-risk-outline', beforeId);
        } catch {}
      }
    }
  }, [handleRiskMouseEnter, handleRiskMouseLeave]);

  // Fetch Spatial Risk Grid with Zoom-Adaptive Resolution, Caching & Debouncing
  const fetchRiskMapData = useCallback(async (immediate: boolean = false) => {
    if (!map.current) return;
    const b = map.current.getBounds();
    if (!b) return;

    const zoom = map.current.getZoom();
    const west = b.getWest();
    const south = b.getSouth();
    const east = b.getEast();
    const north = b.getNorth();
    const resolution = computeAdaptiveResolution(west, south, east, north, zoom);

    // Quantized cache key
    const cacheKey = `${west.toFixed(2)},${south.toFixed(2)},${east.toFixed(2)},${north.toFixed(2)},${resolution.toFixed(3)}`;

    // If already in spatial cache, render instantly with zero network delay
    if (_globalRiskGridCache.has(cacheKey)) {
      const cachedData = _globalRiskGridCache.get(cacheKey);
      lastRiskMapDataRef.current = cachedData;
      if (map.current && map.current.isStyleLoaded()) {
        renderSpatialRiskLayers(cachedData);
      }
      return;
    }

    const executeFetch = async () => {
      if (!map.current) return;
      setRiskMapLoading(true);
      try {
        const data = await fetchRiskMap(west, south, east, north, resolution);
        if (data?.features) {
          _globalRiskGridCache.set(cacheKey, data);
          // Limit memory cache size
          if (_globalRiskGridCache.size > 40) {
            const firstKey = _globalRiskGridCache.keys().next().value;
            if (firstKey) _globalRiskGridCache.delete(firstKey);
          }

          lastRiskMapDataRef.current = data;
          if (map.current && map.current.isStyleLoaded()) {
            renderSpatialRiskLayers(data);
          }
        }
      } catch (e) {
        console.error('Failed to fetch spatial risk grid:', e);
      } finally {
        setRiskMapLoading(false);
      }
    };

    if (immediate) {
      executeFetch();
    } else {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(executeFetch, 250);
    }
  }, [renderSpatialRiskLayers]);

  // Add Operational GIS Layers with In-Memory Caching
  const addOperationalGISLayers = useCallback(async () => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // 1. NER State Boundaries (In-Memory Cached)
    try {
      if (!_globalBoundariesCache) {
        _globalBoundariesCache = await fetchRegions();
      }
      const boundariesData = _globalBoundariesCache;
      if (map.current && boundariesData?.features && !map.current.getSource('ner-boundaries')) {
        map.current.addSource('ner-boundaries', { type: 'geojson', data: boundariesData });

        map.current.addLayer({
          id: 'ner-boundaries-fill',
          type: 'fill',
          source: 'ner-boundaries',
          layout: { visibility: showBoundariesRef.current ? 'visible' : 'none' },
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.04 }
        });

        map.current.addLayer({
          id: 'ner-boundaries-line',
          type: 'line',
          source: 'ner-boundaries',
          layout: { visibility: showBoundariesRef.current ? 'visible' : 'none' },
          paint: { 'line-color': '#2563eb', 'line-width': 1.5, 'line-opacity': 0.7 }
        });
      }
    } catch (e) {
      console.warn('Boundaries fetch error:', e);
    }

    // 2. Historical Landslides (In-Memory Cached)
    try {
      if (!_globalHistoricalCache) {
        _globalHistoricalCache = await fetchHistoricalLandslides();
      }
      const historicalData = _globalHistoricalCache;
      if (map.current && historicalData?.features && !map.current.getSource('historical-landslides')) {
        map.current.addSource('historical-landslides', {
          type: 'geojson',
          data: historicalData,
          cluster: false
        });

        map.current.addLayer({
          id: 'historical-landslides-circles',
          type: 'circle',
          source: 'historical-landslides',
          layout: { visibility: showHistoricalRef.current ? 'visible' : 'none' },
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 2.5, 8, 4.5, 12, 7.5],
            'circle-color': '#dc2626',
            'circle-opacity': 0.85,
            'circle-stroke-width': 1.2,
            'circle-stroke-color': '#ffffff'
          }
        });

        map.current.on('click', 'historical-landslides-circles', (e) => {
          if (!e.features || !e.features[0]) return;
          const f = e.features[0];
          const coords = (f.geometry as any).coordinates.slice();
          if (coords && coords.length >= 2) {
            const lng = Number(coords[0]);
            const lat = Number(coords[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              if (e.originalEvent) {
                (e.originalEvent as any)._landslideMarkerHandled = true;
              }
              handleInspectCoordinates(lat, lng);
            }
          }
        });

        map.current.on('mouseenter', 'historical-landslides-circles', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'historical-landslides-circles', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });

        // Ensure spatial risk layer stays beneath historical landslides
        if (map.current.getLayer('spatial-risk-layer')) {
          try {
            map.current.moveLayer('spatial-risk-layer', 'historical-landslides-circles');
            map.current.moveLayer('spatial-risk-outline', 'historical-landslides-circles');
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Historical landslides fetch error:', e);
    }

    // 3. City Labels
    if (map.current && !map.current.getSource('ner-cities')) {
      map.current.addSource('ner-cities', { type: 'geojson', data: citiesGeoJSON });

      map.current.addLayer({
        id: 'ner-cities-points',
        type: 'circle',
        source: 'ner-cities',
        layout: { visibility: showStateLabelsRef.current ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 9, 4.5],
          'circle-color': '#1e293b',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5
        }
      });
    }

    // 4. Spatial State Label Markers
    stateLabelMarkers.current.forEach((m) => m.remove());
    stateLabelMarkers.current = [];

    if (showStateLabelsRef.current && map.current) {
      NER_STATES.forEach((st) => {
        const el = document.createElement('div');
        el.className = 'font-sans font-black text-[10px] tracking-widest text-slate-800 uppercase px-1.5 py-0.5 rounded bg-white/75 backdrop-blur-[1px] border border-slate-300 shadow-sm pointer-events-none select-none opacity-80';
        el.innerText = st.name;
        const m = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([st.lng, st.lat])
          .addTo(map.current!);
        stateLabelMarkers.current.push(m);
      });
    }
  }, [handleInspectCoordinates]);

  // Master Style Load Handler ensuring persistence across basemap changes
  const handleStyleLoad = useCallback(async () => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    await addOperationalGISLayers();

    if (lastRiskMapDataRef.current && showRiskMapRef.current) {
      renderSpatialRiskLayers(lastRiskMapDataRef.current);
    }

    if (showRiskMapRef.current) {
      fetchRiskMapData(true);
    }
  }, [addOperationalGISLayers, renderSpatialRiskLayers, fetchRiskMapData]);

  const handleStyleLoadRef = useRef(handleStyleLoad);
  useEffect(() => {
    handleStyleLoadRef.current = handleStyleLoad;
  }, [handleStyleLoad]);

  // Initialize MapLibre Canvas with Try-Catch WebGL Shielding
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    try {
      const initialStyle = BASEMAP_STYLES[basemap] || BASEMAP_STYLES.standard;

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: initialStyle,
        center: [initialLng, initialLat],
        zoom: initialZoom,
        minZoom: 5.0,
        maxZoom: 18.0,
        attributionControl: false,
        fadeDuration: 0
      });

      map.current.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');
      map.current.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

      // Direct DOM update on mousemove without React re-render overhead
      map.current.on('mousemove', (e) => {
        if (coordsDisplayRef.current) {
          const lat = e.lngLat.lat;
          const lng = e.lngLat.lng;
          coordsDisplayRef.current.textContent = `${safeToFixed(lat, 4, '25.8000')}° N, ${safeToFixed(lng, 4, '92.8000')}° E`;
        }
      });

      // Direct DOM update on zoom without React re-render overhead
      map.current.on('zoom', () => {
        if (zoomDisplayRef.current && map.current) {
          zoomDisplayRef.current.textContent = `ZOOM ${map.current.getZoom().toFixed(1)}x`;
        }
      });

      map.current.on('click', (e) => {
        if ((e.originalEvent as any)?._landslideMarkerHandled) return;
        const lat = e.lngLat.lat;
        const lng = e.lngLat.lng;
        if (!isNaN(lat) && !isNaN(lng)) {
          handleInspectCoordinates(lat, lng);
        }
      });

      map.current.on('style.load', () => {
        handleStyleLoadRef.current();
      });
    } catch (err: any) {
      console.error('WebGL initialization warning in MapLibre:', err);
      setWebGlError(err?.message || 'WebGL hardware acceleration is unavailable in this environment.');
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      stateLabelMarkers.current.forEach((m) => m.remove());
      stateLabelMarkers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update Basemap Style
  useEffect(() => {
    if (!map.current) return;
    const targetStyle = BASEMAP_STYLES[basemap] || BASEMAP_STYLES.standard;
    map.current.setStyle(targetStyle);
  }, [basemap]);

  // Dynamic Layer Visibility Handlers
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const vis = showRiskMap ? 'visible' : 'none';
    if (map.current.getLayer('spatial-risk-layer')) {
      map.current.setLayoutProperty('spatial-risk-layer', 'visibility', vis);
    }
    if (map.current.getLayer('spatial-risk-outline')) {
      map.current.setLayoutProperty('spatial-risk-outline', 'visibility', vis);
    }
    if (showRiskMap && !map.current.getSource('spatial-risk-map')) {
      fetchRiskMapData(true);
    }
  }, [showRiskMap, fetchRiskMapData]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const vis = showBoundaries ? 'visible' : 'none';
    if (map.current.getLayer('ner-boundaries-fill')) {
      map.current.setLayoutProperty('ner-boundaries-fill', 'visibility', vis);
    }
    if (map.current.getLayer('ner-boundaries-line')) {
      map.current.setLayoutProperty('ner-boundaries-line', 'visibility', vis);
    }
  }, [showBoundaries]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const vis = showHistorical ? 'visible' : 'none';
    if (map.current.getLayer('historical-landslides-circles')) {
      map.current.setLayoutProperty('historical-landslides-circles', 'visibility', vis);
    }
  }, [showHistorical]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const vis = showStateLabels ? 'visible' : 'none';
    if (map.current.getLayer('ner-cities-points')) {
      map.current.setLayoutProperty('ner-cities-points', 'visibility', vis);
    }
    stateLabelMarkers.current.forEach((m) => {
      const el = m.getElement();
      if (el) el.style.display = showStateLabels ? 'block' : 'none';
    });
  }, [showStateLabels]);

  // Viewport Movement Handler for Risk Grid Updates with 250ms Debounce
  useEffect(() => {
    if (!map.current) return;

    const onMoveEnd = () => {
      if (showRiskMapRef.current) {
        fetchRiskMapData(false);
      }
    };

    map.current.on('moveend', onMoveEnd);
    return () => {
      if (map.current) {
        map.current.off('moveend', onMoveEnd);
      }
    };
  }, [fetchRiskMapData]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950 flex-1 min-h-0 min-w-0 select-none">
      {/* MapLibre Canvas */}
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
        style={{ width: '100%', height: '100%', minHeight: '100%', position: 'absolute', top: 0, left: 0 }}
      />

      {/* WebGL Fallback Banner if GPU is unavailable */}
      {webGlError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-30 p-6">
          <div className="max-w-md bg-slate-900 border border-slate-800 p-5 rounded-lg text-center space-y-3 shadow-2xl">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">WebGL2 Required</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Interactive 3D geospatial map rendering requires WebGL2 hardware acceleration. Please ensure hardware acceleration is enabled in your browser settings.
            </p>
            <div className="text-[10px] font-mono text-slate-500 bg-slate-950 p-2 rounded border border-slate-850 truncate">
              {webGlError}
            </div>
          </div>
        </div>
      )}

      {/* Top Left: North Arrow & GIS Coordinates HUD (Direct DOM Refs for 60 FPS performance) */}
      <div className="absolute top-4 left-14 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-md shadow-lg text-[11px] font-sans text-slate-300 flex items-center space-x-2.5">
        <span className="text-red-500 font-bold text-xs" title="Grid North">▲ N</span>
        <span className="text-slate-700">|</span>
        <span ref={coordsDisplayRef} className="font-semibold text-white font-mono">
          {selectedCoords
            ? `${safeToFixed(selectedCoords.lat, 4, '25.8000')}° N, ${safeToFixed(selectedCoords.lng, 4, '92.8000')}° E`
            : '25.8000° N, 92.8000° E'}
        </span>
        <span className="text-slate-700">|</span>
        <span ref={zoomDisplayRef} className="text-slate-400 text-[10px] font-mono">ZOOM 6.4x</span>
        {isAssessing && (
          <>
            <span className="text-slate-700">|</span>
            <span className="text-orange-400 text-[10px] font-bold animate-pulse">CHECKING LOCATION...</span>
          </>
        )}
      </div>

      {/* Home / Reset View Button */}
      <button
        onClick={handleResetHomeView}
        className="absolute top-24 left-2.5 z-10 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 p-1.5 rounded-md shadow-lg transition flex items-center justify-center w-7 h-7"
        title="Reset to Full NER Regional Overview"
      >
        <Home className="w-3.5 h-3.5" />
      </button>

      {/* Top Right: Compact Dropdown Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        {/* Style Selector Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setIsStyleMenuOpen(!isStyleMenuOpen);
              setIsLayerMenuOpen(false);
            }}
            className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-md shadow-lg text-xs font-medium flex items-center space-x-1.5 transition"
          >
            <MapIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>Style</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isStyleMenuOpen && (
            <div className="absolute right-0 mt-1 w-32 bg-slate-900 border border-slate-800 rounded-md shadow-2xl p-1 z-30 space-y-0.5 text-xs font-medium">
              <button
                onClick={() => {
                  setBasemap('standard');
                  setIsStyleMenuOpen(false);
                }}
                className={`w-full text-left px-2 py-1 rounded transition ${
                  basemap === 'standard' ? 'bg-slate-800 text-white font-bold' : 'text-slate-300 hover:bg-slate-850'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => {
                  setBasemap('topo');
                  setIsStyleMenuOpen(false);
                }}
                className={`w-full text-left px-2 py-1 rounded transition ${
                  basemap === 'topo' ? 'bg-slate-800 text-white font-bold' : 'text-slate-300 hover:bg-slate-850'
                }`}
              >
                Terrain
              </button>
              <button
                onClick={() => {
                  setBasemap('dark');
                  setIsStyleMenuOpen(false);
                }}
                className={`w-full text-left px-2 py-1 rounded transition ${
                  basemap === 'dark' ? 'bg-slate-800 text-white font-bold' : 'text-slate-300 hover:bg-slate-850'
                }`}
              >
                Dark
              </button>
            </div>
          )}
        </div>

        {/* Layers Selector Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setIsLayerMenuOpen(!isLayerMenuOpen);
              setIsStyleMenuOpen(false);
            }}
            className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-800 text-slate-200 px-2.5 py-1.5 rounded-md shadow-lg text-xs font-medium flex items-center space-x-1.5 transition"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Layers</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-slate-900 border border-slate-800 rounded-md shadow-2xl p-2.5 z-30 space-y-2 text-xs text-slate-300">
              <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block border-b border-slate-800 pb-1">
                Map Layers
              </span>
              <label className="flex items-center space-x-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showRiskMap}
                  onChange={(e) => setShowRiskMap(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
                />
                <span className="text-[11px]">Landslide Risk</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showHistorical}
                  onChange={(e) => setShowHistorical(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0"
                />
                <span className="text-[11px]">Past Landslides (969 pts)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showBoundaries}
                  onChange={(e) => setShowBoundaries(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-slate-600 focus:ring-0"
                />
                <span className="text-[11px]">State Boundaries</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer hover:text-white">
                <input
                  type="checkbox"
                  checked={showStateLabels}
                  onChange={(e) => setShowStateLabels(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-slate-600 focus:ring-0"
                />
                <span className="text-[11px]">City &amp; State Labels</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Floating Compact Map Legend (Bottom Left) */}
      <div className="absolute bottom-5 left-5 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-md shadow-xl text-[10px] text-slate-300 space-y-1.5 max-w-[200px]">
        <div className="flex justify-between items-center border-b border-slate-800 pb-1">
          <span className="font-bold uppercase tracking-wider text-slate-400 text-[9px]">
            LANDSLIDE RISK
          </span>
          {riskMapLoading && <span className="text-[8px] text-orange-400 font-mono">SYNCING</span>}
        </div>

        <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e] opacity-80" />
            <span>Low</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#eab308] opacity-80" />
            <span>Moderate</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#f97316] opacity-80" />
            <span>High</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444] opacity-80" />
            <span>Critical</span>
          </div>
        </div>

        <div className="pt-1 border-t border-slate-800 space-y-1 text-[9px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 ring-1 ring-white" />
            <span>Past Landslide (969)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 border border-white" />
            <span>Selected Place Pin</span>
          </div>
        </div>
      </div>
    </div>
  );
};
