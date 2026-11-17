import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { FullPageLoader } from './components/ui/Feedback';
import { CategoriesPage } from './pages/CategoriesPage';
import { ClientsPage } from './pages/ClientsPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { LoginPage } from './pages/LoginPage';
import { NewRentalPage } from './pages/NewRentalPage';
import { NewReturnPage } from './pages/NewReturnPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { RentalDetailPage } from './pages/RentalDetailPage';
import { RentalsPage } from './pages/RentalsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { UsersPage } from './pages/UsersPage';

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
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
