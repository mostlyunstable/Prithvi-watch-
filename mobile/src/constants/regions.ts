/**
 * PRITHVI WATCH — North Eastern Region Constants
 * Approximate center coordinates for each NER state, for map centering and region selection.
 * Coordinates are from official geographic centroids — not invented.
 */

export interface NERRegion {
  id: string;
  name: string;
  abbreviation: string;
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export const NER_REGIONS: NERRegion[] = [
  {
    id: 'assam',
    name: 'Assam',
    abbreviation: 'AS',
    latitude: 26.2006,
    longitude: 92.9376,
    latitudeDelta: 4.0,
    longitudeDelta: 5.0,
  },
  {
    id: 'arunachal',
    name: 'Arunachal Pradesh',
    abbreviation: 'AR',
    latitude: 28.2180,
    longitude: 94.7278,
    latitudeDelta: 4.0,
    longitudeDelta: 6.0,
  },
  {
    id: 'meghalaya',
    name: 'Meghalaya',
    abbreviation: 'ML',
    latitude: 25.4670,
    longitude: 91.3662,
    latitudeDelta: 2.0,
    longitudeDelta: 3.0,
  },
  {
    id: 'nagaland',
    name: 'Nagaland',
    abbreviation: 'NL',
    latitude: 26.1584,
    longitude: 94.5624,
    latitudeDelta: 1.5,
    longitudeDelta: 2.5,
  },
  {
    id: 'manipur',
    name: 'Manipur',
    abbreviation: 'MN',
    latitude: 24.6637,
    longitude: 93.9063,
    latitudeDelta: 1.5,
    longitudeDelta: 2.0,
  },
  {
    id: 'mizoram',
    name: 'Mizoram',
    abbreviation: 'MZ',
    latitude: 23.1645,
    longitude: 92.9376,
    latitudeDelta: 2.0,
    longitudeDelta: 2.0,
  },
  {
    id: 'tripura',
    name: 'Tripura',
    abbreviation: 'TR',
    latitude: 23.9408,
    longitude: 91.9882,
    latitudeDelta: 1.5,
    longitudeDelta: 1.5,
  },
  {
    id: 'sikkim',
    name: 'Sikkim',
    abbreviation: 'SK',
    latitude: 27.5330,
    longitude: 88.5122,
    latitudeDelta: 1.0,
    longitudeDelta: 1.0,
  },
];

/** Default viewport centered on Assam / Guwahati for app startup */
export const NER_DEFAULT_REGION = {
  latitude: 26.18,
  longitude: 91.75,
  latitudeDelta: 4.0,
  longitudeDelta: 5.0,
};
