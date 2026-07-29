import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';

interface SolicitudCardProps {
  solicitud: any; 
  onCancelar?: (id: number) => void;
  onSolicitarDevolucion?: (id: number, motivo: string, detalles: any[]) => void;
}

export const SolicitudCard: React.FC<SolicitudCardProps> = ({
  solicitud,
  onCancelar,
  onSolicitarDevolucion,
}) => {
  const { showAlert } = useModal();
  const { user } = useAuth();
  const navigate = useNavigate();
  const esGuardia = user?.rol.nombre === 'guardia' || user?.rol.nombre === 'admin';

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case 'entregado':
      case 'completada':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'pendiente':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'no_entregado':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'cancelado':
      case 'cancelada':
        return 'bg-gray-100 text-gray-600 border-gray-250';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-150';
    }
  };

  const formatFecha = (fechaStr: string) => {
    try {
      return new Date(fechaStr).toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return fechaStr;
    }
  };

  const productosList = solicitud.detalles
    ? solicitud.detalles
        .map((d: any) => {
          const desc = d.producto_descripcion ? `, ${d.producto_descripcion}` : '';
          return `${d.producto_codigo} - ${d.producto_nombre}${desc} (x${d.cantidad})`;
        })
        .join(', ')
    : `${solicitud.producto?.codigo_barras || solicitud.producto?.codigo || ''} - ${solicitud.producto?.nombre || 'Productos'}${solicitud.producto?.descripcion ? `, ${solicitud.producto.descripcion}` : ''}`;

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cantidadesDevolucion, setCantidadesDevolucion] = useState<Record<number, number>>({});

  const handleOpenCancelModal = () => {
    const initialQuantities: Record<number, number> = {};
    if (solicitud.detalles) {
      solicitud.detalles.forEach((d: any) => {
        initialQuantities[d.producto_id] = d.cantidad; // Default to returning all
      });
    }
    setCantidadesDevolucion(initialQuantities);
    setMotivoCancelacion('');
    setShowCancelModal(true);
  };

  const handleDevolucionSubmit = async () => {
    if (!motivoCancelacion.trim() || !onSolicitarDevolucion) return;

    const detalles = (solicitud.detalles || []).map((d: any) => ({
      producto_id: d.producto_id,
      cantidad_devuelta: cantidadesDevolucion[d.producto_id] || 0
    })).filter((d: any) => d.cantidad_devuelta > 0);

    if (detalles.length === 0) {
      await showAlert({
        title: 'Cantidad Requerida',
        message: 'Debe devolver al menos una unidad de algún producto.',
        type: 'warning'
      });
      return;
    }

    onSolicitarDevolucion(solicitud.id, motivoCancelacion.trim(), detalles);
    setShowCancelModal(false);
  };

  const isDevolucionAprobada = solicitud.devolucion_estado === 'aprobado';
  const isDevolucionPendiente = solicitud.devolucion_estado === 'pendiente';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition duration-150 space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="flex gap-4">
          <img
            src={solicitud.empleado?.foto || `https://ui-avatars.com/api/?name=${solicitud.empleado?.nombre}&size=128`}
            alt="Empleado"
            className="w-12 h-12 rounded-full border border-gray-200 object-cover flex-shrink-0"
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-gray-400">
                {solicitud.codigo_entrega || `#${solicitud.id}`}
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${getEstadoBadgeClass(solicitud.estado)}`}>
                {solicitud.estado}
              </span>
              {solicitud.devolucion_estado && (
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                  isDevolucionAprobada 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : isDevolucionPendiente 
                      ? 'bg-amber-50 text-amber-600 border-amber-100' 
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  Devolución: {solicitud.devolucion_estado}
                </span>
              )}
            </div>
            
            <h3 className="text-base font-bold text-gray-800">
              {solicitud.empleado?.nombre || 'Empleado'}
            </h3>
            <p className="text-xs text-gray-400">
              Cédula: {solicitud.empleado?.codigo || 'N/A'} • Dpto: {solicitud.empleado?.departamento || 'N/A'}
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto pt-2 sm:pt-0">
          {esGuardia && (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              {solicitud.estado === 'pendiente' && (
                <>
                  <button
                    onClick={() => navigate(`/entregas/${solicitud.id}`)}
                    className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold shadow-sm transition active:scale-95 text-center"
                  >
                    Confirmar Entrega
                  </button>

                  <button
                    onClick={() => navigate(`/entregas/${solicitud.id}/no-entregado`)}
                    className="w-full sm:w-auto bg-white hover:bg-gray-55 border border-gray-300 text-red-650 px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-semibold transition text-center"
                  >
                    No Entregado
                  </button>
                </>
              )}

              {/* Botón de Cancelación o Devolución según estado */}
              {(solicitud.estado === 'pendiente' || solicitud.estado === 'entregado') && (
                <>
                  {isDevolucionAprobada ? (
                    <button
                      onClick={() => onCancelar?.(solicitud.id)}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold transition text-center"
                    >
                      Ejecutar Devolución Aprobada
                    </button>
                  ) : isDevolucionPendiente ? (
                    <button
                      disabled
                      className="w-full sm:w-auto bg-gray-100 text-gray-400 border border-gray-200 px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-semibold cursor-not-allowed text-center"
                    >
                      Devolución Pendiente TTHH
                    </button>
                  ) : (
                    <button
                      onClick={handleOpenCancelModal}
                      className="w-full sm:w-auto bg-white hover:bg-gray-55 border border-gray-300 text-gray-600 px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-semibold transition text-center"
                    >
                      {solicitud.estado === 'entregado' ? '🔄 Solicitar Devolución' : 'Solicitar Cancelación'}
                    </button>
                  )}
                </>
              )}

              {solicitud.estado !== 'pendiente' && (
                <button
                  onClick={() => navigate(`/entregas/${solicitud.id}`)}
                  className="w-full sm:w-auto text-center text-xs font-semibold bg-gray-50 border border-gray-250 text-gray-600 hover:bg-gray-100 px-4 py-2.5 sm:py-1.5 rounded-lg transition"
                >
                  Ver Detalles
                </button>
              )}
            </div>
          )}

          {!esGuardia && solicitud.estado !== 'pendiente' && (
            <button
              onClick={() => navigate(`/entregas/${solicitud.id}`)}
              className="w-full sm:w-auto text-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition block py-1.5"
            >
              Ver Detalles
            </button>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-gray-50 flex flex-col sm:flex-row sm:justify-between text-xs text-gray-500 gap-2">
        <div>
          <span className="font-semibold text-gray-600">Productos:</span> {productosList}
        </div>
        <div className="text-gray-400">
          Solicitado: {formatFecha(solicitud.fecha_solicitud)}
        </div>
      </div>

      {solicitud.observaciones && (
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600 font-mono">
          Observaciones: {solicitud.observaciones}
        </div>
      )}
      {/* MODAL SOLICITAR CANCELACIÓN / DEVOLUCIÓN */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white border border-gray-200 rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 text-left max-h-[90vh] overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-150">
                <h3 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-1.5">
                  🔄 Solicitar Devolución
                </h3>
                <button 
                  onClick={() => { setShowCancelModal(false); setMotivoCancelacion(''); }}
                  className="text-gray-400 hover:text-gray-650 text-xl p-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed mt-3">
                Seleccione la cantidad de cada artículo que desea devolver a bodega y especifique el motivo de la devolución.
              </p>

              {/* Listado de Productos y sus Cantidades */}
              <div className="space-y-4 max-h-60 overflow-y-auto border border-gray-150 rounded-2xl p-4 bg-gray-50 mt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="block text-[9px] font-bold text-gray-450 uppercase tracking-wider">
                    Cantidades a Devolver
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allMax: Record<number, number> = {};
                        (solicitud.detalles || []).forEach((d: any) => {
                          allMax[d.producto_id] = d.cantidad;
                        });
                        setCantidadesDevolucion(allMax);
                      }}
                      className="text-[9px] font-bold text-gray-800 hover:bg-gray-100 bg-white border border-gray-200 px-2.5 py-1 rounded-lg transition"
                    >
                      Devolver Todo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allZero: Record<number, number> = {};
                        (solicitud.detalles || []).forEach((d: any) => {
                          allZero[d.producto_id] = 0;
                        });
                        setCantidadesDevolucion(allZero);
                      }}
                      className="text-[9px] font-bold text-red-650 hover:bg-red-50 bg-white border border-gray-200 px-2.5 py-1 rounded-lg transition"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {(solicitud.detalles || []).map((d: any) => {
                  const currentVal = cantidadesDevolucion[d.producto_id] || 0;
                  return (
                    <div key={d.producto_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-gray-150 rounded-xl shadow-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-xs truncate">{d.producto_nombre}</p>
                        <p className="text-[10px] text-gray-450 font-medium mt-0.5">Original: {d.cantidad} ud(s)</p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                        <span className="text-[10px] text-gray-450 font-bold uppercase tracking-wider sm:hidden">Devolver:</span>
                        <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 p-1">
                          <button
                            type="button"
                            disabled={currentVal <= 0}
                            onClick={() => {
                              setCantidadesDevolucion({
                                ...cantidadesDevolucion,
                                [d.producto_id]: Math.max(0, currentVal - 1)
                              });
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-700 text-sm font-bold border border-gray-150 shadow-xs transition active:scale-90"
                          >
                            -
                          </button>
                          <span className="w-10 text-center font-bold text-xs text-gray-850 select-none">
                            {currentVal}
                          </span>
                          <button
                            type="button"
                            disabled={currentVal >= d.cantidad}
                            onClick={() => {
                              setCantidadesDevolucion({
                                ...cantidadesDevolucion,
                                [d.producto_id]: Math.min(d.cantidad, currentVal + 1)
                              });
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white hover:bg-gray-100 disabled:opacity-40 text-gray-700 text-sm font-bold border border-gray-150 shadow-xs transition active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5 mt-4">
                <span className="block text-[9px] font-bold text-gray-450 uppercase tracking-wider">Motivo de Devolución</span>
                <textarea
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Detalla el motivo de la devolución aquí (ej. no se consumieron en el evento)..."
                  className="w-full h-20 border border-gray-300 rounded-xl p-3 text-xs focus:ring-1 focus:ring-gray-400 focus:outline-none resize-none font-sans"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-gray-150">
              <button
                onClick={() => { setShowCancelModal(false); setMotivoCancelacion(''); }}
                className="w-full sm:w-auto bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 px-5 py-3 sm:py-2 rounded-xl text-xs font-bold transition text-center"
              >
                Cerrar
              </button>
              <button
                onClick={handleDevolucionSubmit}
                disabled={!motivoCancelacion.trim()}
                className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 text-white px-5 py-3 sm:py-2 rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 text-center"
              >
                Enviar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
