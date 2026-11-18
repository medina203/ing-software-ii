import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { ACCEPTED_IMAGE_TYPES } from '../lib/image-resize';

interface ImagePickerProps {
  label: string;
  /** Imagen actual (URL) que se muestra mientras no se elija otra. */
  currentUrl?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  hint?: string;
  aspect?: 'card' | 'wide';
}

const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;

/**
 * Selector de imagen. En el celular ofrece la cámara o la galería; en el PC,
 * el explorador de archivos. La foto se reduce antes de subirla.
 */
export function ImagePicker({
  label,
  currentUrl,
  file,
  onFileChange,
  hint,
  aspect = 'card',
}: ImagePickerProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview ?? currentUrl;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <div
          className={`relative shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${
            aspect === 'wide' ? 'h-20 w-36' : 'h-20 w-28'
          }`}
        >
          {shown ? (
            <img src={shown} alt="Vista previa" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {file || currentUrl ? 'Cambiar imagen' : 'Subir imagen'}
            </button>
            {file && (
              <button
                type="button"
                onClick={() => {
                  onFileChange(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600"
              >
                <X className="h-3.5 w-3.5" /> Quitar
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {hint ?? 'JPG, PNG o WEBP. Desde el celular puedes tomar una foto.'}
          </p>
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          setError('');
          if (selected && !ACCEPTED_IMAGE_TYPES.split(',').includes(selected.type)) {
            setError('Formato no permitido. Usa JPG, PNG o WEBP.');
            event.target.value = '';
            return;
          }
          if (selected && selected.size > MAX_ORIGINAL_BYTES) {
            setError('La imagen es demasiado grande (máximo 15 MB).');
            event.target.value = '';
            return;
          }
          onFileChange(selected);
        }}
      />
    </div>
  );
}
