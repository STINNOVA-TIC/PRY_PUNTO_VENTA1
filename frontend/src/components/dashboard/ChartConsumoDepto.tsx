import React from 'react';
import { BsBuilding } from 'react-icons/bs';
import { ConsumoDeptoItem } from './types';

interface ChartConsumoDeptoProps {
  loading: boolean;
  consumoPorDepto: ConsumoDeptoItem[];
}

const barColors = [
  'bg-purple-600',
  'bg-indigo-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500'
];

export const ChartConsumoDepto: React.FC<ChartConsumoDeptoProps> = ({
  loading,
  consumoPorDepto
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
            <BsBuilding className="text-base" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Distribución por Departamento</h3>
            <p className="text-[11px] text-gray-400">Porcentaje de consumo generado en el mes</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 py-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-gray-100 rounded-lg w-full" />
          ))}
        </div>
      ) : consumoPorDepto.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-xs">
          No hay transacciones registradas por departamento este mes.
        </div>
      ) : (
        <div className="space-y-3.5 pt-1">
          {consumoPorDepto.map((d, idx) => (
            <div key={idx} className="space-y-1.5 group">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-700 truncate max-w-[220px]">
                  {d.depto}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {d.porcentaje}%
                  </span>
                  <span className="font-bold text-gray-800 font-mono">
                    ${d.total.toFixed(2)}
                  </span>
                </div>
              </div>
              {/* Barra de distribución */}
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColors[idx % barColors.length]} rounded-full transition-all duration-500 group-hover:brightness-110`}
                  style={{ width: `${d.porcentaje}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
