import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ImagePlus,
  Moon,
  Plus,
  RotateCcw,
  Save,
  Sun,
  Trash2,
  Type,
} from 'lucide-react';
import { ImagePicker } from '../components/ImagePicker';
import { useToast } from '../components/Toast';
import { Button, Field, Select, TextArea, TextInput } from '../components/ui/Button';
import { ErrorAlert, PageHeader, SectionCard } from '../components/ui/Feedback';
import api, { getErrorMessage } from '../lib/api';
import { assetUrl } from '../lib/assets';
import { cn } from '../lib/cn';
import { imageFormData, MULTIPART } from '../lib/image-resize';
import {
  COLOR_OPTIONS,
  DEFAULT_CAROUSEL,
  useSettings,
  type AppSettings,
  type ArticuloCarrusel,
  type TamanoFuente,
  type Tema,
} from '../lib/settings';

const FONT_OPTIONS: Array<{ value: TamanoFuente; label: string; sample: string }> = [
  { value: 'pequena', label: 'Pequeña', sample: 'text-sm' },
  { value: 'normal', label: 'Normal', sample: 'text-base' },
  { value: 'grande', label: 'Grande', sample: 'text-lg' },
];

const LINK_OPTIONS = [
  { value: '', label: 'Sin enlace' },
  { value: '/inventario', label: 'Inventario' },
  { value: '/alquileres/nuevo', label: 'Nuevo alquiler' },
  { value: '/alquileres', label: 'Alquileres' },
  { value: '/devoluciones', label: 'Devoluciones' },
  { value: '/cartera', label: 'Cartera' },
  { value: '/clientes', label: 'Clientes' },
  { value: '/reportes', label: 'Reportes' },
];

const BUILT_IN_IMAGES = [
  { value: '/ilustraciones/carrusel-inventario.svg', label: 'Inventario' },
  { value: '/ilustraciones/carrusel-seguridad.svg', label: 'Seguridad' },
  { value: '/ilustraciones/carrusel-mantenimiento.svg', label: 'Mantenimiento' },
  { value: '/ilustraciones/carrusel-cartera.svg', label: 'Cartera' },
];

type Draft = Pick<AppSettings, 'tema' | 'tamanoFuente' | 'colorPrimario'> & {
  carrusel: ArticuloCarrusel[];
};

function draftFrom(settings: AppSettings): Draft {
  return {
    tema: settings.tema,
    tamanoFuente: settings.tamanoFuente,
    colorPrimario: settings.colorPrimario,
    carrusel: settings.carrusel.length > 0 ? settings.carrusel : DEFAULT_CAROUSEL,
  };
}

/**
 * Apariencia del sistema (solo ADMIN): modo oscuro, tamaño de letra, color
 * principal, imagen del login y artículos del carrusel del panel. Los cambios
 * se ven al instante y se aplican a todos los usuarios al guardar.
 */
