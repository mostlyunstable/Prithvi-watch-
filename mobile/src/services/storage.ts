import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@prithvi_watch_device_id';
const USER_NAME_KEY = '@prithvi_watch_user_name';
const DEMO_MODE_KEY = '@prithvi_watch_demo_mode';

export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      return existing;
    }
    const newId = 'MOB-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    return 'MOB-LOCAL-DEFAULT';
  }
}

export async function getUserName(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(USER_NAME_KEY)) || 'Prithvi Watch Responder';
  } catch {
    return 'Prithvi Watch Responder';
  }
}

export async function setUserName(name: string): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_NAME_KEY, name);
  } catch {
    // Ignore error
  }
}

export async function getDemoMode(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(DEMO_MODE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export async function setDemoMode(isDemo: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(DEMO_MODE_KEY, isDemo ? 'true' : 'false');
  } catch {
    // Ignore error
  }
}
