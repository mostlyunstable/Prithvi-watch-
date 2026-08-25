import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { emergencyApi } from './api';
import { getOrCreateDeviceId, getUserName } from './storage';

// Configure default notification handler for in-app display
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function registerForPushNotificationsAsync(phoneNumber?: string): Promise<string | null> {
  let token: string | null = null;

  try {
    const settings: any = await Notifications.getPermissionsAsync();
    let isGranted = settings?.granted || settings?.status === 'granted';

    if (!isGranted) {
      const req: any = await Notifications.requestPermissionsAsync();
      isGranted = req?.granted || req?.status === 'granted';
    }

    if (!isGranted) {
      return null;
    }

    // Set Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('emergency_sos', {
        name: 'Emergency SOS Broadcasts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        lightColor: '#ef4444',
        sound: 'default'
      });
    }

    // Obtain Expo Push Token
    const pushTokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    if (pushTokenData && pushTokenData.data) {
      token = pushTokenData.data;
    } else {
      // Simulator fallback token for testing
      token = `ExponentPushToken[mock-${Platform.OS}-${Math.random().toString(36).substring(2, 10)}]`;
    }

    // Register token with backend
    const deviceId = await getOrCreateDeviceId();
    const responderName = await getUserName();

    await emergencyApi.registerDeviceToken({
      device_id: deviceId,
      push_token: token,
      platform: Platform.OS,
      phone_number: phoneNumber,
      responder_name: responderName
    });

    return token;
  } catch {
    return null;
  }
}
