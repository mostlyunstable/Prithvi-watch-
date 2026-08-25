// Geodetic Distance and Spatial Risk Analytics Utilities

export interface HistoricalRadiusStats {
  within10km: number;
  within25km: number;
  within50km: number;
  nearestEvent: {
    distance_km: number;
    event_date: string;
    state_name: string;
    trigger: string;
    latitude: number;
    longitude: number;
  } | null;
  recentEventsInRadius: Array<{
    distance_km: number;
    event_date: string;
    state_name: string;
    trigger: string;
  }>;
}

export interface RiskGridAnalytics {
  totalCells: number;
  lowCount: number;
  lowPct: number;
  modCount: number;
  modPct: number;
  highCount: number;
  highPct: number;
  critCount: number;
  critPct: number;
  meanProbability: number;
  medianProbability: number;
  minProbability: number;
  maxProbability: number;
  topHotspots: Array<{
    id: string;
    lat: number;
    lng: number;
    probability: number;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    elevation?: number;
    slope?: number;
  }>;
}

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates adaptive resolution based on bounding box extent and zoom level.
 * Guarantees that estimated grid cells ((maxLon - minLon)/res * (maxLat - minLat)/res)
 * never exceeds 9,000 cells (preventing backend HTTP 400 rejection).
 */
export function computeAdaptiveResolution(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
  zoom: number
): number {
  const dLon = Math.max(0.01, Math.abs(maxLon - minLon));
  const dLat = Math.max(0.01, Math.abs(maxLat - minLat));

  // Zoom-adaptive base resolution
  let baseRes = 0.05;
  if (zoom < 6.5) {
    baseRes = 0.20;
  } else if (zoom < 7.5) {
    baseRes = 0.15;
  } else if (zoom < 8.5) {
    baseRes = 0.10;
  } else if (zoom < 10.0) {
    baseRes = 0.05;
  } else if (zoom < 12.0) {
    baseRes = 0.03;
  } else {
    baseRes = 0.02;
  }

  // Bounding box cell limit safety: (dLon / res) * (dLat / res) <= 9000
  const minResForCells = Math.sqrt((dLon * dLat) / 9000);
  let res = Math.max(baseRes, minResForCells);

  // Quantize upward to 2 decimal places to maintain cell safety
  res = Math.ceil(res * 100) / 100;

  // Clamp within backend-supported range [0.01, 0.5]
  res = Math.min(0.5, Math.max(0.01, res));

  // Final check: if ceil(dLon/res)*ceil(dLat/res) > 9000, adjust
  if (Math.ceil(dLon / res) * Math.ceil(dLat / res) > 9000) {
    res = Math.ceil(Math.sqrt((dLon * dLat) / 8500) * 100) / 100;
    res = Math.min(0.5, Math.max(0.01, res));
  }

  return res;
}


/**
 * Safely formats a number with fixed decimal places, guarding against NaN, null, and undefined.
 */
export function safeToFixed(
  val: number | string | null | undefined,
  digits: number = 4,
  fallback: string = '0.0000'
): string {
  if (val == null) return fallback;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num) || !isFinite(num)) return fallback;
  return num.toFixed(digits);
}

/**
 * Formats a coordinate pair into clean, safe text (e.g. "25.5788° N, 91.8933° E").
 */
export function formatCoordinatePair(
  lat: number | null | undefined,
  lng: number | null | undefined,
  digits: number = 4
): string {
  const safeLat = safeToFixed(lat, digits, '25.8000');
  const safeLng = safeToFixed(lng, digits, '92.8000');
  return `${safeLat}° N, ${safeLng}° E`;
}

/**
 * Formats a probability value [0.0, 1.0] into a safe percentage string (e.g. "74.2%").
 */
export function formatPercent(
  val: number | null | undefined,
  digits: number = 1,
  fallback: string = '0.0'
): string {
  if (val == null) return `${fallback}%`;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num) || !isFinite(num)) return `${fallback}%`;
  return `${(num * 100).toFixed(digits)}%`;
}

/**
 * Robust date sanitizer for historical landslide catalogs.
 * Strictly guarantees that no 1970/01/01 or Unix epoch dates are ever displayed.
 */
