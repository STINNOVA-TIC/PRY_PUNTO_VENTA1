import React, { useState } from 'react';
import {
  BsLightningChargeFill,
  BsCheckCircleFill,
  BsBoxSeamFill,
  BsArrowCounterclockwise,
  BsBoxes,
  BsExclamationCircleFill,
  BsClock,
  BsArrowsFullscreen,
  BsX
} from 'react-icons/bs';
import { EventoActividad } from './types';

interface LiveActivityFeedProps {
  eventos: EventoActividad[];
  loading?: boolean;
  socketConectado: boolean;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  eventos,
  loading,
  socketConectado
}) => {
  const [modalAbierto, setModalAbierto] = useState(false);

  const getIconAndStyle = (tipo: EventoActividad['tipo']) => {
    switch (tipo) {
      case 'entrega':
        return {
          icon: <BsCheckCircleFill className="text-emerald-500 text-sm" />,
          bgColor: 'bg-emerald-50/70',
          borderColor: 'border-emerald-200/60',
          pillColor: 'bg-emerald-100 text-emerald-800'
        };
      case 'autoconsumo':
        return {
          icon: <BsBoxSeamFill className="text-blue-500 text-sm" />,
          bgColor: 'bg-blue-50/70',
          borderColor: 'border-blue-200/60',
          pillColor: 'bg-blue-100 text-blue-800'
        };
      case 'devolucion':
        return {
          icon: <BsArrowCounterclockwise className="text-purple-500 text-sm" />,
          bgColor: 'bg-purple-50/70',
          borderColor: 'border-purple-200/60',
          pillColor: 'bg-purple-100 text-purple-800'
        };
      case 'inventario':
        return {
          icon: <BsBoxes className="text-indigo-500 text-sm" />,
          bgColor: 'bg-indigo-50/70',
          borderColor: 'border-indigo-200/60',
          pillColor: 'bg-indigo-100 text-indigo-800'
        };
      case 'alerta':
      default:
        return {
          icon: <BsExclamationCircleFill className="text-amber-500 text-sm" />,
          bgColor: 'bg-amber-50/70',
          borderColor: 'border-amber-200/60',
          pillColor: 'bg-amber-100 text-amber-800'
        };
    }
  };

  const eventosVistaPrevia = eventos.slice(0, 3);

  return (
    <>
      {/* Tarjeta de Resumen en el Dashboard */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3.5">
        {/* Encabezado con estado en vivo y botón para desplegar modal */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <BsLightningChargeFill className="text-base animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-800">
                  Feed de Actividad Reciente
                </h3>
                {socketConectado ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    EN VIVO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    HISTÓRICO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Auditoría y trazabilidad visual de operaciones en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-gray-400 font-medium">
              {eventos.length} registrados
            </span>
            <button
              onClick={() => setModalAbierto(true)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Abrir ventana con todos los eventos de auditoría"
            >
              <BsArrowsFullscreen className="text-[11px]" />
              <span>Ver todos</span>
            </button>
          </div>
        </div>

        {/* Vista previa compacta (3 eventos) */}
        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2].map(i => (
              <div key={i} className="flex gap-3 p-3 rounded-xl border border-gray-100 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                  <div className="h-2.5 bg-gray-100 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : eventos.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-xs">
            No hay actividad registrada en las últimas horas.
          </div>
        ) : (
          <div className="space-y-2">
            {eventosVistaPrevia.map(ev => {
              const style = getIconAndStyle(ev.tipo);
              return (
                <div
                  key={ev.id}
                  onClick={() => setModalAbierto(true)}
                  className={`p-3 rounded-xl border ${style.borderColor} ${style.bgColor} flex items-start justify-between gap-3 transition hover:shadow-xs cursor-pointer group`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/90 shadow-2xs border border-white/60 shrink-0 mt-0.5">
                      {style.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800 leading-snug">
                          {ev.titulo}
                        </span>
                        {ev.badge && (
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${style.pillColor}`}>
                            {ev.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">
                        {ev.descripcion}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0 mt-0.5">
                    <BsClock className="text-[10px]" />
                    <span>{ev.tiempo}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Desplegable de Auditoría Completa */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-left">
            {/* Header del Modal */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <BsLightningChargeFill className="text-base" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-800">
                      Historial de Actividad & Auditoría en Vivo
                    </h3>
                    {socketConectado && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        EN VIVO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Listado cronológico de despachos, retiros, autoconsumos y ajustes en tiempo real.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <BsX className="text-2xl" />
              </button>
            </div>

            {/* Lista completa desplazable en el modal */}
            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {eventos.map(ev => {
                const style = getIconAndStyle(ev.tipo);
                return (
                  <div
                    key={ev.id}
                    className={`p-3.5 rounded-xl border ${style.borderColor} ${style.bgColor} flex items-start justify-between gap-3 transition hover:shadow-xs`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white shadow-2xs border border-white/80 shrink-0 mt-0.5">
                        {style.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800 leading-snug">
                            {ev.titulo}
                          </span>
                          {ev.badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.pillColor}`}>
                              {ev.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                          {ev.descripcion}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0 mt-0.5">
                      <BsClock className="text-[10px]" />
                      <span>{ev.tiempo}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie del modal */}
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
              <span>{eventos.length} eventos en memoria</span>
              <button
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
