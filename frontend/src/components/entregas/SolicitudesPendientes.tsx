import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { entregasAPI } from '../../api/entregas.api';
import { devolucionesAPI } from '../../api/devoluciones.api';
import { autoconsumoAPI } from '../../api/autoconsumo.api';
import { SolicitudEntrega, Autoconsumo } from '../../types';
import { SolicitudCard } from './SolicitudCard';
import { AutoconsumoCard } from './AutoconsumoCard';
import { useSocket } from '../../context/SocketContext';
import { Paginacion } from '../common/Paginacion';

export const SolicitudesPendientes: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<SolicitudEntrega[]>([]);
  const [autoconsumos, setAutoconsumos] = useState<Autoconsumo[]>([]);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'entregadas' | 'autoconsumos' | 'autoconsumos_entregados'>('pendientes');
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Paginación de la pestaña de Entregadas
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { socket } = useSocket();
  const navigate = useNavigate();

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

      socket.on('autoconsumo-pendiente', () => {
        console.log('📡 WebSocket: Autoconsumo pendiente recibido. Recargando...');
        cargarSolicitudes();
      });

      socket.on('autoconsumo-actualizado', () => {
        console.log('📡 WebSocket: Autoconsumo actualizado. Recargando...');
        cargarSolicitudes();
      });
    }

    return () => {
      if (socket) {
        socket.off('entrega-pendiente');
        socket.off('entrega-realizada');
        socket.off('devolucion-actualizada');
        socket.off('autoconsumo-pendiente');
        socket.off('autoconsumo-actualizado');
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

      try {
        const autoRes = await autoconsumoAPI.getAll();
        // Solo autoconsumos que estén en estado 'aprobado' (por entregar) o 'entregado'
        setAutoconsumos(autoRes.data);
      } catch (err) {
        console.error('Error cargando autoconsumos:', err);
      }
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

  const handleSolicitarDevolucionAutoconsumo = async (id: number, motivo: string, detalles?: any[]) => {
    try {
      await devolucionesAPI.solicitarAutoconsumo(id, motivo, detalles);
      setMensaje('Solicitud de devolución de autoconsumo registrada. En espera de aprobación por Talento Humano.');
      cargarSolicitudes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar devolución del autoconsumo');
    }
  };

  const handleEjecutarDevolucionAutoconsumo = async (_autoconsumoId: number, devolucionId: number) => {
    try {
      await devolucionesAPI.ejecutarAutoconsumo(devolucionId);
      setMensaje('Devolución de autoconsumo procesada y stock restaurado en inventario exitosamente.');
      cargarSolicitudes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al ejecutar devolución del autoconsumo');
    }
  };

  const handleDespacharAutoconsumo = (auto: Autoconsumo) => {
    navigate(`/entregas/autoconsumos/${auto.id}/despacho`);
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
      const codigoEntrega = (sol.codigo_entrega || '').toLowerCase();
      const idStr = String(sol.id);

      return nombre.includes(query) || cedula.includes(query) || codigoEntrega.includes(query) || idStr.includes(query);
    });
  }, [solicitudes, activeTab, searchQuery]);

  const autoconsumosFiltrados = useMemo(() => {
    return autoconsumos.filter((a) => {
      // El tab de autoconsumos solo muestra aprobados (por despachar); el de entregados solo entregados
      const matchEstado = activeTab === 'autoconsumos_entregados'
        ? a.estado === 'entregado'
        : a.estado === 'aprobado';
      if (!matchEstado) return false;

      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const nombre = a.empleado.nombre.toLowerCase();
      const cedula = a.empleado.cedula.toLowerCase();
      const codigo = a.codigo.toLowerCase();

      return nombre.includes(query) || cedula.includes(query) || codigo.includes(query);
    });
  }, [autoconsumos, activeTab, searchQuery]);

  const currentCount = useMemo(() => {
    if (activeTab === 'autoconsumos' || activeTab === 'autoconsumos_entregados') {
      return autoconsumos.filter(a => activeTab === 'autoconsumos_entregados'
        ? a.estado === 'entregado'
        : a.estado === 'aprobado').length;
    }
    return solicitudes.filter((sol) => {
      const estadoStr = sol.estado as string;
      return activeTab === 'pendientes' 
        ? estadoStr === 'pendiente' 
        : (estadoStr === 'entregado' || estadoStr === 'no_entregado' || estadoStr === 'cancelado' || estadoStr === 'cancelada' || estadoStr === 'completada');
    }).length;
  }, [solicitudes, autoconsumos, activeTab]);

  // Reiniciar a la primera página al cambiar de pestaña o buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, itemsPerPage]);

  const entregadasPaginadas = useMemo(() => {
    if (activeTab !== 'entregadas') return solicitudesFiltradas;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return solicitudesFiltradas.slice(startIndex, endIndex);
  }, [solicitudesFiltradas, activeTab, currentPage, itemsPerPage]);

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
            {activeTab === 'pendientes' 
              ? 'Despacho de Entregas Pendientes' 
              : activeTab === 'autoconsumos'
              ? 'Despacho de Autoconsumos'
              : activeTab === 'autoconsumos_entregados'
              ? 'Autoconsumos Entregados'
              : 'Historial de Entregas Realizadas'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {activeTab === 'pendientes' 
              ? 'Busca y confirma la entrega de pedidos a los empleados' 
              : activeTab === 'autoconsumos'
              ? 'Despache productos de autoconsumo autorizados por Talento Humano'
              : activeTab === 'autoconsumos_entregados'
              ? 'Consulte autoconsumos despachados y registre devoluciones de artículos no consumidos'
              : 'Consulte entregas anteriores y registre devoluciones de artículos no consumidos'}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200 flex-shrink-0">
          {currentCount} {activeTab === 'pendientes' ? 'pendientes' : activeTab === 'autoconsumos' ? 'por despachar' : activeTab === 'autoconsumos_entregados' ? 'entregados' : 'entregadas'}
        </span>
      </div>

      {/* Tabs para alternar entre Pendientes, Historial, Autoconsumos y Autoconsumos Entregados */}
      <div className="flex bg-gray-100 p-1 rounded-xl gap-1 max-w-2xl w-full shadow-xs">
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
        <button
          onClick={() => setActiveTab('autoconsumos')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center relative ${
            activeTab === 'autoconsumos'
              ? 'bg-white text-gray-800 shadow-xs border border-gray-200'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          🏢 Autoconsumos
          {autoconsumos.filter(a => a.estado === 'aprobado').length > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              {autoconsumos.filter(a => a.estado === 'aprobado').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('autoconsumos_entregados')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center relative ${
            activeTab === 'autoconsumos_entregados'
              ? 'bg-white text-gray-800 shadow-xs border border-gray-200'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          📦 Autoconsumos Entregados
          {autoconsumos.filter(a => a.estado === 'entregado').length > 0 && (
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              {autoconsumos.filter(a => a.estado === 'entregado').length}
            </span>
          )}
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

      {activeTab === 'autoconsumos' || activeTab === 'autoconsumos_entregados' ? (
        autoconsumosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
            <p className="text-gray-500 font-semibold">
              {activeTab === 'autoconsumos_entregados'
                ? 'No se encontraron autoconsumos entregados'
                : 'No se encontraron autoconsumos'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Intente con otro término o verifique si ya fueron retirados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {autoconsumosFiltrados.map((auto) => (
              <AutoconsumoCard
                key={auto.id}
                auto={auto}
                onDespachar={handleDespacharAutoconsumo}
                onSolicitarDevolucion={handleSolicitarDevolucionAutoconsumo}
                onEjecutarDevolucion={handleEjecutarDevolucionAutoconsumo}
              />
            ))}
          </div>
        )
      ) : (
        solicitudesFiltradas.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
            <p className="text-gray-500 font-semibold">No se encontraron solicitudes</p>
            <p className="text-gray-400 text-xs mt-1">
              {activeTab === 'pendientes' 
                ? 'Intente con otro término o verifique si ya fueron retiradas.' 
                : 'No hay registros de entregas para mostrar.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entregadasPaginadas.map((solicitud) => (
                <SolicitudCard
                  key={solicitud.id}
                  solicitud={solicitud}
                  onCancelar={handleCancelar}
                  onSolicitarDevolucion={handleSolicitarDevolucion}
                />
              ))}
            </div>

            {activeTab === 'entregadas' && (
              <Paginacion
                currentPage={currentPage}
                totalItems={solicitudesFiltradas.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </>
        )
      )}
    </div>
  );
};
