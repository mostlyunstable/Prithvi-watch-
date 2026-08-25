/**
 * Comprehensive Adversarial Stress-Test Suite for Frontend GeoAnalytics Utilities
 * Targets: formatHistoricalDate, safeToFixed, formatCoordinatePair, formatPercent, computeHistoricalContext, computeRiskGridAnalytics
 */

import {
  formatHistoricalDate,
  safeToFixed,
  formatCoordinatePair,
  formatPercent,
  computeHistoricalContext,
  getRiskLevel,
  computeRiskGridAnalytics,
  computeAdaptiveResolution,
  haversineDistanceKm
} from '../src/utils/geoAnalytics.ts';

interface TestCaseResult {
  suite: string;
  testName: string;
  input: any;
  expected: any;
  actual: any;
  passed: boolean;
  notes?: string;
}

const results: TestCaseResult[] = [];

function assertTest(
  suite: string,
  testName: string,
  input: any,
  actual: any,
  expected: any,
  customCheck?: (act: any, exp: any) => boolean,
  notes?: string
) {
  const passed = customCheck ? customCheck(actual, expected) : actual === expected;
  results.push({
    suite,
    testName,
    input,
    expected,
    actual,
    passed,
    notes
  });
}

console.log('================================================================');
console.log('STARTING ADVERSARIAL STRESS-TEST SUITE: geoAnalytics.ts');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// SUITE 1: formatHistoricalDate - Prompt Mandatory Test Cases
// ----------------------------------------------------------------------
const promptDateCases: Array<{ input: any; expected: string; label: string }> = [
  { input: '', expected: 'Date unavailable', label: 'Empty string ""' },
  { input: null, expected: 'Date unavailable', label: 'null literal' },
  { input: undefined, expected: 'Date unavailable', label: 'undefined literal' },
  { input: '1970-01-01', expected: 'Date unavailable', label: 'Unix epoch date "1970-01-01"' },
  { input: '1970/01/01 00:00:00', expected: 'Date unavailable', label: 'Unix epoch with slashes and time' },
  { input: '1970-01-01T00:00:00Z', expected: 'Date unavailable', label: 'Unix epoch ISO 8601 with Z' },
  { input: '0', expected: 'Date unavailable', label: 'String "0"' },
  { input: '1969-12-31', expected: 'Date unavailable', label: 'Pre-epoch "1969-12-31"' },
  { input: 'NaN', expected: 'Date unavailable', label: 'String "NaN"' },
  { input: 'undefined', expected: 'Date unavailable', label: 'String "undefined"' },
  { input: 'invalid date', expected: 'Date unavailable', label: 'String "invalid date"' },
  { input: '1850-05-12', expected: 'Date unavailable', label: 'Out of range ancient year "1850-05-12" (<1900)' },
  { input: '2500-01-01', expected: 'Date unavailable', label: 'Far future year "2500-01-01" (>2100)' },
  { input: '2023-08-15', expected: '2023-08-15', label: 'Valid real date "2023-08-15"' }
];

for (const tc of promptDateCases) {
  const actual = formatHistoricalDate(tc.input);
  assertTest('formatHistoricalDate (Mandatory)', tc.label, tc.input, actual, tc.expected);
}

// ----------------------------------------------------------------------
// SUITE 2: formatHistoricalDate - Adversarial Extended Stress Cases
// ----------------------------------------------------------------------
const extendedDateCases: Array<{ input: any; expected: string; label: string }> = [
  { input: 0, expected: 'Date unavailable', label: 'Numeric 0' },
  { input: NaN, expected: 'Date unavailable', label: 'Numeric NaN' },
  { input: 1970, expected: 'Date unavailable', label: 'Numeric 1970' },
  { input: '1970-12-31', expected: 'Date unavailable', label: 'Year 1970 boundary date' },
  { input: '1970-06-15 12:00:00', expected: 'Date unavailable', label: 'Mid-1970 timestamp' },
  { input: '1900-01-01', expected: 'Date unavailable', label: 'Boundary year 1900 (<=1970)' },
  { input: '1968-05-20', expected: 'Date unavailable', label: 'Year 1968 (<1970)' },
  { input: '1971-01-01', expected: '1971-01-01', label: 'Post-epoch valid boundary "1971-01-01"' },
  { input: '2000-02-29', expected: '2000-02-29', label: 'Leap year "2000-02-29"' },
  { input: '2024/09/15 12:30:00', expected: '2024-09-15', label: 'Slash-formatted with time' },
  { input: '2024-11-05T08:22:19.123Z', expected: '2024-11-05', label: 'ISO string with milliseconds and Z' },
  { input: '  2023-05-10  ', expected: '2023-05-10', label: 'Whitespace padded valid date' },
  { input: '   ', expected: 'Date unavailable', label: 'Whitespace only string' },
  { input: 'None', expected: 'Date unavailable', label: 'Python None string' },
  { input: 'none', expected: 'Date unavailable', label: 'Lowercase none' },
  { input: 'N/A', expected: 'Date unavailable', label: 'N/A string' },
  { input: 'Unknown date', expected: 'Date unavailable', label: 'Unknown date string' },
  { input: {}, expected: 'Date unavailable', label: 'Empty object {}' },
  { input: [], expected: 'Date unavailable', label: 'Empty array []' },
  { input: true, expected: 'Date unavailable', label: 'Boolean true' },
  { input: false, expected: 'Date unavailable', label: 'Boolean false' },
  { input: 'foo-bar-baz', expected: 'Date unavailable', label: 'Nonsense string "foo-bar-baz"' },
  { input: '-2023-01-01', expected: 'Date unavailable', label: 'Negative year string "-2023-01-01"' },
  { input: '99999-99-99', expected: 'Date unavailable', label: 'Extreme year "99999-99-99"' },
  { input: '0000-00-00', expected: 'Date unavailable', label: 'Zero date "0000-00-00"' },
  { input: '2100-12-31', expected: '2100-12-31', label: 'Upper boundary year 2100 "2100-12-31"' },
  { input: '2101-01-01', expected: 'Date unavailable', label: 'Exceeding upper boundary "2101-01-01"' },
  { input: '<script>alert(1)</script>', expected: 'Date unavailable', label: 'XSS script injection string' },
  { input: "'; DROP TABLE landslides; --", expected: 'Date unavailable', label: 'SQL injection attempt string' }
];

