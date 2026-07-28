// frontend/src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authAPI } from '../api/auth.api';
import { Permiso } from '../types/permisos';
import { Usuario } from '../types';

interface AuthContextType {
  user: Usuario | null;
  loading: boolean;
  isShopSession: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginByCedula: (cedula: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permiso: Permiso) => boolean;
  hasAnyPermission: (...permisos: Permiso[]) => boolean;
  hasAllPermissions: (...permisos: Permiso[]) => boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isShopSession, setIsShopSession] = useState<boolean>(false);
  const lastActivity = useRef<number>(Date.now());

  const hasPermission = (permiso: Permiso): boolean => {
    if (!user) return false;
    if (user.rol.nombre === 'admin') return true;
    return user.rol.permisos.includes(permiso);
  };

  const hasAnyPermission = (...permisos: Permiso[]): boolean => {
    if (!user) return false;
    if (user.rol.nombre === 'admin') return true;
    return permisos.some(p => user.rol.permisos.includes(p));
  };

  const hasAllPermissions = (...permisos: Permiso[]): boolean => {
    if (!user) return false;
    if (user.rol.nombre === 'admin') return true;
    return permisos.every(p => user.rol.permisos.includes(p));
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, usuario } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(usuario));
      localStorage.setItem('isShopSession', 'false');
      setUser(usuario);
      setIsShopSession(false);
      lastActivity.current = Date.now();
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      throw error;
    }
  };

  const loginByCedula = async (cedula: string) => {
    try {
      const response = await authAPI.employeeLogin(cedula);
      const { token, usuario } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(usuario));
      localStorage.setItem('isShopSession', 'true');
      setUser(usuario);
      setIsShopSession(true);
      lastActivity.current = Date.now();
    } catch (error) {
      console.error('Error al iniciar sesión de empleado:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isShopSession');
    setUser(null);
    setIsShopSession(false);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authAPI.changePassword(currentPassword, newPassword);
  };

  const verifyToken = async () => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedIsShop = localStorage.getItem('isShopSession');
      
      if (token && storedUser) {
        const userData = JSON.parse(storedUser);
        // Pasar el token en la petición para validar en backend
        await authAPI.verifyToken(token);
        setUser(userData);
        setIsShopSession(storedIsShop === 'true');
        lastActivity.current = Date.now();
      } else {
        logout();
      }
    } catch (error) {
      console.error('Error verificando token:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const [showExpiredModal, setShowExpiredModal] = useState(false);

  // Monitorear inactividad del usuario administrador/operador (10 minutos)
  useEffect(() => {
    if (!user || user.rol.nombre === 'empleado') return;

    const actualizarActividad = () => {
      lastActivity.current = Date.now();
    };

    // Registrar oyentes de interacción
    window.addEventListener('mousemove', actualizarActividad);
    window.addEventListener('mousedown', actualizarActividad);
    window.addEventListener('keydown', actualizarActividad);
    window.addEventListener('scroll', actualizarActividad);
    window.addEventListener('touchstart', actualizarActividad);

    // Intervalo de revisión cada 10 segundos
    const interval = setInterval(() => {
      const tiempoInactivo = Date.now() - lastActivity.current;
      const diezMinutos = 10 * 60 * 1000;
      
      if (tiempoInactivo > diezMinutos) {
        setShowExpiredModal(true);
        clearInterval(interval);
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', actualizarActividad);
      window.removeEventListener('mousedown', actualizarActividad);
      window.removeEventListener('keydown', actualizarActividad);
      window.removeEventListener('scroll', actualizarActividad);
      window.removeEventListener('touchstart', actualizarActividad);
      clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    verifyToken();
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isShopSession,
      login,
      loginByCedula,
      logout,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      changePassword,
      isAuthenticated
    }}>
      {children}
      
      {showExpiredModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-sans">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                ⚠️ Sesión Expirada
              </h3>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Tu sesión ha expirado por inactividad (10 minutos). Por favor, vuelve a iniciar sesión para continuar.
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setShowExpiredModal(false);
                  logout();
                }}
                className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