export function AppearancePage() {
  const { settings, setSettings, preview } = useSettings();
  const { success } = useToast();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loginFile, setLoginFile] = useState<File | null>(null);
  const [loginSaving, setLoginSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Vista previa en vivo; al salir sin guardar se vuelve a lo guardado.
  useEffect(() => {
    preview(draft);
  }, [draft, preview]);
  const savedRef = useRef(settings);
  savedRef.current = settings;
  useEffect(() => () => preview(savedRef.current), [preview]);

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(draftFrom(settings)) ||
    (settings.carrusel.length === 0 &&
      JSON.stringify(draft.carrusel) !== JSON.stringify(DEFAULT_CAROUSEL));

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const updateArticle = (index: number, patch: Partial<ArticuloCarrusel>) =>
    setDraft((current) => ({
      ...current,
      carrusel: current.carrusel.map((article, i) =>
        i === index ? { ...article, ...patch } : article,
      ),
    }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await api.put<AppSettings>('/settings', draft);
      setSettings(response.data);
      success('Apariencia guardada. Se aplica a todos los usuarios.');
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const saveLoginImage = async (clear: boolean) => {
    setLoginSaving(true);
    setError('');
    try {
      const response = clear
        ? await api.delete<AppSettings>('/settings/login-image')
        : await api.post<AppSettings>(
            '/settings/login-image',
            await imageFormData(loginFile as File),
            MULTIPART,
          );
      setSettings(response.data);
      setLoginFile(null);
      success(
        clear ? 'Se restableció la imagen del login.' : 'Imagen del login actualizada.',
      );
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setLoginSaving(false);
    }
  };

  const uploadArticleImage = async (index: number, file: File | null) => {
    if (!file) return;
    setUploadingIndex(index);
    setError('');
    try {
      const response = await api.post<{ url: string }>(
        '/settings/images',
        await imageFormData(file),
        MULTIPART,
      );
      updateArticle(index, { imagenUrl: response.data.url });
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        eyebrow="Administración"
        title="Apariencia"
        description="Personaliza el aspecto del sistema. Ves los cambios al instante y se aplican a todos al guardar."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<RotateCcw className="h-4 w-4" />}
              disabled={!dirty || saving}
              onClick={() => setDraft(draftFrom(settings))}
            >
              Descartar
            </Button>
            <Button
              icon={<Save className="h-4 w-4" />}
              loading={saving}
              disabled={!dirty}
              onClick={() => void save()}
            >
              Guardar cambios
            </Button>
          </>
        }
      />

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Tema"
          description="Modo claro u oscuro para toda la aplicación."
        >
          <div className="grid grid-cols-2 gap-3 p-5" role="radiogroup" aria-label="Tema">
            {(
              [
                { value: 'claro', label: 'Claro', icon: Sun },
                { value: 'oscuro', label: 'Oscuro', icon: Moon },
              ] as Array<{ value: Tema; label: string; icon: typeof Sun }>
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={draft.tema === option.value}
                onClick={() => update('tema', option.value)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-4 text-left transition',
                  draft.tema === option.value
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
                    : 'border-slate-200 hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    option.value === 'oscuro'
                      ? 'theme-fixed bg-ink-900 text-brand-400'
                      : 'bg-white text-brand-600 shadow-sm',
                  )}
                >
                  <option.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Tamaño de letra"
          description="Afecta a todo el texto del sistema."
        >
          <div
            className="grid grid-cols-3 gap-3 p-5"
            role="radiogroup"
            aria-label="Tamaño de letra"
          >
            {FONT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={draft.tamanoFuente === option.value}
                onClick={() => update('tamanoFuente', option.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border p-4 transition',
                  draft.tamanoFuente === option.value
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
                    : 'border-slate-200 hover:bg-slate-50',
                )}
              >
                <Type className="h-4 w-4 text-slate-400" />
                <span className={cn('font-bold text-slate-800', option.sample)}>Aa</span>
                <span className="text-xs text-slate-500">{option.label}</span>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Color principal" description="Botones, enlaces y acentos.">
          <div
            className="flex flex-wrap gap-3 p-5"
            role="radiogroup"
            aria-label="Color principal"
          >
            {COLOR_OPTIONS.map((option) => {
              const active = draft.colorPrimario === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={option.label}
                  onClick={() => update('colorPrimario', option.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-semibold transition',
                    active
                      ? 'border-slate-800 text-slate-900'
                      : 'border-slate-200 text-slate-600',
                  )}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: option.swatch }}
                  >
                    {active && <Check className="h-4 w-4" />}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Imagen del login"
          description="Se muestra difuminada en la mitad izquierda de la pantalla de inicio."
        >
          <div className="space-y-4 p-5">
            <ImagePicker
              label="Imagen de fondo"
              aspect="wide"
              file={loginFile}
              onFileChange={setLoginFile}
              currentUrl={
                assetUrl(settings.imagenLoginUrl) ?? '/ilustraciones/login-fondo.svg'
              }
              hint="Recomendado: foto horizontal de tu bodega o herramientas."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                icon={<ImagePlus className="h-4 w-4" />}
                disabled={!loginFile}
                loading={loginSaving}
                onClick={() => void saveLoginImage(false)}
              >
                Guardar imagen
              </Button>
              {settings.imagenLoginUrl && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={loginSaving}
                  onClick={() => void saveLoginImage(true)}
                >
                  Usar imagen por defecto
                </Button>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Carrusel del panel"
        description="Entre 1 y 4 artículos que rotan en el panel principal."
        action={
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus className="h-4 w-4" />}
            disabled={draft.carrusel.length >= 4}
            onClick={() =>
              update('carrusel', [
                ...draft.carrusel,
                {
                  titulo: 'Nuevo artículo',
                  texto: 'Escribe aquí el mensaje para tu equipo.',
                  imagenUrl: BUILT_IN_IMAGES[draft.carrusel.length % 4].value,
                  enlace: null,
                },
              ])
            }
          >
            Agregar artículo
          </Button>
        }
      >
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          {draft.carrusel.map((article, index) => (
            <div
              key={index}
              className="space-y-3 rounded-2xl border border-slate-200 p-4"
              data-testid="carousel-article-editor"
            >
              <div className="relative h-32 overflow-hidden rounded-xl bg-slate-900">
                {article.imagenUrl && (
                  <img
                    src={assetUrl(article.imagenUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                  {index + 1}
                </span>
              </div>
              <Field label="Título" htmlFor={`titulo-${index}`} required>
                <TextInput
                  id={`titulo-${index}`}
                  value={article.titulo}
                  maxLength={80}
                  onChange={(event) =>
                    updateArticle(index, { titulo: event.target.value })
                  }
                />
              </Field>
              <Field label="Texto" htmlFor={`texto-${index}`} required>
                <TextArea
                  id={`texto-${index}`}
                  value={article.texto}
                  maxLength={220}
                  rows={2}
                  onChange={(event) =>
                    updateArticle(index, { texto: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Imagen" htmlFor={`imagen-${index}`}>
                  <Select
                    id={`imagen-${index}`}
                    value={
                      BUILT_IN_IMAGES.some((image) => image.value === article.imagenUrl)
                        ? (article.imagenUrl ?? '')
                        : 'propia'
                    }
                    onChange={(event) =>
                      event.target.value !== 'propia' &&
                      updateArticle(index, { imagenUrl: event.target.value })
                    }
                  >
                    {BUILT_IN_IMAGES.map((image) => (
                      <option key={image.value} value={image.value}>
                        {image.label}
                      </option>
                    ))}
                    <option value="propia" disabled>
                      Imagen propia
                    </option>
                  </Select>
                </Field>
                <Field label="Enlace" htmlFor={`enlace-${index}`}>
                  <Select
                    id={`enlace-${index}`}
                    value={article.enlace ?? ''}
                    onChange={(event) =>
                      updateArticle(index, { enlace: event.target.value || null })
                    }
                  >
                    {LINK_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex items-center justify-between">
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-brand-700">
                  <ImagePlus className="h-3.5 w-3.5" />
                  {uploadingIndex === index ? 'Subiendo…' : 'Subir imagen propia'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadingIndex !== null}
                    onChange={(event) => {
                      void uploadArticleImage(index, event.target.files?.[0] ?? null);
                      event.target.value = '';
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={draft.carrusel.length <= 1}
                  onClick={() =>
                    update(
                      'carrusel',
                      draft.carrusel.filter((_, i) => i !== index),
                    )
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
