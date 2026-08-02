import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Autoconsumo } from '../../types';

interface AutoconsumoCardProps {
  auto: Autoconsumo;
  onDespachar?: (auto: Autoconsumo) => void;
}

export const AutoconsumoCard: React.FC<AutoconsumoCardProps> = ({ auto, onDespachar }) => {
  const navigate = useNavigate();

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case 'entregado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'aprobado':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'pendiente':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'rechazado':
      case 'cancelado':
        return 'bg-gray-100 text-gray-600 border-gray-250';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-150';
    }
  };

  const formatFecha = (fechaStr: string) => {
    try {
      return new Date(fechaStr).toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return fechaStr;
    }
  };

  const productosList = auto.detalles
    ? auto.detalles
        .map((d) => `${d.producto_codigo} - ${d.producto_nombre} (x${d.cantidad})`)
        .join(', ')
    : 'Productos';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition duration-150 space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="flex gap-4">
          <img
            src={`https://ui-avatars.com/api/?name=${auto.empleado?.nombre}&size=128`}
            alt="Empleado"
            className="w-12 h-12 rounded-full border border-gray-200 object-cover flex-shrink-0"
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-gray-400">{auto.codigo}</span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${getEstadoBadgeClass(auto.estado)}`}>
                {auto.estado}
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-800">{auto.empleado?.nombre}</h3>
            <p className="text-xs text-gray-400">
              Cédula: {auto.empleado?.cedula} • Dpto: {auto.departamento?.nombre}
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto pt-2 sm:pt-0">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {auto.estado === 'aprobado' && (
              <button
                onClick={() => onDespachar?.(auto)}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold shadow-sm transition active:scale-95 text-center"
              >
                Confirmar Despacho
              </button>
            )}
            {auto.estado === 'entregado' && (
              <button
                onClick={() => navigate(`/entregas/autoconsumos/${auto.id}/despacho`)}
                className="w-full sm:w-auto text-center text-xs font-semibold bg-gray-50 border border-gray-250 text-gray-600 hover:bg-gray-100 px-4 py-2.5 sm:py-1.5 rounded-lg transition"
              >
                Ver Detalles
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-50 flex flex-col sm:flex-row sm:justify-between text-xs text-gray-500 gap-2">
        <div>
          <span className="font-semibold text-gray-600">Productos:</span> {productosList}
        </div>
        <div className="text-gray-400">
          Solicitado: {formatFecha(auto.fecha_solicitud)}
        </div>
      </div>

      {auto.justificacion && (
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600 font-mono">
          Justificación: {auto.justificacion}
        </div>
      )}

      {auto.centro_costos && (
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600">
          Centro de Costos: {auto.centro_costos.codigo} - {auto.centro_costos.nombre}
        </div>
      )}

      {auto.foto_entrega && (
        <div className="pt-2">
          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Evidencia despacho</span>
          <img
            src={auto.foto_entrega}
            alt="Despacho"
            className="w-full h-24 object-cover rounded-lg border border-gray-200"
          />
        </div>
      )}
    </div>
  );
};
