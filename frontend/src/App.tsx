import { useState, useEffect, useRef } from 'react';
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

function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [renderComponent, setRenderComponent] = useState(false);
  const [opacityClass, setOpacityClass] = useState('opacity-0 translate-y-4 pointer-events-none');
  const [showInstructions, setShowInstructions] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');

  const fadeTimerRef = useRef<any>(null);

  useEffect(() => {
    // Detectar tipo de dispositivo
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceType('ios');
    } else if (/android/.test(ua)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isDismissed = sessionStorage.getItem('pwa_installer_dismissed') === 'true';

    // Función interna para mostrar el popup de forma gradual y controlar su desvanecimiento
    const triggerShow = () => {
      if (isStandalone || isDismissed) return;

      setRenderComponent(true);
      
      // Delay mínimo para permitir que React monte el componente en el DOM antes de aplicar la transición CSS
      setTimeout(() => {
        setOpacityClass('opacity-100 translate-y-0');
      }, 50);

      // Limpiar cualquier temporizador previo
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }

      // Temporizador para desvanecer la galletita tras 8 segundos de visibilidad
      // (Dando tiempo óptimo al usuario para ver e interactuar)
      fadeTimerRef.current = setTimeout(() => {
        setOpacityClass('opacity-0 translate-y-4 pointer-events-none');
        // Desmontar físicamente del DOM tras finalizar la animación de 500ms
        setTimeout(() => {
          setRenderComponent(false);
        }, 500);
      }, 8000);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      triggerShow();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Activar fallback a los 2 segundos si el prompt nativo no responde al instante
    const initialTimer = setTimeout(() => {
      triggerShow();
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(initialTimer);
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    // Pausar desvanecimiento automático cuando el cursor está sobre la galletita
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    // Si el cursor sale y no se están mostrando instrucciones, programar desvanecimiento en 3 segundos
    if (!showInstructions) {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = setTimeout(() => {
        setOpacityClass('opacity-0 translate-y-4 pointer-events-none');
        setTimeout(() => {
          setRenderComponent(false);
        }, 500);
      }, 3000);
    }
  };

  const handleInstallClick = async () => {
    // Cancelar definitivamente el desvanecimiento automático al interactuar
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Usuario respondió al prompt de instalación: ${outcome}`);
      setDeferredPrompt(null);
      setOpacityClass('opacity-0 translate-y-4 pointer-events-none');
      setTimeout(() => {
        setRenderComponent(false);
      }, 500);
    } else {
      setShowInstructions(true);
    }
  };

  const handleClose = () => {
    sessionStorage.setItem('pwa_installer_dismissed', 'true');
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
    }
    setOpacityClass('opacity-0 translate-y-4 pointer-events-none');
    setTimeout(() => {
      setRenderComponent(false);
    }, 500);
  };

  if (!renderComponent) return null;

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[400px] bg-white/95 backdrop-blur-lg border border-gray-200 shadow-2xl rounded-2xl p-5 sm:p-6 z-[9999] flex flex-col space-y-4 font-sans transition-all duration-500 ease-out ${opacityClass}`}
    >
      {!showInstructions ? (
        <>
          <div className="flex items-start gap-4">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl text-2xl flex items-center justify-center shrink-0 shadow-sm">
              📲
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-950 tracking-tight">Instalar Aplicación</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Agrega el Punto de Venta a tu pantalla de inicio. Disfruta de un acceso rápido a pantalla completa y mejor rendimiento.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-455 hover:text-gray-700 transition p-1 text-base font-bold leading-none rounded-lg hover:bg-gray-50"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-3 justify-end pt-1">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-55 text-gray-600 rounded-xl text-xs font-bold transition active:scale-95"
            >
              Ahora no
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition active:scale-95"
            >
              Instalar
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col space-y-4">
          <div className="flex items-start gap-4">
            <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl text-2xl flex items-center justify-center shrink-0 shadow-sm">
              💡
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-950 tracking-tight">¿Cómo instalar en tu dispositivo?</h4>
              
              {deviceType === 'ios' && (
                <div className="text-xs text-gray-655 mt-2.5 space-y-2 leading-relaxed">
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Abre la app en el navegador <span className="font-semibold text-gray-900">Safari</span>.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Pulsa el botón de <span className="font-semibold text-gray-900">Compartir</span> (el icono del cuadrado con una flecha hacia arriba abajo en la pantalla).</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>Selecciona la opción <span className="font-semibold text-gray-900">"Añadir a la pantalla de inicio"</span>.</span>
                  </p>
                </div>
              )}

              {deviceType === 'android' && (
                <div className="text-xs text-gray-655 mt-2.5 space-y-2 leading-relaxed">
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Pulsa el botón de <span className="font-semibold text-gray-900">tres puntos (⋮)</span> en la esquina superior derecha de Chrome.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Selecciona la opción <span className="font-semibold text-gray-900">"Instalar aplicación"</span> o <span className="font-semibold text-gray-900">"Añadir a pantalla de inicio"</span>.</span>
                  </p>
                  <p className="text-[10px] text-amber-700 bg-amber-50/50 p-2 rounded-lg mt-2 font-medium">
                    ⚠️ *Nota:* Al estar en red local (HTTP), debes activar la flag de orígenes no seguros en tu navegador Chrome.
                  </p>
                </div>
              )}

              {deviceType === 'desktop' && (
                <div className="text-xs text-gray-655 mt-2.5 space-y-2 leading-relaxed">
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Haz clic en el icono de <span className="font-semibold text-gray-900">monitor/instalación</span> ubicado al lado derecho de la barra de direcciones superior.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>O ve a los <span className="font-semibold text-gray-900">tres puntos (⋮)</span> de tu navegador y selecciona <span className="font-semibold text-gray-900">"Instalar POS Kiosco"</span>.</span>
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-455 hover:text-gray-700 transition p-1 text-base font-bold leading-none rounded-lg hover:bg-gray-50"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setShowInstructions(false);
                setOpacityClass('opacity-0 translate-y-4 pointer-events-none');
                setTimeout(() => {
                  setRenderComponent(false);
                }, 500);
              }}
              className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
          <PwaInstaller />
          </ModalProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
