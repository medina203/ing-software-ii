import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, Search, UserRound, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../lib/api';
import { clientFullName, clientOptionLabel, normalizeClientSearch } from '../lib/clients';
import type { Client, ListResponse } from '../types';

interface ClientSearchSelectProps {
  id?: string;
  value: Client | null;
  onChange: (client: Client | null) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

const PAGE_LIMIT = 8;

export function ClientSearchSelect({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'Buscar por cédula, nombre o apellido…',
}: ClientSearchSelectProps) {
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [options, setOptions] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [highlighted, setHighlighted] = useState(-1);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(normalizeClientSearch(query));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);
    setError('');

    api
      .get<ListResponse<Client>>('/clients', {
        params: {
          limit: PAGE_LIMIT,
          ...(debouncedQuery ? { search: debouncedQuery } : {}),
        },
      })
      .then((response) => {
        if (!active) return;
        setOptions(response.data.data);
        setTotal(response.data.total);
        setHighlighted(response.data.data.length > 0 ? 0 : -1);
      })
      .catch((loadError) => {
        if (!active) return;
        setOptions([]);
        setTotal(0);
        setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selectClient = (client: Client) => {
    onChange(client);
    setQuery('');
    setDebouncedQuery('');
    setOpen(false);
    setOptions([]);
    setTotal(0);
    setHighlighted(-1);
  };

  const clearSelection = () => {
    onChange(null);
    setQuery('');
    setDebouncedQuery('');
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlighted((current) =>
        options.length === 0 ? -1 : Math.min(options.length - 1, current + 1),
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((current) => (options.length === 0 ? -1 : Math.max(0, current - 1)));
      return;
    }

    if (event.key === 'Enter' && open && highlighted >= 0 && options[highlighted]) {
      event.preventDefault();
      selectClient(options[highlighted]);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  if (value) {
    return (
      <div>
        <div className="relative">
          <input
            id={id}
            type="text"
            readOnly
            disabled={disabled}
            required={required}
            value={clientOptionLabel(value)}
            aria-label="Cliente seleccionado"
            className="input cursor-default bg-slate-50 pr-24 font-medium text-slate-800"
          />
          {!disabled && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 hover:text-brand-700"
            >
              <X className="h-3.5 w-3.5" />
              Cambiar
            </button>
          )}
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          <UserRound className="h-3.5 w-3.5" />
          {value.telefono}
          {value.correo ? ` · ${value.correo}` : ''}
        </p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && highlighted >= 0 ? `${listboxId}-option-${highlighted}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          required={required}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlighted(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input pl-9 pr-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
          {error ? (
            <p className="px-4 py-3 text-sm text-rose-600">{error}</p>
          ) : loading && options.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">Buscando clientes…</p>
          ) : options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              No se encontraron clientes.
              <Link
                to="/clientes"
                className="ml-1 font-semibold text-brand-600 hover:text-brand-700"
              >
                Registrar cliente
              </Link>
            </div>
          ) : (
            <>
              <ul id={listboxId} role="listbox" className="max-h-72 overflow-y-auto py-1">
                {options.map((client, index) => (
                  <li
                    key={client.id}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={index === highlighted}
                    aria-label={clientOptionLabel(client)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectClient(client)}
                    onMouseEnter={() => setHighlighted(index)}
                    className={`cursor-pointer px-4 py-2.5 ${
                      index === highlighted ? 'bg-brand-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {clientFullName(client)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {client.documentoIdentidad} · {client.telefono}
                      {client.correo ? ` · ${client.correo}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
              {total > options.length && (
                <p className="border-t border-slate-100 px-4 py-2 text-[0.6875rem] text-slate-500">
                  Mostrando {options.length} de {total} coincidencias. Escribe para afinar
                  la búsqueda.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
