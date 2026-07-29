import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoEmpresa from '../../assets/logo.png';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const rol = user?.rol.nombre;

  return (
    <nav className="bg-white border-b border-gray-200 text-gray-800 font-sans shadow-sm">
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
            
            <div className="hidden md:flex items-center space-x-1">
              {/* Guardia / Admin */}
              {(rol === 'guardia' || rol === 'admin') && (
                <Link to="/entregas" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition">
                  Entregas
                </Link>
              )}
              
              {/* Recepción de Requerimientos */}
              {(rol === 'admin' || rol === 'guardia' || rol === 'inventario') && (
                <Link to="/recepcion-requerimientos" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition">
                  Recepción Reqs
                </Link>
              )}
              
              {/* Inventario / Admin / Guardia */}
              {(rol === 'inventario' || rol === 'admin' || rol === 'guardia') && (
                <>
                  <Link to="/inventario" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition">
                    Inventario
                  </Link>
                  {(rol === 'inventario' || rol === 'admin') && (
                    <>
                      <Link to="/requerimientos" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition">
                        Requerimientos
                      </Link>
                      {rol === 'inventario' && (
                        <Link to="/admin/tablas" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition">
                          Catálogos
                        </Link>
                      )}
                    </>
                  )}
                </>
              )}

              {/* TTHH / Admin */}
              {(rol === 'tthh' || rol === 'admin') && (
                <Link to="/tthh" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition">
                  Reportes
                </Link>
              )}

              {/* Solo Admin */}
              {rol === 'admin' && (
                <>
                  <Link to="/admin/empleados" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition">
                    Colaboradores
                  </Link>
                  <Link to="/admin/usuarios" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition">
                    Operadores
                  </Link>
                  <Link to="/admin/tablas" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition">
                    Tablas Maestras
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="font-semibold text-gray-800">{user?.nombre}</span>
              <span className="text-gray-400 uppercase tracking-wider font-bold text-[9px] mt-0.5">{user?.rol.nombre}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-lg border border-gray-300 hover:border-gray-500 hover:bg-gray-50 text-gray-600 hover:text-gray-800 text-xs font-semibold transition"
            >
              Cerrar Sesión
            </button>

            {/* Botón menú hamburguesa en móviles */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-55 transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* Menú móvil desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 py-3 px-4 bg-gray-50 space-y-1.5 transition duration-150 animate-fade-in shadow-inner">
          {/* Guardia / Admin */}
          {(rol === 'guardia' || rol === 'admin') && (
            <Link
              to="/entregas"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
            >
              Entregas
            </Link>
          )}

          {/* Recepción de Requerimientos */}
          {(rol === 'admin' || rol === 'guardia' || rol === 'inventario') && (
            <Link
              to="/recepcion-requerimientos"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
            >
              Recepción Reqs
            </Link>
          )}

          {/* Inventario / Admin / Guardia */}
          {(rol === 'inventario' || rol === 'admin' || rol === 'guardia') && (
            <>
              <Link
                to="/inventario"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
              >
                Inventario
              </Link>
              {(rol === 'inventario' || rol === 'admin') && (
                <>
                  <Link
                    to="/requerimientos"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
                  >
                    Requerimientos
                  </Link>
                  {rol === 'inventario' && (
                    <Link
                      to="/admin/tablas"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
                    >
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
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
            >
              Reportes
            </Link>
          )}

          {/* Solo Admin */}
          {rol === 'admin' && (
            <>
              <Link
                to="/admin/empleados"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
              >
                Colaboradores
              </Link>
              <Link
                to="/admin/usuarios"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
              >
                Operadores
              </Link>
              <Link
                to="/admin/tablas"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
              >
                Tablas Maestras
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};
