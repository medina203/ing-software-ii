import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import api, { TOKEN_STORAGE_KEY } from '../lib/api';
import type { LoginResponse, User } from '../types';

interface AuthContextValue {
  usuario: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUsuario(null);
  }, []);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get<User>('/auth/me')
      .then((response) => {
        if (active) setUsuario(response.data);
      })
      .catch(() => {
        if (active) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setUsuario(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      setUsuario(null);
    };
    window.addEventListener('obragest:logout', handleLogout);
    return () => window.removeEventListener('obragest:logout', handleLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    localStorage.setItem(TOKEN_STORAGE_KEY, response.data.accessToken);
    setUsuario(response.data.usuario);
    return response.data.usuario;
  }, []);

  const value = useMemo(
    () => ({ usuario, loading, login, logout }),
    [usuario, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }
  return context;
}
