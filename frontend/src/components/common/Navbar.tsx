import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoEmpresa from '../../assets/logo.png';
import { BsList, BsX, BsBoxSeam, BsCartCheck, BsBoxes, BsBarChart, BsPeople, BsPersonGear, BsGrid1X2Fill, BsBoxArrowRight, BsHouseDoor } from 'react-icons/bs';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { user, logout, isShopSession, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const rol = user?.rol.nombre;

  // Determinar si una ruta está activa
  const isRouteActive = (basePath: string) => {
    if (basePath === '/') return location.pathname === '/';
    return location.pathname.startsWith(basePath);
  };

  // Renderizador de enlaces de navegación con señal interactiva / nube indicadora
  const renderNavLink = (to: string, label: string, icon: React.ReactNode) => {
    const active = isRouteActive(to);

    return (
      <Link
        to={to}
        key={to}
        className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
          active
            ? 'bg-gray-900 text-white shadow-sm ring-1 ring-gray-900'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        <span className="text-sm shrink-0">{icon}</span>
        <span>{label}</span>

        {/* Nube / Señal indicadora del módulo activo */}
        {active && (
          <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
            {/* Triángulo tipo flecha / bocadillo de diálogo apuntando hacia abajo al contenido */}
            <span className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 drop-shadow-xs animate-bounce" />
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav className="bg-white border-b border-gray-200 text-gray-800 font-sans shadow-xs sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center select-none">
              <img 
                src={logoEmpresa} 
                alt="Logotipo Oficial" 
                className="h-8 w-auto object-contain"
              />
            </Link>
            
            <div className="hidden md:flex items-center space-x-1.5">
              {!isShopSession && <>
              {/* Inicio / Dashboard */}
              {renderNavLink('/', 'Inicio', <BsHouseDoor />)}

              {/* Guardia / Admin */}
              {(rol === 'guardia' || rol === 'admin') && (
                renderNavLink('/entregas', 'Entregas', <BsBoxSeam />)
              )}
              
              {(rol === 'admin' || hasPermission('compras.ver') || hasPermission('compras.requerimientos.crear') || hasPermission('compras.requerimientos.aprobar') || hasPermission('compras.requerimientos.recibir')) && (
                renderNavLink('/compras', 'Compras', <BsCartCheck />)
              )}
              
              {/* Inventario / Admin / Guardia */}
              {(rol === 'inventario' || rol === 'admin' || rol === 'guardia') && (
                <>
                  {renderNavLink('/inventario', 'Inventario', <BsBoxes />)}
                  {(rol === 'inventario' || rol === 'admin') && (
                    <>
                      {rol === 'inventario' && !hasPermission('roles.ver') && !hasPermission('roles.crear') && (
                        renderNavLink('/admin/tablas', 'Catálogos', <BsGrid1X2Fill />)
                      )}
                    </>
                  )}
                </>
              )}

              {/* TTHH / Admin */}
              {(rol === 'tthh' || rol === 'admin') && (
                renderNavLink('/tthh', 'Reportes', <BsBarChart />)
              )}

              {/* Módulos de Administración / Configuración */}
              {(rol === 'admin' || hasPermission('empleados.ver') || hasPermission('empleados.crear')) && (
                renderNavLink('/admin/empleados', 'Colaboradores', <BsPeople />)
              )}
              {(rol === 'admin' || hasPermission('usuarios.ver') || hasPermission('usuarios.crear')) && (
                renderNavLink('/admin/usuarios', 'Operadores', <BsPersonGear />)
              )}
              {(rol === 'admin' || hasPermission('roles.ver') || hasPermission('roles.crear') || hasPermission('configuracion.ver')) && (
                renderNavLink('/admin/tablas', 'Tablas Maestras', <BsGrid1X2Fill />)
              )}
              </>}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="font-semibold text-gray-800">{user?.nombre}</span>
              <span className="text-gray-400 uppercase tracking-wider font-bold text-[9px] mt-0.5">{user?.rol.nombre}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-500 hover:bg-gray-55 text-gray-600 hover:text-gray-800 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <BsBoxArrowRight className="h-4 w-4" />
              Cerrar Sesión
            </button>

            {/* Botón menú hamburguesa en móviles */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-55 transition"
            >
              {mobileMenuOpen ? (
                <BsX className="h-5 w-5" />
              ) : (
                <BsList className="h-5 w-5" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Menú móvil desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 py-3 px-4 bg-gray-50 space-y-1.5 transition duration-150 animate-fade-in shadow-inner">
          {!isShopSession && <>
          {/* Inicio / Dashboard */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
          >
            <BsHouseDoor className="h-4 w-4 text-gray-400" />
            Inicio
          </Link>

          {/* Guardia / Admin */}
          {(rol === 'guardia' || rol === 'admin') && (
            <Link
              to="/entregas"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
            >
              <BsBoxSeam className="h-4 w-4 text-gray-400" />
              Entregas
            </Link>
          )}

          {(rol === 'admin' || hasPermission('compras.ver') || hasPermission('compras.requerimientos.crear') || hasPermission('compras.requerimientos.aprobar') || hasPermission('compras.requerimientos.recibir')) && (
            <Link
              to="/compras"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
            >
              <BsCartCheck className="h-4 w-4 text-gray-400" />
              Compras
            </Link>
          )}

          {/* Inventario / Admin / Guardia */}
          {(rol === 'inventario' || rol === 'admin' || rol === 'guardia') && (
            <>
              <Link
                to="/inventario"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
              >
                <BsBoxes className="h-4 w-4 text-gray-400" />
                Inventario
              </Link>
              {(rol === 'inventario' || rol === 'admin') && (
                <>
                  {rol === 'inventario' && !hasPermission('roles.ver') && !hasPermission('roles.crear') && (
                    <Link
                      to="/admin/tablas"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
                    >
                      <BsGrid1X2Fill className="h-4 w-4 text-gray-400" />
                      Catálogos
                    </Link>
                  )}
                </>
              )}
            </>
          )}

          {/* Reportes */}
          {(rol === 'tthh' || rol === 'admin') && (
            <Link
              to="/tthh"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
            >
              <BsBarChart className="h-4 w-4 text-gray-400" />
              Reportes
            </Link>
          )}

          {/* Módulos de Administración / Configuración en móviles */}
          {(rol === 'admin' || hasPermission('empleados.ver') || hasPermission('empleados.crear')) && (
            <Link
              to="/admin/empleados"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
            >
              <BsPeople className="h-4 w-4 text-gray-400" />
              Colaboradores
            </Link>
          )}
          {(rol === 'admin' || hasPermission('usuarios.ver') || hasPermission('usuarios.crear')) && (
            <Link
              to="/admin/usuarios"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
            >
              <BsPersonGear className="h-4 w-4 text-gray-400" />
              Operadores
            </Link>
          )}
          {(rol === 'admin' || hasPermission('roles.ver') || hasPermission('roles.crear') || hasPermission('configuracion.ver')) && (
            <Link
              to="/admin/tablas"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
            >
              <BsGrid1X2Fill className="h-4 w-4 text-gray-400" />
              Tablas Maestras
            </Link>
          )}
          </>}
        </div>
      )}
    </nav>
  );
};
