import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { FullPageLoader } from './components/ui/Feedback';
import { LoginPage } from './pages/LoginPage';
// Carga diferida por ruta: reduce el JavaScript inicial (eficiencia de desempeño).
const CategoriesPage = lazy(() =>
  import('./pages/CategoriesPage').then((module) => ({ default: module.CategoriesPage })),
);
const ClientsPage = lazy(() =>
  import('./pages/ClientsPage').then((module) => ({ default: module.ClientsPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const InventoryPage = lazy(() =>
  import('./pages/InventoryPage').then((module) => ({ default: module.InventoryPage })),
);
const InvoicesPage = lazy(() =>
  import('./pages/InvoicesPage').then((module) => ({ default: module.InvoicesPage })),
);
const NewRentalPage = lazy(() =>
  import('./pages/NewRentalPage').then((module) => ({ default: module.NewRentalPage })),
);
const NewReturnPage = lazy(() =>
  import('./pages/NewReturnPage').then((module) => ({ default: module.NewReturnPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })),
);
const RentalDetailPage = lazy(() =>
  import('./pages/RentalDetailPage').then((module) => ({
    default: module.RentalDetailPage,
  })),
);
const RentalsPage = lazy(() =>
  import('./pages/RentalsPage').then((module) => ({ default: module.RentalsPage })),
);
const AppearancePage = lazy(() =>
  import('./pages/AppearancePage').then((module) => ({ default: module.AppearancePage })),
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })),
);
const ReturnsPage = lazy(() =>
  import('./pages/ReturnsPage').then((module) => ({ default: module.ReturnsPage })),
);
const UsersPage = lazy(() =>
  import('./pages/UsersPage').then((module) => ({ default: module.UsersPage })),
);

function RequireAuth() {
  const { usuario, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  if (usuario?.rol !== 'ADMIN') {
    return <Navigate to="/inventario" replace />;
  }
  return <>{children}</>;
}

function HomeRedirect() {
  const { usuario } = useAuth();
  if (usuario?.rol === 'ADMIN') {
    return <DashboardPage />;
  }
  return <Navigate to="/inventario" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="panel" element={<Navigate to="/" replace />} />
            <Route path="inventario" element={<InventoryPage />} />
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="alquileres" element={<RentalsPage />} />
            <Route path="alquileres/nuevo" element={<NewRentalPage />} />
            <Route path="alquileres/:id" element={<RentalDetailPage />} />
            <Route path="devoluciones" element={<ReturnsPage />} />
            <Route path="devoluciones/nueva/:id" element={<NewReturnPage />} />
            <Route path="cartera" element={<InvoicesPage />} />
            <Route
              path="reportes"
              element={
                <AdminOnly>
                  <ReportsPage />
                </AdminOnly>
              }
            />
            <Route
              path="categorias"
              element={
                <AdminOnly>
                  <CategoriesPage />
                </AdminOnly>
              }
            />
            <Route
              path="usuarios"
              element={
                <AdminOnly>
                  <UsersPage />
                </AdminOnly>
              }
            />
            <Route
              path="apariencia"
              element={
                <AdminOnly>
                  <AppearancePage />
                </AdminOnly>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
