import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ModalProvider } from './context/ModalContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Layout } from './components/common/Layout';
import { Login } from './components/auth/Login';
import { CatalogoProductos } from './components/productos/CatalogoProductos';
import { CarritoCompras } from './components/ventas/CarritoCompras';
import { HistorialVentas } from './components/ventas/HistorialVentas';
import { SolicitudesPendientes } from './components/entregas/SolicitudesPendientes';
import { ConfirmarEntrega } from './components/entregas/ConfirmarEntrega';
import { ConfirmarDespachoAutoconsumo } from './components/entregas/ConfirmarDespachoAutoconsumo';
import { RegistrarNoEntregado } from './components/entregas/RegistrarNoEntregado';
import { PermissionGuard } from './components/common/PermissionGuard';
import { PanelInventario } from './components/productos/PanelInventario';
import { PanelTTHH } from './components/reportes/PanelTTHH';
import { PanelAdminEmpleados } from './components/admin/PanelAdminEmpleados';
import { PanelAdminUsuarios } from './components/admin/PanelAdminUsuarios';
import { PanelAdminCrudGeneral } from './components/admin/PanelAdminCrudGeneral';
import { PanelRequerimientos } from './components/productos/PanelRequerimientos';
import { RecepcionRequerimientos } from './components/productos/RecepcionRequerimientos';

import { useAuth } from './context/AuthContext';

function Home() {
  const { user, isShopSession } = useAuth();

  if (isShopSession) {
    return <CarritoCompras />;
  }

  if (user?.rol.nombre === 'empleado' || user?.rol.nombre === 'empleado_autorizado') {
    return <CarritoCompras />;
  }
  if (user?.rol.nombre === 'admin') {
    return <Navigate to="/admin/empleados" replace />;
  }
  if (user?.rol.nombre === 'inventario') {
    return <Navigate to="/inventario" replace />;
  }
  if (user?.rol.nombre === 'tthh') {
    return <Navigate to="/tthh" replace />;
  }
  if (user?.rol.nombre === 'guardia') {
    return <Navigate to="/entregas" replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SocketProvider>
          <ModalProvider>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/productos" element={
              <ProtectedRoute>
                <Layout>
                  <PermissionGuard permiso="productos.ver">
                    <CatalogoProductos />
                  </PermissionGuard>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/ventas/nueva" element={
              <ProtectedRoute>
                <Layout>
                  <PermissionGuard permiso="ventas.realizar">
                    <CarritoCompras />
                  </PermissionGuard>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/ventas/historial" element={
              <ProtectedRoute>
                <Layout>
                  <PermissionGuard permiso="ventas.ver">
                    <HistorialVentas />
                  </PermissionGuard>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/entregas" element={
              <ProtectedRoute>
                <Layout>
                  <PermissionGuard permiso="entregas.ver_pendientes">
                    <SolicitudesPendientes />
                  </PermissionGuard>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/entregas/:id" element={
              <ProtectedRoute>
                <Layout>
                  <PermissionGuard permiso="entregas.confirmar">
                    <ConfirmarEntrega />
                  </PermissionGuard>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/entregas/:id/no-entregado" element={
              <ProtectedRoute>
                <Layout>
                  <PermissionGuard permiso="entregas.confirmar">
                    <RegistrarNoEntregado />
                  </PermissionGuard>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/entregas/autoconsumos/:id/despacho" element={
              <ProtectedRoute>
                <Layout>
                  <PermissionGuard permiso="autoconsumo.entregar">
                    <ConfirmarDespachoAutoconsumo />
                  </PermissionGuard>
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/inventario" element={
              <ProtectedRoute>
                <Layout>
                  <PanelInventario />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/requerimientos" element={
              <ProtectedRoute>
                <Layout>
                  <PanelRequerimientos />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/recepcion-requerimientos" element={
              <ProtectedRoute>
                <Layout>
                  <RecepcionRequerimientos />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/tthh" element={
              <ProtectedRoute>
                <Layout>
                  <PanelTTHH />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/empleados" element={
              <ProtectedRoute>
                <Layout>
                  <PermissionGuard permiso="empleados.crear">
                    <PanelAdminEmpleados />
                  </PermissionGuard>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/usuarios" element={
              <ProtectedRoute>
                <Layout>
                  <PermissionGuard permiso="empleados.crear">
                    <PanelAdminUsuarios />
                  </PermissionGuard>
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/tablas" element={
              <ProtectedRoute>
                <Layout>
                  <PanelAdminCrudGeneral />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ModalProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
