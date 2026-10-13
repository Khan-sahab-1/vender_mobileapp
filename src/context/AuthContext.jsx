import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';
import { setOnUnauthorized } from '../api/client';
import { STORAGE_KEYS } from '../config/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await AsyncStorage.multiGet([
          STORAGE_KEYS.TOKEN,
          STORAGE_KEYS.USER,
        ]);
        if (token[1] && storedUser[1]) {
          setUser(JSON.parse(storedUser[1]));
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
    setUser(null);
  }, []);

  useEffect(() => {
    // If any API call comes back 401, force the session back to Login.
    setOnUnauthorized(() => setUser(null));
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    const { accessToken, user: loggedInUser } = await authApi.login(email, password);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.TOKEN, accessToken],
      [STORAGE_KEYS.USER, JSON.stringify(loggedInUser)],
    ]);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const signup = useCallback(async (dto) => {
    setError(null);
    const { accessToken, user: loggedInUser } = await authApi.signup(dto);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.TOKEN, accessToken],
      [STORAGE_KEYS.USER, JSON.stringify(loggedInUser)],
    ]);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, error, setError, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
