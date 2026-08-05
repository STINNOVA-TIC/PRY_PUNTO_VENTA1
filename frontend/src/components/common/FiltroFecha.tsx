import React from 'react';

export type DateFilterType = 'todos' | 'hoy' | 'ayer' | 'semana' | 'mes';

interface FiltroFechaProps {
  value: DateFilterType;
  onChange: (value: DateFilterType) => void;
  label?: string;
}

export const FiltroFecha: React.FC<FiltroFechaProps> = ({
  value,
  onChange,
  label = 'Fecha:',
}) => {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DateFilterType)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 focus:outline-none focus:border-gray-400 shadow-sm transition cursor-pointer"
      >
        <option value="todos">Todos los días</option>
        <option value="hoy">Hoy</option>
        <option value="ayer">Ayer</option>
        <option value="semana">Últimos 7 días</option>
        <option value="mes">Este mes</option>
      </select>
    </div>
  );
};
