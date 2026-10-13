// Point this at your running Master Data API (NestJS backend).
// - Android emulator: use 10.0.2.2 to reach your host machine's localhost
// - iOS simulator: localhost works directly
// - Physical device: use your machine's LAN IP, e.g. http://192.168.1.50:3000
import { Platform } from 'react-native';

const LOCAL_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL = `http://${LOCAL_HOST}:3000/api/v1`;

export const STORAGE_KEYS = {
  TOKEN: '@master_data_app/token',
  USER: '@master_data_app/user',
};
