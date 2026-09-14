import React from 'react';
import { BsGear, BsCheck2Square, BsSquare } from 'react-icons/bs';
import { MetricaDef } from './types';

interface ModalPersonalizarMetricasProps {
  isOpen: boolean;
  onClose: () => void;
  metricasAutorizadas: MetricaDef[];
  metricasOcultas: string[];
  onToggleMetrica: (id: string) => void;
}

export const ModalPersonalizarMetricas: React.FC<ModalPersonalizarMetricasProps> = ({
  isOpen,
  onClose,
  metricasAutorizadas,
  metricasOcultas,
  onToggleMetrica
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 text-left">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <BsGear /> Personalizar Métricas
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Elige qué indicadores deseas visualizar en tu pantalla principal.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {metricasAutorizadas.map(m => {
            const isVisible = !metricasOcultas.includes(m.id);
            return (
              <div
                key={m.id}
                onClick={() => onToggleMetrica(m.id)}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-55 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${m.bgLight} ${m.color}`}>
                    {m.icono}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">{m.titulo}</div>
                    <div className="text-[11px] text-gray-400">{m.subtitulo}</div>
                  </div>
                </div>
                <div>
                  {isVisible ? (
                    <BsCheck2Square className="text-emerald-600 text-lg" />
                  ) : (
                    <BsSquare className="text-gray-300 text-lg" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
