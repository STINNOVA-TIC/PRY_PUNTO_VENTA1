import React from 'react';
import { BsGraphUp } from 'react-icons/bs';
import { ConsumoTemporalItem } from './types';

interface ChartTendenciaTemporalProps {
  loading: boolean;
  modoTemporal: 'semanal' | 'mensual';
  onCambiarModo: (modo: 'semanal' | 'mensual') => void;
  consumoSemanal: ConsumoTemporalItem[];
  consumoMensual: ConsumoTemporalItem[];
}

export const ChartTendenciaTemporal: React.FC<ChartTendenciaTemporalProps> = ({
  loading,
  modoTemporal,
  onCambiarModo,
  consumoSemanal,
  consumoMensual
}) => {
  const dataActual = modoTemporal === 'semanal' ? consumoSemanal : consumoMensual;
  const maxValor = Math.max(...dataActual.map(d => d.total), 1);
  const totalPeriodo = dataActual.reduce((acc, curr) => acc + curr.total, 0);

  // Configuración de coordenadas SVG
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingTop = 25;
  const paddingBottom = 40;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingTop - paddingBottom;

  const points = dataActual.map((item, idx) => {
    const x = paddingX + (idx / Math.max(dataActual.length - 1, 1)) * usableWidth;
    const ratio = item.total / maxValor;
    const y = paddingTop + usableHeight - ratio * usableHeight;
    return { x, y, item };
  });

  const linePath = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + usableHeight} L ${points[0].x} ${paddingTop + usableHeight} Z`
    : '';

  return (
    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <BsGraphUp className="text-base" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              Tendencia de Consumo ({modoTemporal === 'semanal' ? 'Día a Día - Últimos 7 Días' : 'Mes a Mes - Último Semestre'})
            </h3>
            <p className="text-[11px] text-gray-400">
              {modoTemporal === 'semanal'
                ? 'Evolución diaria del gasto de colaboradores durante la última semana'
                : 'Comparativa histórica de consumo mensual en la empresa'}
            </p>
          </div>
        </div>

        {/* Selector de periodo Semanal / Mensual */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => onCambiarModo('semanal')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              modoTemporal === 'semanal'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Semanal (7 días)
          </button>
          <button
            onClick={() => onCambiarModo('mensual')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              modoTemporal === 'mensual'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Mensual (6 meses)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-44 bg-gray-50 rounded-xl animate-pulse flex items-center justify-center text-xs text-gray-400">
          Cargando datos históricos...
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Resumen numérico */}
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Total acumulado en el periodo:
            </div>
            <div className="text-sm font-bold text-gray-900 font-mono">
              ${totalPeriodo.toFixed(2)}
            </div>
          </div>

          {/* Gráfico de Líneas y Área SVG */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-[500px]">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto overflow-visible select-none"
              >
                <defs>
                  {/* Gradiente sutil para el área sombreada */}
                  <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                    <stop offset="90%" stopColor="#10b981" stopOpacity="0.02" />
                  </linearGradient>
                  {/* Gradiente de trazo de línea */}
                  <linearGradient id="lineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>

                {/* Líneas guía horizontales de fondo */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = paddingTop + usableHeight * (1 - ratio);
                  const val = maxValor * ratio;
                  return (
                    <g key={i}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={svgWidth - paddingX}
                        y2={y}
                        stroke="#f3f4f6"
                        strokeWidth="1"
                        strokeDasharray={ratio > 0 && ratio < 1 ? '4 4' : 'none'}
                      />
                      <text
                        x={paddingX - 8}
                        y={y + 3}
                        textAnchor="end"
                        className="text-[9px] fill-gray-400 font-mono"
                      >
                        ${val.toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* Área sombreada bajo la curva */}
                {areaPath && (
                  <path
                    d={areaPath}
                    fill="url(#lineAreaGradient)"
                    className="transition-all duration-700 ease-out"
                  />
                )}

                {/* Línea principal */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="url(#lineStrokeGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-700 ease-out"
                  />
                )}

                {/* Puntos / Nodos estables sin desplazamientos indeseados */}
                {points.map((p, idx) => {
                  const esUltimo = idx === points.length - 1;
                  return (
                    <g key={idx} className="cursor-default">
                      {/* Aro pulsante sutil en el último dato */}
                      {esUltimo && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="8"
                          className="fill-emerald-400/30 animate-ping pointer-events-none"
                        />
                      )}

                      {/* Círculo exterior fijo */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={esUltimo ? 5.5 : 4.5}
                        fill="#ffffff"
                        stroke={esUltimo ? '#10b981' : '#6366f1'}
                        strokeWidth="2.5"
                      />

                      {/* Valor superior */}
                      <text
                        x={p.x}
                        y={p.y - 10}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-gray-700 font-mono select-none"
                      >
                        ${p.item.total.toFixed(0)}
                      </text>

                      {/* Etiqueta inferior del eje X */}
                      <text
                        x={p.x}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        className={`text-[10px] font-medium select-none ${
                          esUltimo ? 'fill-emerald-700 font-bold' : 'fill-gray-500'
                        }`}
                      >
                        {p.item.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
