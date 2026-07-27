import React, { useState, useEffect, useMemo } from 'react';
import { entregasAPI } from '../../api/entregas.api';
import { devolucionesAPI } from '../../api/devoluciones.api';
import { SolicitudEntrega } from '../../types';
import { SolicitudCard } from './SolicitudCard';
import { useSocket } from '../../context/SocketContext';

export const SolicitudesPendientes: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<SolicitudEntrega[]>([]);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'entregadas'>('pendientes');
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { socket } = useSocket();

  useEffect(() => {
    cargarSolicitudes();

    if (socket) {
      socket.on('entrega-pendiente', () => {
        console.log('📡 WebSocket: Nueva entrega pendiente recibida. Recargando...');
        cargarSolicitudes();
      });

      socket.on('entrega-realizada', () => {
        console.log('📡 WebSocket: Entrega realizada/removida. Recargando...');
        cargarSolicitudes();
      });

      socket.on('devolucion-actualizada', () => {
        console.log('📡 WebSocket: Devolución/Cancelación actualizada. Recargando...');
        cargarSolicitudes();
      });
    }

    return () => {
      if (socket) {
        socket.off('entrega-pendiente');
        socket.off('entrega-realizada');
        socket.off('devolucion-actualizada');
      }
    };
  }, [socket]);

  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      setMensaje('');
      setError('');
      const response = await entregasAPI.getAll();
      setSolicitudes(response.data);
    } catch (err: any) {
      console.error('Error cargando solicitudes:', err);
      setError('Error al obtener la lista de entregas.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async (id: number) => {
    try {
      await entregasAPI.cancelar(id, 'Devolución ejecutada físicamente');
      setMensaje('Devolución procesada y stock restaurado en inventario exitosamente.');
      cargarSolicitudes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al ejecutar devolución');
    }
  };

  const handleSolicitarDevolucion = async (id: number, motivo: string, detalles?: any[]) => {
    try {
      await devolucionesAPI.solicitar(id, motivo, detalles);
      setMensaje('Solicitud de devolución registrada. En espera de aprobación por Talento Humano.');
      cargarSolicitudes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar devolución');
    }
  };

  // Filtrado de solicitudes en base a pestaña y buscador
  const solicitudesFiltradas = useMemo(() => {
    return solicitudes.filter((sol) => {
      const estadoStr = sol.estado as string;
      const matchEstado = activeTab === 'pendientes' 
        ? estadoStr === 'pendiente' 
        : (estadoStr === 'entregado' || estadoStr === 'no_entregado' || estadoStr === 'cancelado' || estadoStr === 'cancelada' || estadoStr === 'completada');
      if (!matchEstado) return false;

      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const nombre = `${sol.empleado?.nombre || ''} ${sol.empleado?.apellido || ''}`.toLowerCase();
      const cedula = ((sol.empleado as any)?.codigo || sol.empleado?.codigo_empleado || '').toLowerCase();

      return nombre.includes(query) || cedula.includes(query);
    });
  }, [solicitudes, activeTab, searchQuery]);

  const currentCount = useMemo(() => {
    return solicitudes.filter((sol) => {
      const estadoStr = sol.estado as string;
      return activeTab === 'pendientes' 
        ? estadoStr === 'pendiente' 
        : (estadoStr === 'entregado' || estadoStr === 'no_entregado' || estadoStr === 'cancelado' || estadoStr === 'cancelada' || estadoStr === 'completada');
    }).length;
  }, [solicitudes, activeTab]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        <p className="text-sm text-gray-500 font-medium">Cargando solicitudes...</p>
      </div>
    );
  }

  return (
    <div className="font-sans space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {activeTab === 'pendientes' ? 'Despacho de Entregas Pendientes' : 'Historial de Entregas Realizadas'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {activeTab === 'pendientes' 
              ? 'Busca y confirma la entrega de pedidos a los empleados' 
              : 'Consulte entregas anteriores y registre devoluciones de artículos no consumidos'}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200 flex-shrink-0">
          {currentCount} {activeTab === 'pendientes' ? 'pendientes' : 'entregadas'}
        </span>
      </div>

      {/* Tabs para alternar entre Pendientes e Historial */}
      <div className="flex bg-gray-100 p-1 rounded-xl gap-1 max-w-md w-full shadow-xs">
        <button
          onClick={() => setActiveTab('pendientes')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center ${
            activeTab === 'pendientes'
              ? 'bg-white text-gray-800 shadow-xs border border-gray-200'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          📥 Por Entregar
        </button>
        <button
          onClick={() => setActiveTab('entregadas')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center ${
            activeTab === 'entregadas'
              ? 'bg-white text-gray-800 shadow-xs border border-gray-200'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          ✅ Entregadas
        </button>
      </div>

      {/* Buscador de Empleados */}
      <div className="relative max-w-md w-full">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </span>
        <input
          type="text"
          placeholder="Buscar empleado por nombre o cédula..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition bg-white shadow-sm"
        />
      </div>

      {mensaje && (
        <div className="p-4 bg-gray-50 border border-gray-200 text-gray-800 rounded-lg text-sm font-medium">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {solicitudesFiltradas.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 font-semibold">No se encontraron solicitudes</p>
          <p className="text-gray-400 text-xs mt-1">
            {activeTab === 'pendientes' 
              ? 'Intente con otro término o verifique si ya fueron retiradas.' 
              : 'No hay registros de entregas para mostrar.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {solicitudesFiltradas.map((solicitud) => (
            <SolicitudCard
              key={solicitud.id}
              solicitud={solicitud}
              onCancelar={handleCancelar}
              onSolicitarDevolucion={handleSolicitarDevolucion}
            />
          ))}
        </div>
      )}
    </div>
  );
};
