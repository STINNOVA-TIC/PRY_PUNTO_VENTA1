import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Autoconsumo } from '../../types';
import { BsArrowClockwise, BsX } from 'react-icons/bs';

interface AutoconsumoCardProps {
  auto: Autoconsumo;
  onDespachar?: (auto: Autoconsumo) => void;
  onSolicitarDevolucion?: (id: number, motivo: string, detalles: any[]) => void;
  onEjecutarDevolucion?: (id: number, devolucionId: number) => void;
}

export const AutoconsumoCard: React.FC<AutoconsumoCardProps> = ({
  auto,
  onDespachar,
  onSolicitarDevolucion,
  onEjecutarDevolucion,
}) => {
  const navigate = useNavigate();
  const { showAlert } = useModal();
  const { user } = useAuth();
  const esGuardia = user?.rol.nombre === 'guardia' || user?.rol.nombre === 'admin';

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case 'entregado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'aprobado':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'pendiente':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'rechazado':
      case 'cancelado':
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

  const productosList = auto.detalles
    ? auto.detalles
        .map((d) => {
          const dev = d.cantidad_devuelta || 0;
          if (dev > 0) {
            return `${d.producto_codigo} - ${d.producto_nombre} (${d.cantidad} despachadas, ${dev} devueltas)`;
          }
          return `${d.producto_codigo} - ${d.producto_nombre} (x${d.cantidad})`;
        })
        .join(', ')
    : 'Productos';

  // Calcular total disponible restante para devolución
  const totalDisponible = (auto.detalles || []).reduce((acc, d) => {
    const disp = d.cantidad_disponible !== undefined ? d.cantidad_disponible : d.cantidad;
    return acc + disp;
  }, 0);
  const tieneProductosDevueltos = (auto.detalles || []).some(d => (d.cantidad_devuelta || 0) > 0);
  const esDevolucionCompleta = tieneProductosDevueltos && totalDisponible === 0;

  const [showDevModal, setShowDevModal] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [cantidadesDevolucion, setCantidadesDevolucion] = useState<Record<number, number>>({});

  const handleOpenDevModal = () => {
    const initialQuantities: Record<number, number> = {};
    if (auto.detalles) {
      auto.detalles.forEach((d) => {
        const maxDev = d.cantidad_disponible !== undefined ? d.cantidad_disponible : d.cantidad;
        initialQuantities[d.producto_id] = maxDev; // Default a todo lo disponible restante
      });
    }
    setCantidadesDevolucion(initialQuantities);
    setMotivoDevolucion('');
    setShowDevModal(true);
  };

  const handleDevSubmit = async () => {
    if (!motivoDevolucion.trim() || !onSolicitarDevolucion) return;

    const detalles = (auto.detalles || [])
      .map((d) => ({
        producto_id: d.producto_id,
        cantidad_devuelta: cantidadesDevolucion[d.producto_id] || 0
      }))
      .filter((d) => d.cantidad_devuelta > 0);

    if (detalles.length === 0) {
      await showAlert({
        title: 'Cantidad Requerida',
        message: 'Debe devolver al menos una unidad de algún producto.',
        type: 'warning'
      });
      return;
    }

    onSolicitarDevolucion(auto.id, motivoDevolucion.trim(), detalles);
    setShowDevModal(false);
  };

  const isDevAprobada = auto.devolucion?.estado === 'aprobado';
  const isDevPendiente = auto.devolucion?.estado === 'pendiente';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition duration-150 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Cabecera: Foto, Códigos, Estados y Datos del Empleado a ancho completo */}
        <div className="flex items-center gap-3.5">
          <img
            src={`https://ui-avatars.com/api/?name=${auto.empleado?.nombre}&size=128`}
            alt="Empleado"
            className="w-12 h-12 rounded-full border border-gray-200 object-cover flex-shrink-0 shadow-xs"
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-gray-500">{auto.codigo}</span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getEstadoBadgeClass(auto.estado)}`}>
                {auto.estado}
              </span>
              {auto.devolucion && (
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                  isDevAprobada
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : isDevPendiente
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-rose-50 text-rose-600 border-rose-200'
                }`}>
                  Devolución: {auto.devolucion.estado}
                </span>
              )}
              {esDevolucionCompleta && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                  Devuelto Total
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-gray-800 leading-snug break-words">{auto.empleado?.nombre}</h3>
            <p className="text-xs text-gray-400 truncate">
              Cédula: <span className="text-gray-600 font-medium">{auto.empleado?.cedula}</span> • Dpto: <span className="text-gray-600 font-medium">{auto.departamento?.nombre}</span>
            </p>
          </div>
        </div>

        {/* Productos y Fecha */}
        <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          <div>
            <span className="font-semibold text-gray-700">Productos:</span> {productosList}
          </div>
          <div className="text-gray-400 text-[11px]">
            Solicitado: {formatFecha(auto.fecha_solicitud)}
          </div>
        </div>

        {auto.justificacion && (
          <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600 font-mono break-words">
            Justificación: {auto.justificacion}
          </div>
        )}

        {auto.centro_costos && (
          <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600">
            Centro de Costos: <span className="font-semibold">{auto.centro_costos.codigo}</span> - {auto.centro_costos.nombre}
          </div>
        )}

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

      {/* Botonera inferior: Ancho completo y adaptable para móvil y desktop */}
      <div className="pt-3 border-t border-gray-100">
        {esGuardia && (
          <div className="flex flex-wrap gap-2 w-full">
            {auto.estado === 'aprobado' && (
              <button
                onClick={() => onDespachar?.(auto)}
                className="flex-1 min-w-[130px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-xs transition active:scale-95 text-center"
              >
                Confirmar Despacho
              </button>
            )}

            {auto.estado === 'entregado' && (
              <>
                {isDevAprobada ? (
                  <button
                    onClick={() => onEjecutarDevolucion?.(auto.id, auto.devolucion!.id)}
                    className="flex-1 min-w-[130px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition text-center shadow-xs active:scale-95"
                  >
                    Ejecutar Devolución
                  </button>
                ) : isDevPendiente ? (
                  <button
                    disabled
                    className="flex-1 min-w-[130px] bg-gray-100 text-gray-400 border border-gray-200 px-3 py-2 rounded-lg text-xs font-semibold cursor-not-allowed text-center"
                  >
                    Devolución Pendiente
                  </button>
                ) : totalDisponible > 0 ? (
                  <button
                    onClick={handleOpenDevModal}
                    className="flex-1 min-w-[130px] bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <BsArrowClockwise className="text-sm" /> Solicitar Devolución
                  </button>
                ) : null}
              </>
            )}

            {auto.estado === 'entregado' && (
              <button
                onClick={() => navigate(`/entregas/autoconsumos/${auto.id}/despacho`)}
                className="flex-1 min-w-[100px] text-center text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg transition"
              >
                Ver Detalles
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODAL SOLICITAR DEVOLUCIÓN */}
      {showDevModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white border border-gray-200 rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 text-left max-h-[90vh] overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-150">
                <h3 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-1.5">
                  <BsArrowClockwise /> Solicitar Devolución de Autoconsumo
                </h3>
                <button
                  onClick={() => { setShowDevModal(false); setMotivoDevolucion(''); }}
                  className="text-gray-400 hover:text-gray-650 text-xl p-1 flex items-center justify-center"
                >
                  <BsX className="text-2xl" />
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
                        (auto.detalles || []).forEach((d) => {
                          const maxDev = d.cantidad_disponible !== undefined ? d.cantidad_disponible : d.cantidad;
                          allMax[d.producto_id] = maxDev;
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
                        (auto.detalles || []).forEach((d) => {
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

                {(auto.detalles || []).map((d) => {
                  const maxDisponible = d.cantidad_disponible !== undefined ? d.cantidad_disponible : d.cantidad;
                  const devueltasPrevias = d.cantidad_devuelta || 0;
                  const currentVal = cantidadesDevolucion[d.producto_id] || 0;
                  return (
                    <div key={d.producto_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-gray-150 rounded-xl shadow-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-xs truncate">{d.producto_nombre}</p>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                          Despachadas: {d.cantidad} {devueltasPrevias > 0 && <span className="text-amber-600 font-semibold">(Ya devueltas: {devueltasPrevias})</span>} • <span className="text-emerald-700 font-bold">Disponibles: {maxDisponible}</span>
                        </p>
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
                            disabled={currentVal >= maxDisponible}
                            onClick={() => {
                              setCantidadesDevolucion({
                                ...cantidadesDevolucion,
                                [d.producto_id]: Math.min(maxDisponible, currentVal + 1)
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
                  value={motivoDevolucion}
                  onChange={(e) => setMotivoDevolucion(e.target.value)}
                  placeholder="Detalla el motivo de la devolución aquí (ej. no se consumieron en el evento)..."
                  className="w-full h-20 border border-gray-300 rounded-xl p-3 text-xs focus:ring-1 focus:ring-gray-400 focus:outline-none resize-none font-sans"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-gray-150">
              <button
                onClick={() => { setShowDevModal(false); setMotivoDevolucion(''); }}
                className="w-full sm:w-auto bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 px-5 py-3 sm:py-2 rounded-xl text-xs font-bold transition text-center"
              >
                Cerrar
              </button>
              <button
                onClick={handleDevSubmit}
                disabled={!motivoDevolucion.trim()}
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
