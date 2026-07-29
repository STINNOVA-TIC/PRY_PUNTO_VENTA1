import React from 'react';
import { Producto } from '../../types';

interface ProductoCardProps {
  producto: Producto;
  onAgregar?: (producto: Producto) => void;
}

export const ProductoCard: React.FC<ProductoCardProps> = ({ producto, onAgregar }) => {
  const isLowStock = producto.stock_actual <= 5;
  const isOutOfStock = producto.stock_actual === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-150 p-5 flex flex-col justify-between hover:shadow-md hover:border-gray-300 transition duration-200">
      <div>
        <div className="flex justify-between items-start mb-3">
          <img
            src={producto.foto || 'https://img.icons8.com/fluent/1200/fast-moving-consumer-goods.jpg'}
            alt={producto.nombre}
            className="w-16 h-16 rounded-xl border border-gray-150 object-cover shadow-sm"
          />
          {isOutOfStock ? (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">
              Agotado (0)
            </span>
          ) : isLowStock ? (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
              Bajo Stock ({producto.stock_actual})
            </span>
          ) : (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
              Disponible ({producto.stock_actual})
            </span>
          )}
        </div>
        
        <div className="flex flex-col gap-1 items-start">
          <span className="font-mono text-[10px] text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded font-semibold">
            {producto.codigo_barras}
          </span>
          <h3 className="text-base font-bold text-gray-800 line-clamp-1 leading-snug">
            {producto.nombre}
          </h3>
        </div>
        <p className="text-gray-400 text-xs mt-1 line-clamp-2 min-h-[32px] leading-relaxed">
          {producto.descripcion || 'Sin descripción disponible.'}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-semibold text-gray-400">Precio</span>
          <span className="text-lg font-black text-gray-800">
            ${producto.precio_venta.toFixed(2)}
          </span>
          <span className="text-[9px] text-gray-400 mt-0.5">Stock: {producto.stock_actual} uds</span>
        </div>
        
        {onAgregar && !isOutOfStock ? (
          <button
            onClick={() => onAgregar(producto)}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
          >
            Agregar +
          </button>
        ) : (
          <button
            disabled
            className="bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-xs font-semibold cursor-not-allowed"
          >
            Agotado
          </button>
        )}
      </div>
    </div>
  );
};
