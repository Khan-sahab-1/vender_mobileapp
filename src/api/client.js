import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../config/config';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Called by AuthContext when the user logs out or a 401 is hit, so screens
// can be redirected back to Login without every call site knowing about auth.
let onUnauthorized = () => {};
export const setOnUnauthorized = fn => {
  onUnauthorized = fn;
};

client.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  response => response,
  async error => {
    if (error?.response?.status === 401) {
      await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

/** Extracts a readable message from an Axios error, falling back to a generic one. */
export const getErrorMessage = error => {
  const data = error?.response?.data;
  if (!data) return error?.message || 'Something went wrong';
  if (Array.isArray(data.message)) return data.message.join('\n');
  return data.message || 'Something went wrong';
};

export default client;
