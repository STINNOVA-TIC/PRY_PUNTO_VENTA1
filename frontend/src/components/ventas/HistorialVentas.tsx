import React, { useState, useEffect } from 'react';
import { ventasAPI } from '../../api/ventas.api';
import { Venta } from '../../types';
import { VentaCard } from './VentaCard';
import { BsFileEarmarkText } from 'react-icons/bs';

export const HistorialVentas: React.FC = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarVentas();
  }, []);

  const cargarVentas = async () => {
    try {
      const response = await ventasAPI.getAll();
      setVentas(response.data);
    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando historial...</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <BsFileEarmarkText className="text-gray-600" /> Historial de Ventas
      </h2>
      {ventas.length === 0 ? (
        <p className="text-gray-500">No hay ventas registradas</p>
      ) : (
        <div className="space-y-4">
          {ventas.map((venta) => (
            <VentaCard key={venta.id} venta={venta} />
          ))}
        </div>
      )}
    </div>
  );
};
