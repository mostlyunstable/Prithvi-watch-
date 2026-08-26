/**
 * PRITHVI WATCH — i18n String Dictionary
 * English (en) and Hindi (hi) UI strings.
 *
 * Rules:
 * - Numeric values, coordinates, and units are NOT translated.
 * - API identifiers, model names, and scientific terms are NOT translated.
 * - SOS is NOT translated.
 */

export type Language = 'en' | 'hi';

type StringKeys =
  // App
  | 'appName'
  | 'appTagline'
  // Navigation
  | 'navHome'
  | 'navMap'
  | 'navHazards'
  | 'navEmergency'
  | 'navSettings'
  // Hazards
  | 'hazardLandslide'
  | 'hazardFlood'
  // Risk
  | 'riskLevel'
  | 'riskScore'
  | 'riskProbability'
  | 'riskTimeline'
  // Confidence
  | 'dataConfidence'
  | 'confidenceHigh'
  | 'confidenceDegraded'
  | 'confidenceInsufficient'
  | 'confidenceNote'
  // Location
  | 'currentLocation'
  | 'selectedRegion'
  | 'useMyLocation'
  | 'selectRegion'
  | 'assessLocation'
  | 'viewDetails'
  | 'riskMap'
  | 'latitude'
  | 'longitude'
  // Landslide
  | 'landslideRisk'
  | 'topRiskDrivers'
  | 'historicalContext'
  | 'nearbyEvents'
  | 'assessCurrentLocation'
  | 'viewOnMap'
  | 'refresh'
  | 'sarAcquisitionDate'
  | 'rainfall7d'
  | 'slope'
  | 'elevation'
  // Flood
  | 'floodRisk'
  | 'floodEvidence'
  | 'floodSusceptibility'
  | 'meteorologicalForcing'
  | 'historicalRecurrence'
  | 'satelliteObservation'
  | 'satelliteUnobserved'
  | 'nearestRiver'
  // States
  | 'loading'
  | 'unknown'
  | 'degraded'
  | 'unobserved'
  | 'error'
  | 'backendOnline'
  | 'backendOffline'
  | 'gpsUnavailable'
  | 'permissionDenied'
  // Actions
  | 'assessCurrentLocation'
  | 'openRiskMap'
  | 'emergencySOS'
  // Settings
  | 'settings'
  | 'language'
  | 'english'
  | 'hindi'
  | 'about'
  | 'version'
  // NER Regions
  | 'regionAssam'
  | 'regionArunachal'
  | 'regionMeghalaya'
  | 'regionNagaland'
  | 'regionManipur'
  | 'regionMizoram'
  | 'regionTripura'
  | 'regionSikkim';

