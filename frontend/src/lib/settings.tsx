import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import api from './api';

export type Tema = 'claro' | 'oscuro';
export type TamanoFuente = 'pequena' | 'normal' | 'grande';
export type ColorPrimario = 'ambar' | 'azul' | 'verde' | 'rojo' | 'violeta';

export interface ArticuloCarrusel {
  titulo: string;
  texto: string;
  imagenUrl?: string | null;
  enlace?: string | null;
}

export interface AppSettings {
  tema: Tema;
  tamanoFuente: TamanoFuente;
  colorPrimario: ColorPrimario;
  imagenLoginUrl: string | null;
  carrusel: ArticuloCarrusel[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  tema: 'claro',
  tamanoFuente: 'normal',
  colorPrimario: 'ambar',
  imagenLoginUrl: null,
  carrusel: [],
};

/** Artículos que muestra el panel cuando el ADMIN no ha definido los suyos. */
export const DEFAULT_CAROUSEL: ArticuloCarrusel[] = [
  {
    titulo: 'Inventario siempre a la vista',
    texto: 'Cada implemento muestra su stock disponible, alquilado y en mantenimiento.',
    imagenUrl: '/ilustraciones/carrusel-inventario.svg',
    enlace: '/inventario',
  },
  {
    titulo: 'Seguridad primero en la obra',
    texto: 'Entrega cascos, arneses y líneas de vida revisados en cada alquiler.',
    imagenUrl: '/ilustraciones/carrusel-seguridad.svg',
    enlace: '/inventario',
  },
  {
    titulo: 'Mantenimiento preventivo',
    texto: 'Envía a mantenimiento las unidades que lo necesiten desde "Ver unidades".',
    imagenUrl: '/ilustraciones/carrusel-mantenimiento.svg',
    enlace: '/inventario',
  },
  {
    titulo: 'Cartera al día',
    texto: 'Revisa facturas pendientes y vencidas y registra los pagos de tus clientes.',
    imagenUrl: '/ilustraciones/carrusel-cartera.svg',
    enlace: '/cartera',
  },
];

export const COLOR_OPTIONS: Array<{
  value: ColorPrimario;
  label: string;
  swatch: string;
}> = [
  { value: 'ambar', label: 'Ámbar', swatch: '#f59e0b' },
  { value: 'azul', label: 'Azul', swatch: '#3b82f6' },
  { value: 'verde', label: 'Verde', swatch: '#10b981' },
  { value: 'rojo', label: 'Rojo', swatch: '#f43f5e' },
  { value: 'violeta', label: 'Violeta', swatch: '#8b5cf6' },
];

const STORAGE_KEY = 'dm_alquiler_apariencia';

function readCached(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Aplica tema, color y tamaño de letra al documento. */
export function applyAppearance(
  settings: Pick<AppSettings, 'tema' | 'tamanoFuente' | 'colorPrimario'>,
) {
  const root = document.documentElement;
  root.classList.toggle('dark', settings.tema === 'oscuro');
  root.dataset.color = settings.colorPrimario;
  root.dataset.font = settings.tamanoFuente;
}

interface SettingsContextValue {
  settings: AppSettings;
  loaded: boolean;
  refresh: () => Promise<void>;
  /** Guarda en el contexto lo que devolvió la API después de un cambio. */
  setSettings: (settings: AppSettings) => void;
  /** Vista previa temporal (página de apariencia) sin guardar. */
  preview: (
    settings: Pick<AppSettings, 'tema' | 'tamanoFuente' | 'colorPrimario'>,
  ) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setState] = useState<AppSettings>(readCached);
  const [loaded, setLoaded] = useState(false);

  const setSettings = useCallback((next: AppSettings) => {
    setState(next);
    applyAppearance(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sin almacenamiento disponible: se aplicará al cargar desde la API.
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await api.get<AppSettings>('/settings');
      setSettings({ ...DEFAULT_SETTINGS, ...response.data });
    } catch {
      // Si la API no responde se mantiene la última apariencia conocida.
    } finally {
      setLoaded(true);
    }
  }, [setSettings]);

  useEffect(() => {
    applyAppearance(settings);
    void refresh();
    // Solo al montar: refresh actualiza el estado.
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loaded, refresh, setSettings, preview: applyAppearance }),
    [settings, loaded, refresh, setSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings debe usarse dentro de SettingsProvider.');
  return context;
}
