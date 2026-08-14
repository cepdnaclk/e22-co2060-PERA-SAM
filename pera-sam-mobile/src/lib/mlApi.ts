import { Platform } from 'react-native';

export const mlApiUrl = (process.env.EXPO_PUBLIC_ML_API_URL || '').replace(/\/$/, '');

export function getMlApiConfigError() {
  if (!mlApiUrl) {
    return 'ML backend is not configured. Set EXPO_PUBLIC_ML_API_URL in pera-sam-mobile/.env, then restart Expo.';
  }

  if (!/^https?:\/\//.test(mlApiUrl)) {
    return 'ML backend URL must start with http:// or https://.';
  }

  if (Platform.OS !== 'web' && /:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(mlApiUrl)) {
    return 'This phone cannot reach localhost. Set EXPO_PUBLIC_ML_API_URL to your computer’s Wi-Fi IPv4 address, for example http://192.168.1.10:8000, then restart Expo.';
  }

  return null;
}

export function getMlApiErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  if (message === 'Network request failed' || message.includes('Failed to fetch')) {
    return 'Could not reach the ML backend. Confirm it is running, your phone and computer use the same Wi-Fi, and EXPO_PUBLIC_ML_API_URL uses your computer’s Wi-Fi IPv4 address.';
  }

  return message || 'Could not connect to the ML server.';
}
