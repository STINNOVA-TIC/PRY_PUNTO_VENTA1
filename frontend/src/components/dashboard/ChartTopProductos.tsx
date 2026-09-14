import React from 'react';
import { BsFire } from 'react-icons/bs';
import { TopProductoItem } from './types';

interface ChartTopProductosProps {
  loading: boolean;
  topProductos: TopProductoItem[];
}

const colors = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-indigo-500'
];

export const ChartTopProductos: React.FC<ChartTopProductosProps> = ({
  loading,
  topProductos
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <BsFire className="text-base" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Top 5 Productos Más Consumidos</h3>
            <p className="text-[11px] text-gray-400">Artículos con mayor demanda en el mes actual</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 py-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-gray-100 rounded-lg w-full" />
          ))}
        </div>
      ) : topProductos.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-xs">
          No hay consumos registrados en este período.
        </div>
      ) : (
        <div className="space-y-3.5 pt-1">
          {topProductos.map((p, idx) => {
            const maxQty = topProductos[0]?.cantidad || 1;
            const percent = Math.min(100, Math.round((p.cantidad / maxQty) * 100));
            return (
              <div key={idx} className="space-y-1.5 group">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-700 truncate max-w-[240px]">
                    <span className="text-gray-400 font-mono mr-1.5">#{idx + 1}</span>
                    {p.nombre}
                  </span>
                  <span className="font-bold text-gray-800">
                    {p.cantidad} uds <span className="text-gray-400 font-normal">(${p.total.toFixed(2)})</span>
                  </span>
                </div>
                {/* Barra de progreso interactiva */}
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500 group-hover:brightness-110`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
