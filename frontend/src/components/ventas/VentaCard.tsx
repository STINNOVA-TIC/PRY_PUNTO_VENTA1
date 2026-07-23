import React from 'react';
import { Venta } from '../../types';

interface VentaCardProps {
  venta: Venta;
}

export const VentaCard: React.FC<VentaCardProps> = ({ venta }) => {
  const fecha = new Date(venta.fecha).toLocaleString('es-ES');

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completada': return 'text-green-600';
      case 'pendiente': return 'text-yellow-600';
      case 'anulada': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getEntregaColor = (estado: string) => {
    switch (estado) {
      case 'entregado': return 'text-green-600';
      case 'pendiente': return 'text-yellow-600';
      case 'cancelado': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-gray-500">Venta #{venta.id}</div>
          <div className="text-sm text-gray-500">{fecha}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-blue-600">
            ${venta.total_neto.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            Descuento: ${venta.descuento_total.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className={`text-sm font-medium ${getEstadoColor(venta.estado)}`}>
          Estado: {venta.estado}
        </span>
        <span className={`text-sm font-medium ${getEntregaColor(venta.estado_entrega)}`}>
          Entrega: {venta.estado_entrega}
        </span>
        <span className="text-sm bg-gray-100 px-2 py-1 rounded">
          Pago: {venta.metodo_pago}
        </span>
      </div>
      {venta.detalles && venta.detalles.length > 0 && (
        <div className="mt-2 text-sm text-gray-600">
          {venta.detalles.map(d => (
            <span key={d.id} className="inline-block mr-2">
              {d.producto?.nombre || `Producto #${d.producto_id}`} x{d.cantidad}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