for (const tc of extendedDateCases) {
  const actual = formatHistoricalDate(tc.input);
  assertTest('formatHistoricalDate (Extended)', tc.label, tc.input, actual, tc.expected);
}

// ----------------------------------------------------------------------
// SUITE 3: safeToFixed - Numeric & Extreme Inputs
// ----------------------------------------------------------------------
const safeToFixedCases: Array<{
  val: any;
  digits?: number;
  fallback?: string;
  expected: string;
  label: string;
}> = [
  { val: 25.5788, digits: 4, fallback: '0.0000', expected: '25.5788', label: 'Standard float 25.5788' },
  { val: -25.5788, digits: 4, fallback: '0.0000', expected: '-25.5788', label: 'Negative float -25.5788' },
  { val: 91.8933, digits: 4, fallback: '0.0000', expected: '91.8933', label: 'Standard float 91.8933' },
  { val: 0, digits: 4, fallback: '0.0000', expected: '0.0000', label: 'Numeric 0' },
  { val: -0, digits: 4, fallback: '0.0000', expected: '0.0000', label: 'Numeric -0' },
  { val: null, digits: 4, fallback: '0.0000', expected: '0.0000', label: 'null input' },
  { val: undefined, digits: 4, fallback: '0.0000', expected: '0.0000', label: 'undefined input' },
  { val: NaN, digits: 4, fallback: '0.0000', expected: '0.0000', label: 'NaN numeric input' },
  { val: Infinity, digits: 4, fallback: '0.0000', expected: '0.0000', label: 'Infinity input' },
  { val: -Infinity, digits: 4, fallback: '0.0000', expected: '0.0000', label: '-Infinity input' },
  { val: 'NaN', digits: 4, fallback: '0.0000', expected: '0.0000', label: 'String "NaN"' },
  { val: 'Infinity', digits: 4, fallback: '0.0000', expected: '0.0000', label: 'String "Infinity"' },
  { val: '-Infinity', digits: 4, fallback: '0.0000', expected: '0.0000', label: 'String "-Infinity"' },
  { val: 'null', digits: 4, fallback: '0.0000', expected: '0.0000', label: 'String "null"' },
  { val: 'undefined', digits: 4, fallback: '0.0000', expected: '0.0000', label: 'String "undefined"' },
  { val: '', digits: 4, fallback: '0.0000', expected: '0.0000', label: 'Empty string ""' },
  { val: 'foo_bar', digits: 4, fallback: '0.0000', expected: '0.0000', label: 'Non-numeric string' },
  { val: '25.578829', digits: 4, fallback: '0.0000', expected: '25.5788', label: 'Numeric string "25.578829"' },
  { val: null, digits: 3, fallback: '25.800', expected: '25.800', label: 'Custom fallback on null' },
  { val: NaN, digits: 1, fallback: 'N/A', expected: 'N/A', label: 'Custom fallback on NaN' },
  { val: 123.456, digits: 0, fallback: '0', expected: '123', label: 'digits = 0' },
  { val: Number.MAX_SAFE_INTEGER, digits: 0, fallback: '0', expected: '9007199254740991', label: 'MAX_SAFE_INTEGER' },
  { val: Number.MIN_SAFE_INTEGER, digits: 0, fallback: '0', expected: '-9007199254740991', label: 'MIN_SAFE_INTEGER' },
  { val: 0.00000123, digits: 6, fallback: '0.000000', expected: '0.000001', label: 'Small float with 6 digits' }
];