const strings: Record<Language, Record<StringKeys, string>> = {
  en: {
    appName: 'PRITHVI WATCH',
    appTagline: 'Multi-Hazard Risk Intelligence',
    navHome: 'Home',
    navMap: 'Map',
    navHazards: 'Hazards',
    navEmergency: 'Emergency',
    navSettings: 'Settings',
    hazardLandslide: 'Landslide',
    hazardFlood: 'Flood',
    riskLevel: 'Risk Level',
    riskScore: 'Risk Score',
    riskProbability: 'Probability',
    riskTimeline: 'Risk Timeline',
    dataConfidence: 'Data Confidence',
    confidenceHigh: 'HIGH CONFIDENCE',
    confidenceDegraded: 'DEGRADED CONFIDENCE',
    confidenceInsufficient: 'INSUFFICIENT DATA',
    confidenceNote: 'Confidence reflects availability and completeness of supporting observations — not probability of disaster.',
    currentLocation: 'Current Location',
    selectedRegion: 'Selected Region',
    useMyLocation: 'Use My Location',
    selectRegion: 'Select Region',
    assessLocation: 'Assess This Location',
    viewDetails: 'View Details',
    riskMap: 'Risk Map',
    latitude: 'Latitude',
    longitude: 'Longitude',
    landslideRisk: 'Landslide Risk',
    topRiskDrivers: 'Top Risk Drivers',
    historicalContext: 'Historical Context',
    nearbyEvents: 'Nearby Events',
    assessCurrentLocation: 'Assess Current Location',
    viewOnMap: 'View on Map',
    refresh: 'Refresh',
    sarAcquisitionDate: 'SAR Acquisition',
    rainfall7d: '7-Day Rainfall',
    slope: 'Slope',
    elevation: 'Elevation',
    floodRisk: 'Flood Risk',
    floodEvidence: 'Flood Evidence',
    floodSusceptibility: 'Flood Susceptibility',
    meteorologicalForcing: 'Meteorological Forcing',
    historicalRecurrence: 'Historical Recurrence',
    satelliteObservation: 'Satellite Observation (SAR)',
    satelliteUnobserved: 'SATELLITE UNOBSERVED',
    nearestRiver: 'Nearest River',
    loading: 'Loading…',
    unknown: 'UNKNOWN',
    degraded: 'DEGRADED',
    unobserved: 'UNOBSERVED',
    error: 'Error',
    backendOnline: 'BACKEND ONLINE',
    backendOffline: 'OFFLINE',
    gpsUnavailable: 'GPS Unavailable',
    permissionDenied: 'Location Permission Denied',
    openRiskMap: 'Open Risk Map',
    emergencySOS: 'Emergency SOS',
    settings: 'Settings',
    language: 'Language',
    english: 'English',
    hindi: 'हिंदी',
    about: 'About',
    version: 'Version',
    regionAssam: 'Assam',
    regionArunachal: 'Arunachal Pradesh',
    regionMeghalaya: 'Meghalaya',
    regionNagaland: 'Nagaland',
    regionManipur: 'Manipur',
    regionMizoram: 'Mizoram',
    regionTripura: 'Tripura',
    regionSikkim: 'Sikkim',
  },

  hi: {
    appName: 'पृथ्वी वॉच',
    appTagline: 'बहु-खतरा जोखिम बुद्धिमत्ता',
    navHome: 'होम',
    navMap: 'मानचित्र',
    navHazards: 'खतरे',
    navEmergency: 'आपातकाल',
    navSettings: 'सेटिंग्स',
    hazardLandslide: 'भूस्खलन',
    hazardFlood: 'बाढ़',
    riskLevel: 'जोखिम स्तर',
    riskScore: 'जोखिम स्कोर',
    riskProbability: 'संभावना',
    riskTimeline: 'जोखिम समयरेखा',
    dataConfidence: 'डेटा विश्वसनीयता',
    confidenceHigh: 'उच्च विश्वसनीयता',
    confidenceDegraded: 'निम्न विश्वसनीयता',
    confidenceInsufficient: 'अपर्याप्त डेटा',
    confidenceNote: 'विश्वसनीयता डेटा स्रोतों की उपलब्धता दर्शाती है — आपदा की संभावना नहीं।',
    currentLocation: 'वर्तमान स्थान',
    selectedRegion: 'चुना गया क्षेत्र',
    useMyLocation: 'मेरा स्थान उपयोग करें',
    selectRegion: 'क्षेत्र चुनें',
    assessLocation: 'स्थान का आकलन करें',
    viewDetails: 'विवरण देखें',
    riskMap: 'जोखिम मानचित्र',
    latitude: 'अक्षांश',
    longitude: 'देशांतर',
    landslideRisk: 'भूस्खलन जोखिम',
    topRiskDrivers: 'मुख्य जोखिम कारक',
    historicalContext: 'ऐतिहासिक संदर्भ',
    nearbyEvents: 'निकटवर्ती घटनाएं',
    assessCurrentLocation: 'वर्तमान स्थान का आकलन करें',
    viewOnMap: 'मानचित्र पर देखें',
    refresh: 'रीफ्रेश करें',
    sarAcquisitionDate: 'SAR अधिग्रहण',
    rainfall7d: '7-दिन की वर्षा',
    slope: 'ढलान',
    elevation: 'ऊंचाई',
    floodRisk: 'बाढ़ जोखिम',
    floodEvidence: 'बाढ़ साक्ष्य',
    floodSusceptibility: 'बाढ़ संवेदनशीलता',
    meteorologicalForcing: 'मौसम विज्ञान',
    historicalRecurrence: 'ऐतिहासिक पुनरावृत्ति',
    satelliteObservation: 'उपग्रह अवलोकन (SAR)',
    satelliteUnobserved: 'उपग्रह अनवलोकित',
    nearestRiver: 'निकटतम नदी',
    loading: 'लोड हो रहा है…',
    unknown: 'अज्ञात',
    degraded: 'निम्नीकृत',
    unobserved: 'अनवलोकित',
    error: 'त्रुटि',
    backendOnline: 'सर्वर ऑनलाइन',
    backendOffline: 'ऑफलाइन',
    gpsUnavailable: 'GPS अनुपलब्ध',
    permissionDenied: 'स्थान अनुमति अस्वीकृत',
    openRiskMap: 'जोखिम मानचित्र खोलें',
    emergencySOS: 'आपातकालीन SOS',
    settings: 'सेटिंग्स',
    language: 'भाषा',
    english: 'English',
    hindi: 'हिंदी',
    about: 'परिचय',
    version: 'संस्करण',
    regionAssam: 'असम',
    regionArunachal: 'अरुणाचल प्रदेश',
    regionMeghalaya: 'मेघालय',
    regionNagaland: 'नागालैंड',
    regionManipur: 'मणिपुर',
    regionMizoram: 'मिज़ोरम',
    regionTripura: 'त्रिपुरा',
    regionSikkim: 'सिक्किम',
  },
};

export function t(lang: Language, key: StringKeys): string {
  return strings[lang][key] ?? strings['en'][key] ?? key;
}

export { strings };
