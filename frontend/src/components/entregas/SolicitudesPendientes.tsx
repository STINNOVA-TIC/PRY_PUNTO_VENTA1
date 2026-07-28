import React, { useState, useEffect, useMemo } from 'react';
import { entregasAPI } from '../../api/entregas.api';
import { devolucionesAPI } from '../../api/devoluciones.api';
import { adminAPI } from '../../api/admin.api';
import { autoconsumoAPI } from '../../api/autoconsumo.api';
import { SolicitudEntrega, Autoconsumo } from '../../types';
import { SolicitudCard } from './SolicitudCard';
import { useSocket } from '../../context/SocketContext';

export const SolicitudesPendientes: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<SolicitudEntrega[]>([]);
  const [autoconsumos, setAutoconsumos] = useState<Autoconsumo[]>([]);
  const [activeTab, setActiveTab] = useState<'pendientes' | 'entregadas' | 'autoconsumos'>('pendientes');
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados para despacho de Autoconsumo
  const [showDespachoAutoModal, setShowDespachoAutoModal] = useState(false);
  const [selectedAuto, setSelectedAuto] = useState<Autoconsumo | null>(null);
  const [fotoUrl, setFotoUrl] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [observacionAuto, setObservacionAuto] = useState('');

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

  const openDespachoAutoModal = (auto: Autoconsumo) => {
    setSelectedAuto(auto);
    setFotoUrl('');
    setObservacionAuto('');
    setError('');
    setShowDespachoAutoModal(true);
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setSubiendoFoto(true);
        setError('');
        const res = await adminAPI.uploadPhoto(file, 'entrega');
        setFotoUrl(res.url);
      } catch (err) {
        setError('Error al subir la fotografía de comprobación.');
      } finally {
        setSubiendoFoto(false);
      }
    }
  };

  const handleConfirmarDespachoAuto = async () => {
    if (!selectedAuto) return;
    if (!fotoUrl) {
      setError('Debes cargar una fotografía de comprobación del despacho.');
      return;
    }

    try {
      setLoading(true);
      await autoconsumoAPI.entregar(selectedAuto.id, {
        observacion: observacionAuto || 'Autoconsumo entregado a bodega.',
        foto_entrega: fotoUrl
      });
      setMensaje(`✅ Autoconsumo ${selectedAuto.codigo} despachado exitosamente.`);
      setShowDespachoAutoModal(false);
      setSelectedAuto(null);
      setFotoUrl('');
      setObservacionAuto('');
      cargarSolicitudes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al despachar el autoconsumo');
    } finally {
      setLoading(false);
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

  const autoconsumosFiltrados = useMemo(() => {
    return autoconsumos.filter((a) => {
      // El guardia solo despacha los 'aprobados' o ve los 'entregados'
      const matchEstado = a.estado === 'aprobado' || a.estado === 'entregado';
      if (!matchEstado) return false;

      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const nombre = a.empleado.nombre.toLowerCase();
      const cedula = a.empleado.cedula.toLowerCase();
      const codigo = a.codigo.toLowerCase();

      return nombre.includes(query) || cedula.includes(query) || codigo.includes(query);
    });
  }, [autoconsumos, searchQuery]);

  const currentCount = useMemo(() => {
    if (activeTab === 'autoconsumos') {
      return autoconsumos.filter(a => a.estado === 'aprobado' || a.estado === 'entregado').length;
    }
    return solicitudes.filter((sol) => {
      const estadoStr = sol.estado as string;
      return activeTab === 'pendientes' 
        ? estadoStr === 'pendiente' 
        : (estadoStr === 'entregado' || estadoStr === 'no_entregado' || estadoStr === 'cancelado' || estadoStr === 'cancelada' || estadoStr === 'completada');
    }).length;
  }, [solicitudes, autoconsumos, activeTab]);

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
              : 'Historial de Entregas Realizadas'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {activeTab === 'pendientes' 
              ? 'Busca y confirma la entrega de pedidos a los empleados' 
              : activeTab === 'autoconsumos'
              ? 'Despache productos de autoconsumo autorizados por Talento Humano'
              : 'Consulte entregas anteriores y registre devoluciones de artículos no consumidos'}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200 flex-shrink-0">
          {currentCount} {activeTab === 'pendientes' ? 'pendientes' : activeTab === 'autoconsumos' ? 'autoconsumos' : 'entregadas'}
        </span>
      </div>

      {/* Tabs para alternar entre Pendientes, Historial y Autoconsumos */}
      <div className="flex bg-gray-100 p-1 rounded-xl gap-1 max-w-lg w-full shadow-xs">
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

      {activeTab === 'autoconsumos' ? (
        autoconsumosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
            <p className="text-gray-500 font-semibold">No se encontraron autoconsumos</p>
            <p className="text-gray-400 text-xs mt-1">
              Intente con otro término o verifique si ya fueron retirados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {autoconsumosFiltrados.map((auto) => (
              <div key={auto.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition duration-150 space-y-4 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-bold">
                      {auto.codigo}
                    </span>
                    <h3 className="text-sm font-bold text-gray-800 mt-1.5">
                      {auto.empleado.nombre}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono">
                      C.I. {auto.empleado.cedula}
                    </p>
                  </div>
                  <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                    auto.estado === 'entregado'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {auto.estado}
                  </span>
                </div>

                <div className="text-gray-600 space-y-1">
                  <div>
                    <span className="font-semibold text-gray-450">Justificación:</span> {auto.justificacion}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-450">Dpto:</span> {auto.departamento.nombre}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-450">Centro Costos:</span> {auto.centro_costos.nombre}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-gray-100">
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Productos Solicitados
                  </span>
                  <div className="space-y-1 font-mono text-[10px] text-gray-600">
                    {auto.detalles.map((d) => (
                      <div key={d.id} className="flex justify-between">
                        <span>• {d.producto_nombre}</span>
                        <span className="font-bold text-gray-700">x{d.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100/60 flex justify-between items-center">
                  <span className="text-[10px] text-gray-400">
                    Solicitado: {new Date(auto.fecha_solicitud).toLocaleDateString()}
                  </span>
                  {auto.estado === 'aprobado' && (
                    <button
                      onClick={() => openDespachoAutoModal(auto)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-xs transition active:scale-95"
                    >
                      Confirmar Despacho
                    </button>
                  )}
                </div>

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
        )
      )}

      {/* MODAL DESPACHO AUTOCONSUMO */}
      {showDespachoAutoModal && selectedAuto && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-sm sm:text-base font-bold text-gray-800">
                Confirmar Despacho Autoconsumo: {selectedAuto.codigo}
              </h3>
              <button 
                onClick={() => { setShowDespachoAutoModal(false); setSelectedAuto(null); }}
                className="text-gray-450 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600">
              <div>
                <span className="font-semibold text-gray-400 uppercase text-[9px] block">Colaborador Destinatario</span>
                <span className="font-bold text-gray-800 text-sm">{selectedAuto.empleado.nombre}</span>
              </div>

              <div>
                <span className="font-semibold text-gray-400 uppercase text-[9px] block">Artículos a Entregar</span>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 space-y-1 mt-1 font-mono">
                  {selectedAuto.detalles.map((d) => (
                    <div key={d.id} className="flex justify-between">
                      <span>{d.producto_nombre}</span>
                      <span className="font-bold text-gray-800">x{d.cantidad} ud(s)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Registro de Fotografía */}
              <div className="space-y-1.5">
                <span className="block text-[9px] font-bold text-gray-450 uppercase tracking-wider">
                  Fotografía de Evidencia (Obligatorio)
                </span>
                
                {fotoUrl ? (
                  <div className="relative">
                    <img 
                      src={fotoUrl} 
                      alt="Evidencia cargada" 
                      className="w-full h-36 object-cover rounded-xl border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setFotoUrl('')}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-sm text-xs font-bold transition"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-450 transition bg-gray-50">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={handleFotoChange}
                      className="hidden" 
                      id="upload-foto-auto" 
                    />
                    <label htmlFor="upload-foto-auto" className="cursor-pointer space-y-2 block">
                      <div className="text-2xl text-gray-400">📷</div>
                      <span className="text-xs font-bold text-gray-700 block">
                        {subiendoFoto ? 'Subiendo fotografía...' : 'Tomar / Cargar Fotografía'}
                      </span>
                      <span className="text-[10px] text-gray-400 block font-normal">
                        Obligatorio para auditar el despacho físico
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Observación / Observación del Guardia */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-gray-450 uppercase tracking-wider">
                  Observaciones de Entrega (Opcional)
                </label>
                <textarea
                  value={observacionAuto}
                  onChange={(e) => setObservacionAuto(e.target.value)}
                  placeholder="Detalla cualquier novedad física..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-450 resize-none font-sans"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-750 rounded-lg text-xs leading-normal">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowDespachoAutoModal(false); setSelectedAuto(null); }}
                className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-xs font-semibold transition"
              >
                Cerrar
              </button>
              <button
                onClick={handleConfirmarDespachoAuto}
                disabled={loading || subiendoFoto || !fotoUrl}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Confirmar Despacho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
