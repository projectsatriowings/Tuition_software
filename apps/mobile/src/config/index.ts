import { Platform } from 'react-native';

const isProduction = process.env.NODE_ENV === 'production';

// Production should use HTTPS; development uses emulator or local machine endpoints
const DEFAULT_DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api', // Android SDK Emulator loopback
  ios: 'http://localhost:5000/api',
  default: 'http://localhost:5000/api',
});

const DEFAULT_PROD_API_URL = 'https://api.tuitionos.com/api';

export const AppConfig = {
  appName: 'TuitionOS Mobile',
  version: '1.0.0',
  isProduction,
  defaultApiBaseUrl: isProduction ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL,
  presets: {
    androidEmulator: 'http://10.0.2.2:5000/api',
    localLanDefault: 'http://192.168.1.5:5000/api',
    localhost: 'http://localhost:5000/api',
  },
  storageKeys: {
    accessToken: 'tuition_mobile_access_token',
    refreshToken: 'tuition_mobile_refresh_token',
    userProfile: 'tuition_mobile_user',
    activeInstitute: 'tuition_mobile_institute',
    customApiUrl: 'tuition_mobile_custom_api_url',
  },
  currency: {
    symbol: '₹',
    code: 'INR',
  },
};

/**
 * Normalizes any user-supplied or stored URL to guarantee:
 * 1. Has http:// or https:// protocol
 * 2. Has no trailing slashes
 * 3. Ends with /api without duplicates (e.g. /api/api is prevented)
 */
export function normalizeApiUrl(rawUrl: string): string {
  let cleaned = (rawUrl || '').trim();
  if (!cleaned) {
    return AppConfig.defaultApiBaseUrl;
  }

  // Prepend http:// if user entered IP or hostname without protocol
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `http://${cleaned}`;
  }

  // Strip all trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');

  // If ends with /api, leave it; otherwise append /api
  if (!cleaned.toLowerCase().endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }

  return cleaned;
}
