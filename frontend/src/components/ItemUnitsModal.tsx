import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import { itemStatusLabels } from '../lib/format';
import type { Item, ItemGroup, ItemStatus, PaginatedResponse } from '../types';
import { useToast } from './Toast';
import { Button, IconButton, Select } from './ui/Button';
import { ItemStatusBadge } from './ui/Badges';
import { ConfirmDialog, ErrorAlert, LoadingBlock } from './ui/Feedback';
import { Modal } from './ui/Modal';

const UNITS_PAGE_SIZE = 20;
const MANUAL_STATES: ItemStatus[] = ['DISPONIBLE', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO'];

interface ItemUnitsModalProps {
  group: ItemGroup | null;
  isAdmin: boolean;
  onClose: () => void;
  /** Se llama tras cambiar el estado o eliminar una unidad para refrescar el stock. */
  onChanged: () => void;
}

/**
 * Detalle de las unidades (seriales) de un tipo de implemento. Aquí se gestiona
 * cada unidad: su estado operativo y, si no tiene historial, su eliminación.
 */
export function ItemUnitsModal({
  group,
  isAdmin,
  onClose,
  onChanged,
}: ItemUnitsModalProps) {
  const { success, error: showError } = useToast();
  const [units, setUnits] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const requestIdRef = useRef(0);

  const categoriaId = group?.categoriaId;
  const nombre = group?.nombre;
  const groupKey = group ? `${categoriaId}|${nombre}` : '';

  useEffect(() => {
    setPage(1);
  }, [groupKey]);

  const load = useCallback(async () => {
    if (categoriaId === undefined || nombre === undefined) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get<PaginatedResponse<Item>>('/items', {
        params: {
          categoriaId,
          nombre,
          page,
          pageSize: UNITS_PAGE_SIZE,
        },
      });
      if (requestId !== requestIdRef.current) return;
      setUnits(response.data.data);
      setTotal(response.data.total);
      setTotalPages(Math.max(1, response.data.totalPages));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(getErrorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [categoriaId, nombre, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeState = async (unit: Item, estado: ItemStatus) => {
    setSavingId(unit.id);
    try {
      await api.patch(`/items/${unit.id}`, { estado });
      success(`${unit.codigoSerie}: ${itemStatusLabels[estado]}.`);
      await load();
      onChanged();
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/items/${deleteTarget.id}`);
      success(`Unidad ${deleteTarget.codigoSerie} eliminada.`);
      setDeleteTarget(null);
      if (units.length === 1 && page > 1) setPage(page - 1);
      else await load();
      onChanged();
    } catch (error) {
      showError(getErrorMessage(error));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal
        open={Boolean(group)}
        onClose={onClose}
        title={group ? `Unidades de ${group.nombre}` : 'Unidades'}
        description={
          group
            ? `${group.categoria.nombre} · ${group.total} ${
                group.total === 1 ? 'unidad registrada' : 'unidades registradas'
              }. ${
                isAdmin
                  ? 'Cambia el estado de una unidad para enviarla a mantenimiento o retirarla.'
                  : ''
              }`
            : undefined
        }
        size="lg"
        footer={
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        }
      >
        {loadError && <ErrorAlert message={loadError} onRetry={() => void load()} />}
        {loading && units.length === 0 ? (
          <LoadingBlock message="Cargando unidades…" />
        ) : (
          <div className="space-y-3">
            <ul
              className="divide-y divide-slate-100 rounded-xl border border-slate-100"
              aria-label="Unidades del implemento"
            >
              {units.map((unit) => (
                <li
                  key={unit.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {unit.codigoSerie}
                  </span>
                  <div className="flex items-center gap-2">
                    {isAdmin && unit.estado !== 'ALQUILADO' ? (
                      <Select
                        aria-label={`Estado de ${unit.codigoSerie}`}
                        value={unit.estado}
                        disabled={savingId === unit.id}
                        onChange={(event) =>
                          void changeState(unit, event.target.value as ItemStatus)
                        }
                        className="h-9 w-44 py-1 text-xs"
                      >
                        {MANUAL_STATES.map((state) => (
                          <option key={state} value={state}>
                            {itemStatusLabels[state]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <ItemStatusBadge status={unit.estado} />
                    )}
                    {isAdmin && (
                      <IconButton
                        icon={Trash2}
                        label={`Eliminar unidad ${unit.codigoSerie}`}
                        variant="danger"
                        disabled={unit.estado === 'ALQUILADO'}
                        onClick={() => setDeleteTarget(unit)}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Página {page} de {totalPages} · {total} unidades
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    icon={<ArrowLeft className="h-4 w-4" />}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Siguiente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar unidad"
        description={`¿Eliminar la unidad ${deleteTarget?.codigoSerie ?? ''}? Solo es posible si nunca ha sido alquilada; si tiene historial, cámbiala a Fuera de servicio.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </>
  );
}
