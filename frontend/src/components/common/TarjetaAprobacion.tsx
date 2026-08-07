import React from 'react';
import { BotonAccion } from './BotonAccion';

interface TarjetaAprobacionProps {
  codigo: string;
  fecha?: string | Date | null;
  nombre: string;
  cedula?: string;
  descripcionLabel: string;
  descripcion: string;
  onVerDetalle?: () => void;
  onAprobar?: () => void;
  onRechazar?: () => void;
  aprobarLabel?: string;
  rechazarLabel?: string;
}

export const TarjetaAprobacion: React.FC<TarjetaAprobacionProps> = ({
  codigo,
  fecha,
  nombre,
  cedula,
  descripcionLabel,
  descripcion,
  onVerDetalle,
  onAprobar,
  onRechazar,
  aprobarLabel = 'Aprobar',
  rechazarLabel = 'Rechazar',
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded font-bold">
            {codigo}
          </span>
          {fecha && (
            <span className="text-gray-400 text-[10px] font-medium">
              {new Date(fecha).toLocaleString()}
            </span>
          )}
        </div>
        <h4 className="font-bold text-gray-800 mt-1.5 text-sm">{nombre}</h4>
        {cedula && <span className="text-[10px] text-gray-400 block font-mono">C.I. {cedula}</span>}
        <div className="text-gray-600 mt-1 truncate">
          <span className="font-semibold text-gray-500">{descripcionLabel}:</span> {descripcion}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onVerDetalle && <BotonAccion tipo="ver_detalle" onClick={onVerDetalle} />}
        {onAprobar && (
          <button
            onClick={onAprobar}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow-sm"
          >
            {aprobarLabel}
          </button>
        )}
        {onRechazar && (
          <button
            onClick={onRechazar}
            className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 rounded-lg text-xs font-semibold transition"
          >
            {rechazarLabel}
          </button>
        )}
      </div>
    </div>
  );
};
