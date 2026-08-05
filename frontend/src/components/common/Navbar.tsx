import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoEmpresa from '../../assets/logo.png';
import { BsList, BsX, BsBoxSeam, BsClipboardCheck, BsBoxes, BsFileEarmarkText, BsBarChart, BsPeople, BsPersonGear, BsGrid1X2Fill, BsBoxArrowRight } from 'react-icons/bs';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { user, logout, isShopSession, setIsShopSession } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const rol = user?.rol.nombre;

  return (
    <nav className="bg-white border-b border-gray-200 text-gray-800 font-sans shadow-sm sticky top-0 z-50">
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
                <Link to="/entregas" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-55 transition flex items-center gap-1.5">
                  <BsBoxSeam className="h-4 w-4" />
                  Entregas
                </Link>
              )}
              
              {/* Recepción de Requerimientos */}
              {(rol === 'admin' || rol === 'guardia' || rol === 'inventario') && (
                <Link to="/recepcion-requerimientos" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-55 transition flex items-center gap-1.5">
                  <BsClipboardCheck className="h-4 w-4" />
                  Recepción Reqs
                </Link>
              )}
              
              {/* Inventario / Admin / Guardia */}
              {(rol === 'inventario' || rol === 'admin' || rol === 'guardia') && (
                <>
                  <Link to="/inventario" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-55 transition flex items-center gap-1.5">
                    <BsBoxes className="h-4 w-4" />
                    Inventario
                  </Link>
                  {(rol === 'inventario' || rol === 'admin') && (
                    <>
                      <Link to="/requerimientos" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-55 transition flex items-center gap-1.5">
                        <BsFileEarmarkText className="h-4 w-4" />
                        Requerimientos
                      </Link>
                      {rol === 'inventario' && (
                        <Link to="/admin/tablas" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-55 transition flex items-center gap-1.5">
                          <BsGrid1X2Fill className="h-4 w-4" />
                          Catálogos
                        </Link>
                      )}
                    </>
                  )}
                </>
              )}

              {/* TTHH / Admin */}
              {(rol === 'tthh' || rol === 'admin') && (
                <Link to="/tthh" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-55 transition flex items-center gap-1.5">
                  <BsBarChart className="h-4 w-4" />
                  Reportes
                </Link>
              )}

              {/* Solo Admin */}
              {rol === 'admin' && (
                <>
                  <Link to="/admin/empleados" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-55 transition flex items-center gap-1.5">
                    <BsPeople className="h-4 w-4" />
                    Colaboradores
                  </Link>
                  <Link to="/admin/usuarios" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-55 transition flex items-center gap-1.5">
                    <BsPersonGear className="h-4 w-4" />
                    Operadores
                  </Link>
                  <Link to="/admin/tablas" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-55 transition flex items-center gap-1.5">
                    <BsGrid1X2Fill className="h-4 w-4" />
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
            {!isShopSession && (user?.rol.nombre === 'empleado' || user?.rol.nombre === 'empleado_autorizado' || user?.rol.nombre === 'empleado_autorizado_firmar') && (
              <button
                onClick={() => {
                  localStorage.setItem('isShopSession', 'true');
                  setIsShopSession(true);
                  navigate('/');
                }}
                className="px-4 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition flex items-center gap-1.5 active:scale-95"
              >
                Volver a Compras
              </button>
            )}
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

          {/* Recepción de Requerimientos */}
          {(rol === 'admin' || rol === 'guardia' || rol === 'inventario') && (
            <Link
              to="/recepcion-requerimientos"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
            >
              <BsClipboardCheck className="h-4 w-4 text-gray-400" />
              Recepción Reqs
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
                  <Link
                    to="/requerimientos"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
                  >
                    <BsFileEarmarkText className="h-4 w-4 text-gray-400" />
                    Requerimientos
                  </Link>
                  {rol === 'inventario' && (
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

          {/* Solo Admin */}
          {rol === 'admin' && (
            <>
              <Link
                to="/admin/empleados"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
              >
                <BsPeople className="h-4 w-4 text-gray-400" />
                Colaboradores
              </Link>
              <Link
                to="/admin/usuarios"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
              >
                <BsPersonGear className="h-4 w-4 text-gray-400" />
                Operadores
              </Link>
              <Link
                to="/admin/tablas"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex items-center gap-2"
              >
                <BsGrid1X2Fill className="h-4 w-4 text-gray-400" />
                Tablas Maestras
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};
