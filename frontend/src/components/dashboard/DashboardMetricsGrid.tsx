import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BsArrowRight } from 'react-icons/bs';
import { MetricaDef } from './types';

interface DashboardMetricsGridProps {
  loading: boolean;
  metricasVisibles: MetricaDef[];
  metricasAutorizadasCount: number;
}

export const DashboardMetricsGrid: React.FC<DashboardMetricsGridProps> = ({
  loading,
  metricasVisibles,
  metricasAutorizadasCount
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3.5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-gray-800">Métricas & Indicadores Clave</h2>
          <p className="text-xs text-gray-400">Datos en tiempo real calculados según tus permisos de acceso</p>
        </div>
        {metricasAutorizadasCount > 0 && (
          <span className="text-xs text-gray-400 font-medium">
            Mostrando {metricasVisibles.length} de {metricasAutorizadasCount}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200 animate-pulse space-y-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-6 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : metricasVisibles.length === 0 ? (
        <div className="p-8 text-center bg-white border border-gray-200 rounded-2xl shadow-xs">
          <p className="text-sm font-semibold text-gray-600">No hay métricas visibles activadas</p>
          <p className="text-xs text-gray-400 mt-1">
            Puedes pulsar en "Personalizar Métricas" para activar las que deseas supervisar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricasVisibles.map(m => (
            <div
              key={m.id}
              onClick={() => navigate(m.ruta)}
              className={`bg-white border ${m.borderColor} p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between hover:-translate-y-0.5`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`p-3 rounded-xl ${m.bgLight} ${m.color} transition group-hover:scale-110 duration-200`}>
                  {m.icono}
                </div>
                <span className="text-gray-300 group-hover:text-gray-600 transition">
                  <BsArrowRight className="text-sm" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-gray-800 tracking-tight">{m.valor}</div>
                <div className="text-xs font-bold text-gray-600 mt-0.5">{m.titulo}</div>
                <div className="text-[11px] text-gray-400 mt-1 truncate">{m.subtitulo}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
