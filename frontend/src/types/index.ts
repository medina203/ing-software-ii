export type UserRole = 'ADMIN' | 'EMPLEADO';

export type ItemStatus =
  'DISPONIBLE' | 'ALQUILADO' | 'MANTENIMIENTO' | 'FUERA_DE_SERVICIO';

export type RentalStatus = 'ACTIVO' | 'FINALIZADO' | 'VENCIDO';

export type DeliveryStatus = 'DISPONIBLE' | 'MANTENIMIENTO' | 'FUERA_DE_SERVICIO';

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  createdAt?: string;
}

export interface Category {
  id: number;
  nombre: string;
  prefijo: string;
  ultimoConsecutivo: number;
  descripcion: string | null;
  createdAt?: string;
  _count?: { implementos: number };
}

export interface Item {
  id: number;
  codigoSerie: string;
  nombre: string;
  categoriaId: number;
  descripcion: string | null;
  precioAlquilerDiario: string;
  estado: ItemStatus;
  createdAt?: string;
  categoria: Pick<Category, 'id' | 'nombre'>;
}

export interface Client {
  id: number;
  documentoIdentidad: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string | null;
  direccion: string | null;
  createdAt?: string;
  _count?: { alquileres: number };
}

export interface RentalDetail {
  id: number;
  alquilerId?: number;
  implementoId: number;
  precioUnitario: string;
  implemento: Item;
}

export interface ReturnDetail {
  id: number;
  devolucionId?: number;
  implementoId: number;
  estadoFinal: DeliveryStatus;
  observaciones: string | null;
  implemento: Item;
}

export interface ReturnRecord {
  id: number;
  alquilerId: number;
  fechaDevolucion: string;
  usuarioId: number;
  estadoEntregaImplementos: string;
  observaciones: string | null;
  createdAt: string;
  usuario: User;
  detalles: ReturnDetail[];
  alquiler?: {
    id: number;
    codigoAlquiler: string;
    fechaAlquiler: string;
    fechaPactadaDevolucion: string;
    estado: RentalStatus;
    cliente: Client;
    usuario: User;
    detalles: RentalDetail[];
  };
}

export interface Rental {
  id: number;
  codigoAlquiler: string;
  clienteId: number;
  usuarioId: number;
  fechaAlquiler: string;
  fechaPactadaDevolucion: string;
  estado: RentalStatus;
  observaciones: string | null;
  createdAt: string;
  cliente: Client;
  usuario: User;
  detalles: RentalDetail[];
  devolucion?: ReturnRecord | null;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
}

export interface PaginatedResponse<T> extends ListResponse<T> {
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LoginResponse {
  accessToken: string;
  usuario: User;
}

export interface StateBreakdown {
  estado: ItemStatus;
  cantidad: number;
  porcentaje: number;
}

export interface TopItem {
  posicion: number;
  totalAlquileres: number;
  implemento: Item | null;
}

export interface DashboardSummary {
  totalImplementos: number;
  disponibles: number;
  alquilados: number;
  mantenimiento: number;
  fueraDeServicio: number;
  alquileresEnCurso: number;
  alquileresVencidos: number;
  clientesRegistrados: number;
  devolucionesEsteMes: number;
}

export interface DashboardData {
  generadoEn: string;
  fechaCorte: string;
  resumen: DashboardSummary;
  porEstado: StateBreakdown[];
  topImplementos: TopItem[];
  alquileresActivos: Rental[];
}

export interface DailyRevenuePoint {
  fecha: string;
  total: number;
  alquileres: number;
}

export interface DailyRevenueReport {
  desde: string;
  hasta: string;
  dias: number;
  total: number;
  promedioDiario: number;
  data: DailyRevenuePoint[];
}

export interface MonthlyRevenuePoint {
  mes: number;
  nombre: string;
  total: number;
  alquileres: number;
}

export interface MonthlyRevenueReport {
  year: number;
  total: number;
  meses: MonthlyRevenuePoint[];
}

export interface InventorySummary {
  total: number;
  porEstado: StateBreakdown[];
}

export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}