for (const tc of safeToFixedCases) {
  const actual = safeToFixed(tc.val, tc.digits, tc.fallback);
  assertTest('safeToFixed', tc.label, { val: tc.val, digits: tc.digits, fallback: tc.fallback }, actual, tc.expected);
}

// ----------------------------------------------------------------------
// SUITE 4: formatCoordinatePair - Coordinate Pair Formatting
// ----------------------------------------------------------------------
const coordPairCases: Array<{
  lat: any;
  lng: any;
  digits?: number;
  expected: string;
  label: string;
}> = [
  {
    lat: 25.5788,
    lng: 91.8933,
    digits: 4,
    expected: '25.5788° N, 91.8933° E',
    label: 'Standard NER Coordinates (Shillong)'
  },
  {
    lat: -25.5788,
    lng: 91.8933,
    digits: 4,
    expected: '-25.5788° N, 91.8933° E',
    label: 'Negative latitude'
  },
  {
    lat: null,
    lng: null,
    digits: 4,
    expected: '25.8000° N, 92.8000° E',
    label: 'Both null (default center fallback)'
  },
  {
    lat: undefined,
    lng: undefined,
    digits: 4,
    expected: '25.8000° N, 92.8000° E',
    label: 'Both undefined (default center fallback)'
  },
  {
    lat: NaN,
    lng: NaN,
    digits: 4,
    expected: '25.8000° N, 92.8000° E',
    label: 'Both NaN (default center fallback)'
  },
  {
    lat: Infinity,
    lng: -Infinity,
    digits: 4,
    expected: '25.8000° N, 92.8000° E',
    label: 'Infinities (default center fallback)'
  },
  {
    lat: 0,
    lng: 0,
    digits: 4,
    expected: '0.0000° N, 0.0000° E',
    label: 'Equator / Prime Meridian (0, 0)'
  },
  {
    lat: 26.123456,
    lng: 93.654321,
    digits: 2,
    expected: '26.12° N, 93.65° E',
    label: '2 decimal precision'
  }
];

for (const tc of coordPairCases) {
  const actual = formatCoordinatePair(tc.lat, tc.lng, tc.digits);
  assertTest(
    'formatCoordinatePair',
    tc.label,
    { lat: tc.lat, lng: tc.lng, digits: tc.digits },
    actual,
    tc.expected
  );
}

// ----------------------------------------------------------------------
// SUITE 5: formatPercent - Probability & Percentage Formatting
// ----------------------------------------------------------------------
const percentCases: Array<{
  val: any;
  digits?: number;
  fallback?: string;
  expected: string;
  label: string;
}> = [
  { val: 0.7423, digits: 1, fallback: '0.0', expected: '74.2%', label: 'Float 0.7423 -> 74.2%' },
  { val: 0.0, digits: 1, fallback: '0.0', expected: '0.0%', label: 'Float 0.0 -> 0.0%' },
  { val: 1.0, digits: 1, fallback: '0.0', expected: '100.0%', label: 'Float 1.0 -> 100.0%' },
  { val: null, digits: 1, fallback: '0.0', expected: '0.0%', label: 'null probability' },
  { val: undefined, digits: 1, fallback: '0.0', expected: '0.0%', label: 'undefined probability' },
  { val: NaN, digits: 1, fallback: '0.0', expected: '0.0%', label: 'NaN probability' },
  { val: Infinity, digits: 1, fallback: '0.0', expected: '0.0%', label: 'Infinity probability' },
  { val: -Infinity, digits: 1, fallback: '0.0', expected: '0.0%', label: '-Infinity probability' },
  { val: '0.856', digits: 1, fallback: '0.0', expected: '85.6%', label: 'String "0.856"' },
  { val: 'invalid', digits: 1, fallback: '0.0', expected: '0.0%', label: 'String "invalid"' },
  { val: '', digits: 1, fallback: '0.0', expected: '0.0%', label: 'Empty string ""' },
  { val: null, digits: 2, fallback: 'N/A', expected: 'N/A%', label: 'Custom fallback "N/A"' }
];

for (const tc of percentCases) {
  const actual = formatPercent(tc.val, tc.digits, tc.fallback);
  assertTest(
    'formatPercent',
    tc.label,
    { val: tc.val, digits: tc.digits, fallback: tc.fallback },
    actual,
    tc.expected
  );
}

