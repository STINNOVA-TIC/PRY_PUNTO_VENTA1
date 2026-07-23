import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoEmpresa from '../../assets/logo.png';
import bannerEmpresa from '../../assets/banner.jpg';

export const Login: React.FC = () => {
  const [isEmployee, setIsEmployee] = useState(true);
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginByCedula } = useAuth();
  const navigate = useNavigate();

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginByCedula(cedula);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Cédula no registrada o inválida');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-850 font-sans">
      
      {/* PANEL IZQUIERDO VISUAL (Split Screen - Solo en md o superior) */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 relative items-center justify-center p-12 overflow-hidden border-r border-gray-200 bg-white">
        {/* Imagen de fondo (Banner oficial de la empresa) */}
        <div className="absolute inset-0 z-0">
          <img 
            src={bannerEmpresa} 
            alt="Banner Corporativo" 
            className="w-full h-full object-cover filter brightness-[0.95] contrast-[1.02]"
          />

        </div>

        {/* Efecto de luz difusa de fondo */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl z-0 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl z-0 pointer-events-none"></div>
        
        {/* Contenido flotante */}
        <div className="max-w-md space-y-6 text-center md:text-left z-10 relative">
          
          
          <div className="space-y-3 pt-4">
          </div>
        </div>
      </div>

      {/* PANEL DERECHO: FORMULARIO DE INGRESO */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col justify-center p-6 sm:p-12 md:p-16 relative bg-white">
        {/* Efecto de luz en esquina */}
        <div className="absolute top-10 right-10 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="w-full max-w-sm mx-auto space-y-8 z-10">
          {/* Logo en vista móvil y cabecera en escritorio */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">

            <div className="space-y-1 mt-2">
              <img src={logoEmpresa} alt="Logotipo Oficial" className="h-16 w-auto mx-auto object-contain filter drop-shadow-sm select-none" />
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Iniciar Sesión</h2>
              <p className="text-xs text-slate-500 font-medium">
                {isEmployee 
                  ? 'Acceso a catálogo de compras para colaboradores.' 
                  : 'Acceso para el personal administrativo y guardias.'
                }
              </p>
            </div>
          </div>

          {/* Selector de Pestañas Premium (Botón deslizable) */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 border border-slate-200/80 flex-shrink-0">
            <button
              type="button"
              onClick={() => { setIsEmployee(true); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                isEmployee 
                  ? 'bg-white text-slate-800 shadow-sm border border-gray-200/60' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Colaborador
            </button>
            <button
              type="button"
              onClick={() => { setIsEmployee(false); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                !isEmployee 
                  ? 'bg-white text-slate-800 shadow-sm border border-gray-200/60' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Operador / Admin
            </button>
          </div>

          {/* Formulario Dinámico */}
          {isEmployee ? (
            <form onSubmit={handleEmployeeSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  Número de Cédula
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm shadow-inner"
                    placeholder="Ej. 1751992817"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition duration-150 active:scale-[0.98] disabled:opacity-50 text-sm shadow-md shadow-gray-800/10"
              >
                {loading ? 'Validando Cédula...' : 'Ingresar a Comprar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">✉️</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm shadow-inner"
                    placeholder="admin@empresa.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-sm">🔑</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-sm shadow-inner"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition duration-150 active:scale-[0.98] disabled:opacity-50 text-sm shadow-md shadow-gray-800/10"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