export function formatHistoricalDate(rawDate?: any): string {
  if (rawDate == null) return 'Date unavailable';
  const clean = String(rawDate).trim();
  if (clean === '') return 'Date unavailable';

  const lower = clean.toLowerCase();
  if (
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'nan' ||
    lower === 'none' ||
    lower === 'n/a' ||
    lower === '0' ||
    lower === 'invalid date' ||
    lower.includes('unknown') ||
    clean.startsWith('1970') ||
    clean.startsWith('1969')
  ) {
    return 'Date unavailable';
  }

  const datePart = clean.split(' ')[0].split('T')[0].replace(/\//g, '-');
  if (!datePart || datePart.startsWith('1970') || datePart.startsWith('1969')) {
    return 'Date unavailable';
  }

  // Verify year sanity
  const yearStr = datePart.split('-')[0];
  const yearNum = parseInt(yearStr, 10);
  if (isNaN(yearNum) || yearNum <= 1970 || yearNum < 1900 || yearNum > 2100) {
    return 'Date unavailable';
  }

  // Parse check
  const parsed = new Date(datePart);
  if (isNaN(parsed.getTime()) || parsed.getUTCFullYear() <= 1970) {
    return 'Date unavailable';
  }

  return datePart;
}

export function computeHistoricalContext(
  targetLat: number,
  targetLng: number,
  historicalGeoJSON: any
): HistoricalRadiusStats {
  if (!historicalGeoJSON || !historicalGeoJSON.features) {
    return {
      within10km: 0,
      within25km: 0,
      within50km: 0,
      nearestEvent: null,
      recentEventsInRadius: []
    };
  }

  let c10 = 0;
  let c25 = 0;
  let c50 = 0;
  let nearest: any = null;
  let minDistance = Infinity;
  const inRadiusList: any[] = [];

  for (const f of historicalGeoJSON.features) {
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lon, lat] = coords;
    const d = haversineDistanceKm(targetLat, targetLng, lat, lon);

    if (d <= 10) c10++;
    if (d <= 25) c25++;
    if (d <= 50) {
      c50++;
      inRadiusList.push({
        distance_km: parseFloat(d.toFixed(1)),
        event_date: formatHistoricalDate(f.properties?.event_date),
        state_name: f.properties?.state_name || 'NER Region',
        trigger: f.properties?.trigger || 'Monsoon Rainfall'
      });
    }

    if (d < minDistance) {
      minDistance = d;
      nearest = {
        distance_km: parseFloat(d.toFixed(1)),
        event_date: formatHistoricalDate(f.properties?.event_date),
        state_name: f.properties?.state_name || 'NER Region',
        trigger: f.properties?.trigger || 'Monsoon Rainfall',
        latitude: lat,
        longitude: lon
      };
    }
  }

  inRadiusList.sort((a, b) => a.distance_km - b.distance_km);

  return {
    within10km: c10,
    within25km: c25,
    within50km: c50,
    nearestEvent: nearest,
    recentEventsInRadius: inRadiusList.slice(0, 5)
  };
}

export function getRiskLevel(input: any): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  if (typeof input === 'string') {
    const upper = input.toUpperCase();
    if (['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(upper)) {
      return upper as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    }
  }
  if (input && typeof input === 'object') {
    if (input.risk_level) {
      const upper = String(input.risk_level).toUpperCase();
      if (['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].includes(upper)) {
        return upper as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
      }
    }
    const prob = input.risk_probability ?? input.probability ?? input.landslide_probability ?? 0;
    if (prob >= 0.8) return 'CRITICAL';
    if (prob >= 0.6) return 'HIGH';
    if (prob >= 0.4) return 'MODERATE';
    return 'LOW';
  }
  if (typeof input === 'number') {
    if (input >= 0.8) return 'CRITICAL';
    if (input >= 0.6) return 'HIGH';
    if (input >= 0.4) return 'MODERATE';
    return 'LOW';
  }
  return 'LOW';
}

export function computeRiskGridAnalytics(riskGridGeoJSON: any): RiskGridAnalytics | null {
  if (!riskGridGeoJSON || !riskGridGeoJSON.features || riskGridGeoJSON.features.length === 0) {
    return null;
  }

  const features = riskGridGeoJSON.features;
  const total = features.length;
  let low = 0;
  let mod = 0;
  let high = 0;
  let crit = 0;
  let sumProb = 0;
  const probs: number[] = [];
  const cellList: any[] = [];

  features.forEach((f: any, idx: number) => {
    const p = f.properties || {};
    const prob = p.risk_probability ?? p.probability ?? p.landslide_probability ?? 0;
    const level = getRiskLevel(p);

    
    // Compute cell center
    let centerLat = 0;
    let centerLng = 0;
    if (f.geometry?.type === 'Polygon' && f.geometry?.coordinates?.[0]) {
      const ring = f.geometry.coordinates[0];
      const lats = ring.map((c: number[]) => c[1]);
      const lngs = ring.map((c: number[]) => c[0]);
      centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    } else if (f.geometry?.coordinates) {
      centerLng = f.geometry.coordinates[0];
      centerLat = f.geometry.coordinates[1];
    }

    if (level === 'CRITICAL') crit++;
    else if (level === 'HIGH') high++;
    else if (level === 'MODERATE') mod++;
    else low++;

    sumProb += prob;
    probs.push(prob);

    cellList.push({
      id: `cell-${idx}`,
      lat: parseFloat(centerLat.toFixed(4)),
      lng: parseFloat(centerLng.toFixed(4)),
      probability: prob,
      riskLevel: level,
      elevation: p.elevation,
      slope: p.slope
    });
  });

  probs.sort((a, b) => a - b);
  cellList.sort((a, b) => b.probability - a.probability);

  const median = probs.length % 2 === 0
    ? (probs[probs.length / 2 - 1] + probs[probs.length / 2]) / 2
    : probs[Math.floor(probs.length / 2)];

  return {
    totalCells: total,
    lowCount: low,
    lowPct: parseFloat(((low / total) * 100).toFixed(1)),
    modCount: mod,
    modPct: parseFloat(((mod / total) * 100).toFixed(1)),
    highCount: high,
    highPct: parseFloat(((high / total) * 100).toFixed(1)),
    critCount: crit,
    critPct: parseFloat(((crit / total) * 100).toFixed(1)),
    meanProbability: parseFloat(((sumProb / total) * 100).toFixed(1)),
    medianProbability: parseFloat((median * 100).toFixed(1)),
    minProbability: parseFloat((probs[0] * 100).toFixed(1)),
    maxProbability: parseFloat((probs[probs.length - 1] * 100).toFixed(1)),
    topHotspots: cellList.slice(0, 10)
  };
}
