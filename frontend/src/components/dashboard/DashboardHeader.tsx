import React from 'react';
import { BsGear, BsArrowClockwise, BsCalendar3 } from 'react-icons/bs';

interface DashboardHeaderProps {
  rol?: string;
  userName?: string;
  hasMetricas: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenConfig: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName = 'Usuario',
  hasMetricas,
  refreshing,
  onRefresh,
  onOpenConfig
}) => {
  // Fecha actual en español
  const fechaHoy = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const fechaFormateada = fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1);

  return (
    <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 sm:p-7 text-white border border-gray-700/60 shadow-xs relative overflow-hidden">
      {/* Detalle geométrico sobrio de fondo coherente con el sistema */}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/[0.03] to-transparent pointer-events-none" />
      <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/[0.04] rounded-full pointer-events-none blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span className="flex items-center gap-1.5">
              <BsCalendar3 className="text-gray-400 text-[11px]" />
              {fechaFormateada}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Bienvenido, {userName}
          </h1>

          <p className="text-xs sm:text-sm text-gray-300 font-normal leading-relaxed">
            Panel centralizado de control. Resumen en tiempo real y supervisión de las operaciones del sistema.
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2.5 shrink-0 self-stretch md:self-auto justify-end">
          {hasMetricas && (
            <button
              onClick={onOpenConfig}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/15 active:scale-95 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-white/15 cursor-pointer"
              title="Personalizar qué métricas ver en tu Dashboard"
            >
              <BsGear className="text-sm text-gray-300" />
              <span>Personalizar Métricas</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2.5 bg-white/10 hover:bg-white/15 active:scale-95 text-white rounded-xl text-xs font-semibold transition border border-white/15 cursor-pointer disabled:opacity-50"
            title="Actualizar datos"
          >
            <BsArrowClockwise className={`text-base text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};


