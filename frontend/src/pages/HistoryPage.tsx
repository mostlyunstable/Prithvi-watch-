import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, History, MapPin, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { haversineDistanceKm, formatHistoricalDate, safeToFixed } from '../utils/geoAnalytics';
import { Map } from '../components/Map';

export const HistoryPage: React.FC = () => {
  const {
    historicalLandslides,
    selectedCoords,
    selectPresetRegion,
    activeScenario,
    demoMode,
    handleMapClickPrediction
  } = useApp();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedTrigger, setSelectedTrigger] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Extract unique states, triggers, and years for dropdown filters
  const filterOptions = useMemo(() => {
    if (!historicalLandslides?.features) return { states: [], triggers: [], years: [] };
    const states = new Set<string>();
    const triggers = new Set<string>();
    const years = new Set<string>();

    historicalLandslides.features.forEach((f: any) => {
      const p = f.properties || {};
      if (p.state_name) states.add(p.state_name);
      if (p.trigger) triggers.add(p.trigger);
      const sanitized = formatHistoricalDate(p.event_date);
      if (sanitized !== 'Date unavailable') {
        const year = sanitized.split('-')[0];
        const yearNum = parseInt(year, 10);
        if (!isNaN(yearNum) && yearNum > 1970 && year.length === 4) {
          years.add(year);
        }
      }
    });

    return {
      states: Array.from(states).sort(),
      triggers: Array.from(triggers).sort(),
      years: Array.from(years).sort().reverse()
    };
  }, [historicalLandslides]);

  // Filtered and enriched landslide events with calculated distances
  const filteredEvents = useMemo(() => {
    if (!historicalLandslides?.features) return [];

    return historicalLandslides.features
      .map((f: any) => {
        const coords = f.geometry?.coordinates || [0, 0];
        const lng = Number(coords[0]) || 0;
        const lat = Number(coords[1]) || 0;
        const props = f.properties || {};

        let distKm = 0;
        if (selectedCoords && !isNaN(selectedCoords.lat) && !isNaN(selectedCoords.lng) && !isNaN(lat) && !isNaN(lng)) {
          distKm = haversineDistanceKm(selectedCoords.lat, selectedCoords.lng, lat, lng);
        }

        const date = formatHistoricalDate(props.event_date);

        return {
          id: props.event_id || `${lat}-${lng}`,
          lat,
          lng,
          state: props.state_name || 'North Eastern Region',
          date,
          trigger: props.trigger || 'Heavy Monsoon Rainfall',
          location: props.location_description || `${safeToFixed(lat, 3)}° N, ${safeToFixed(lng, 3)}° E`,
          distanceKm: distKm
        };
      })
      .filter((ev: any) => {
        if (selectedState !== 'ALL' && ev.state !== selectedState) return false;
        if (selectedTrigger !== 'ALL' && ev.trigger !== selectedTrigger) return false;
        if (selectedYear !== 'ALL' && !ev.date.includes(selectedYear)) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            ev.state.toLowerCase().includes(q) ||
            ev.location.toLowerCase().includes(q) ||
            ev.trigger.toLowerCase().includes(q) ||
            ev.date.includes(q)
          );
        }
        return true;
      })
      .sort((a: any, b: any) => {
        if (selectedCoords) return a.distanceKm - b.distanceKm;
        return b.date.localeCompare(a.date);
      });
  }, [historicalLandslides, selectedCoords, selectedState, selectedTrigger, selectedYear, searchQuery]);

  const handleSelectEvent = (lat: number, lng: number, placeName: string) => {
    selectPresetRegion(lat, lng, `Past Landslide: ${placeName}`);
  };

  const handleAssessLocation = (lat: number, lng: number, placeName: string) => {
    selectPresetRegion(lat, lng, `Past Landslide Area: ${placeName}`);
    navigate('/map');
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden min-h-0 min-w-0 bg-slate-950">
      {/* 1. LEFT: MAP VIEW OF HISTORICAL EVENTS (60% Desktop) */}
      <div className="flex-1 h-full relative min-h-0 min-w-0">
        <Map
          onPredictionResult={(result, lat, lng) => handleMapClickPrediction(lat, lng, result)}
          activeScenario={activeScenario}
          demoMode={demoMode}
          selectedCoords={selectedCoords}
        />

        {/* Floating Count Badge */}
        <div className="absolute top-4 left-4 z-20 bg-slate-900/95 backdrop-blur-sm border border-slate-700 px-3 py-1.5 rounded-lg shadow-xl text-xs font-mono text-slate-200">
          <span className="font-bold text-red-400">● 969 Verified Historical Landslides</span>
          <span className="text-[10px] text-slate-400 block font-sans">NASA Global Landslide Catalog (2007–Present)</span>
        </div>
      </div>

      {/* 2. RIGHT: EVENT EXPLORER & FILTERS (40% Desktop) */}
      <div className="w-full lg:w-[480px] bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-20 shadow-2xl overflow-hidden max-h-[50vh] lg:max-h-full">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[9px] font-mono uppercase font-bold text-red-400 block tracking-wider">
                HISTORICAL EVIDENCE
              </span>
              <h2 className="text-sm font-bold text-white">Past Landslides in North East India</h2>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {filteredEvents.length} Events
            </span>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
            {/* Search Input */}
            <div className="relative col-span-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search place, state, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 border border-slate-750 rounded-lg pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-slate-500"
              />
            </div>

            {/* State Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-750">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">All States</option>
                {filterOptions.states.map((st) => (
                  <option key={st} value={st} className="bg-slate-900">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Trigger Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-750">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedTrigger}
                onChange={(e) => setSelectedTrigger(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">All Triggers</option>
                {filterOptions.triggers.map((trig) => (
                  <option key={trig} value={trig} className="bg-slate-900">
                    {trig}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded border border-slate-750">
              <History className="w-3 h-3 text-slate-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none w-full cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">All Years</option>
                {filterOptions.years.map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-900">
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Event List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((ev: any) => (
              <div
                key={ev.id}
                onClick={() => handleSelectEvent(ev.lat, ev.lng, `${ev.state} (${ev.date})`)}
                className="p-3 bg-slate-950/60 hover:bg-slate-850/80 rounded-lg border border-slate-800/60 transition cursor-pointer space-y-1.5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-white text-xs">{ev.state}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{ev.location}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {ev.date}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] font-sans text-slate-400">
                  <span className="text-orange-400 truncate max-w-[200px]">{ev.trigger}</span>
                  {selectedCoords && (
                    <span className="font-mono text-slate-300 font-bold">
                      {safeToFixed(ev.distanceKm, 1, '0.0')} km away
                    </span>
                  )}
                </div>

                <div className="pt-1.5 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssessLocation(ev.lat, ev.lng, `${ev.state} (${ev.date})`);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-orange-600 text-slate-200 hover:text-white rounded text-[10px] font-bold font-mono transition flex items-center space-x-1 border border-slate-700"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Check Current Risk Here</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 font-sans text-xs">
              No historical landslide records match the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
