import { Platform } from 'react-native';

// Default Android emulator maps 10.0.2.2 to host machine localhost:5000
const DEFAULT_DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api',
  ios: 'http://localhost:5000/api',
  default: 'http://localhost:5000/api',
});

export const AppConfig = {
  appName: 'TuitionOS Mobile',
  version: '1.0.0',
  defaultApiBaseUrl: DEFAULT_DEV_API_URL,
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
