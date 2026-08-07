import React from 'react';
import { BotonAccion } from './BotonAccion';

interface TarjetaHistorialProps {
  codigo: string;
  estado: string;
  nombre: string;
  descripcion?: React.ReactNode;
  onVerDetalle?: () => void;
}

const colorEstado = (estado: string): string => {
  if (estado === 'aprobado' || estado === 'ejecutado' || estado === 'entregado') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
  if (estado === 'pendiente') {
    return 'bg-amber-50 text-amber-700 border-amber-100';
  }
  return 'bg-red-50 text-red-700 border-red-100';
};

export const TarjetaHistorial: React.FC<TarjetaHistorialProps> = ({
  codigo,
  estado,
  nombre,
  descripcion,
  onVerDetalle,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-gray-400">{codigo}</span>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${colorEstado(estado)}`}>
            {estado}
          </span>
        </div>
        <h4 className="font-bold text-gray-800 mt-1">{nombre}</h4>
        {descripcion && (
          <div className="text-gray-500 mt-0.5 truncate">
            <span className="font-semibold text-gray-400">{descripcion}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onVerDetalle && <BotonAccion tipo="ver_detalle" onClick={onVerDetalle} />}
      </div>
    </div>
  );
};
