export type UserRole = 'ADMIN' | 'EMPLEADO';

export type ItemStatus =
  'DISPONIBLE' | 'ALQUILADO' | 'MANTENIMIENTO' | 'FUERA_DE_SERVICIO';

export type RentalStatus = 'ACTIVO' | 'FINALIZADO' | 'VENCIDO';

export type DeliveryStatus = 'DISPONIBLE' | 'MANTENIMIENTO' | 'FUERA_DE_SERVICIO';

export type InvoiceStatus = 'PENDIENTE' | 'PAGADA' | 'VENCIDA';

export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTRO';

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

/** Tipo de implemento: todas las unidades con la misma categoría y nombre. */
export interface ItemGroup {
  categoriaId: number;
  nombre: string;
  categoria: Pick<Category, 'id' | 'nombre' | 'prefijo'>;
  descripcion: string | null;
  imagenUrl: string | null;
  precioMin: string;
  precioMax: string;
  total: number;
  disponibles: number;
  alquilados: number;
  mantenimiento: number;
  fueraDeServicio: number;
}

export interface ItemGroupsResponse extends PaginatedResponse<ItemGroup> {
  totalUnidades: number;
}

export interface ClientPortfolio {
  saldoPendiente: string;
  facturasPendientes: number;
  facturasVencidas: number;
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
  cartera?: ClientPortfolio;
}

export interface Payment {
  id: number;
  facturaId: number;
  usuarioId: number;
  monto: string;
  metodoPago: PaymentMethod;
  referencia: string | null;
  fechaPago: string;
  createdAt: string;
  usuario: User;
}

export interface InvoiceRentalSummary {
  id: number;
  codigoAlquiler: string;
  fechaAlquiler: string;
  fechaPactadaDevolucion: string;
  estado: RentalStatus;
}

export interface Invoice {
  id: number;
  codigoFactura: string;
  alquilerId: number;
  clienteId: number;
  fechaEmision: string;
  fechaVencimiento: string;
  total: string;
  saldo: string;
  estado: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  cliente?: Client;
  alquiler?: InvoiceRentalSummary;
  pagos?: Payment[];
  /** Desglose a la fecha: alquiler pactado + retraso = total. */
  desglose?: InvoiceBreakdownData;
}

export interface InvoiceBreakdownData {
  tarifaDiaria: string;
  diasPactados: number;
  diasAlquiler: number;
  montoAlquiler: string;
  diasRetraso: number;
  montoRetraso: string;
  total: string;
  pagado: string;
  saldo: string;
  /** El equipo no se ha devuelto y el retraso sigue sumando. */
  retrasoEnCurso: boolean;
}

export interface PendingInvoicesResponse {
  clienteId: number;
  cliente: Client;
  totalSaldo: string;
  cantidad: number;
  vencidas: number;
  facturas: Invoice[];
}

export interface RentalCarteraAuthorization {
  motivo: string;
  adminEmail?: string;
  adminPassword?: string;
}

export interface CreatePaymentPayload {
  monto: number;
  metodoPago: PaymentMethod;
  referencia?: string;
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
  alertaCartera?: boolean;
  saldoCarteraAlerta?: string | null;
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
  factura?: Invoice | null;
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
  code?: string;
}