// ----------------------------------------------------------------------
// SUITE 6: Integration - Historical Context with Corrupt Date Records
// ----------------------------------------------------------------------
const mockHistoricalGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [91.8933, 25.5788] },
      properties: {
        event_date: '1970-01-01',
        state_name: 'Meghalaya',
        trigger: 'Monsoon Rainfall'
      }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [91.9000, 25.5800] },
      properties: {
        event_date: null,
        state_name: 'Meghalaya',
        trigger: 'Continuous Rain'
      }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [91.9200, 25.5900] },
      properties: {
        event_date: '2023-07-14',
        state_name: 'Meghalaya',
        trigger: 'Heavy Infiltration'
      }
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [91.9500, 25.6000] },
      properties: {
        event_date: '1850-01-01',
        state_name: 'Assam',
        trigger: 'Unknown'
      }
    }
  ]
};

const contextResult = computeHistoricalContext(25.5788, 91.8933, mockHistoricalGeoJSON);

assertTest(
  'computeHistoricalContext Integration',
  'Nearest event with corrupt epoch date is sanitized',
  '1970-01-01 in nearest event',
  contextResult.nearestEvent?.event_date,
  'Date unavailable'
);

assertTest(
  'computeHistoricalContext Integration',
  'Events in radius list have sanitized dates',
  'Event dates in 50km radius',
  contextResult.recentEventsInRadius.map((e) => e.event_date),
  ['Date unavailable', 'Date unavailable', '2023-07-14', 'Date unavailable'],
  (act, exp) => JSON.stringify(act) === JSON.stringify(exp)
);

// ----------------------------------------------------------------------
// SUITE 7: Invariant Checks - Zero "NaN" or "undefined" Substrings
// ----------------------------------------------------------------------
const adversarialRawInputs = [
  NaN,
  Infinity,
  -Infinity,
  null,
  undefined,
  'NaN',
  'undefined',
  'null',
  'Infinity',
  '-Infinity',
  '',
  'foo',
  0,
  -0,
  -25.5788,
  91.8933,
  '1e308',
  '-1e308',
  '0x10'
];

for (const lat of adversarialRawInputs) {
  for (const lng of [null, undefined, NaN, Infinity, 91.8933, -91.8933]) {
    const coordStr = formatCoordinatePair(lat as any, lng as any);
    const hasForbidden =
      coordStr.includes('NaN') ||
      coordStr.includes('undefined') ||
      coordStr.includes('Infinity') ||
      coordStr.includes('null');

    assertTest(
      'Coordinate Invariant',
      `formatCoordinatePair(${String(lat)}, ${String(lng)}) contains no NaN/undefined/Infinity/null`,
      { lat, lng },
      hasForbidden,
      false,
      (act, exp) => act === exp,
      `Output was: "${coordStr}"`
    );
  }
}

// ----------------------------------------------------------------------
// SUITE 8: Spatial Resolution & Analytics Robustness
// ----------------------------------------------------------------------
const res1 = computeAdaptiveResolution(90.0, 24.0, 94.0, 28.0, 6.0);
assertTest('computeAdaptiveResolution', 'Zoom 6 extent resolution clamp', { zoom: 6.0 }, res1 >= 0.01 && res1 <= 0.5, true);

const res2 = computeAdaptiveResolution(91.5, 25.5, 92.0, 26.0, 11.0);
assertTest('computeAdaptiveResolution', 'Zoom 11 tight bbox resolution clamp', { zoom: 11.0 }, res2 >= 0.01 && res2 <= 0.05, true);

const emptyAnalytics = computeRiskGridAnalytics(null);
assertTest('computeRiskGridAnalytics', 'null GeoJSON input returns null', null, emptyAnalytics, null);

const emptyFeaturesAnalytics = computeRiskGridAnalytics({ type: 'FeatureCollection', features: [] });
assertTest('computeRiskGridAnalytics', 'empty features returns null', [], emptyFeaturesAnalytics, null);

// ----------------------------------------------------------------------
// SUMMARY AND METRICS
// ----------------------------------------------------------------------
const totalTests = results.length;
const passedTests = results.filter((r) => r.passed).length;
const failedTests = results.filter((r) => !r.passed);

console.log('----------------------------------------------------------------');
console.log(`TOTAL TESTS:  ${totalTests}`);
console.log(`PASSED:       ${passedTests}`);
console.log(`FAILED:       ${failedTests.length}`);
console.log('----------------------------------------------------------------\n');

if (failedTests.length > 0) {
  console.error('FAILED TEST DETAILS:');
  for (const f of failedTests) {
    console.error(`- [${f.suite}] ${f.testName}`);
    console.error(`    Input:    ${JSON.stringify(f.input)}`);
    console.error(`    Expected: ${JSON.stringify(f.expected)}`);
    console.error(`    Actual:   ${JSON.stringify(f.actual)}`);
    if (f.notes) console.error(`    Notes:    ${f.notes}`);
  }
  process.exit(1);
} else {
  console.log('ALL ADVERSARIAL STRESS-TESTS PASSED EMPIRICALLY!');
  process.exit(0);
}
