import React from 'react';

export type TipoBotonAccion = 'editar' | 'eliminar' | 'activar' | 'desactivar' | 'ajustar_stock' | 'editar_detalle';

interface BotonAccionProps {
  tipo: TipoBotonAccion;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export const BotonAccion: React.FC<BotonAccionProps> = ({
  tipo,
  onClick,
  disabled = false,
  className = '',
  label,
}) => {
  const configs: Record<TipoBotonAccion, { styles: string; defaultLabel: string }> = {
    editar: {
      styles: 'border border-gray-300 hover:bg-gray-50 text-gray-650 font-semibold',
      defaultLabel: 'Editar',
    },
    editar_detalle: {
      styles: 'border border-gray-300 hover:bg-gray-50 text-gray-650 font-semibold',
      defaultLabel: 'Editar Detalle',
    },
    eliminar: {
      styles: 'border border-red-200 hover:bg-red-50 text-red-650 font-semibold',
      defaultLabel: 'Eliminar',
    },
    activar: {
      styles: 'border border-emerald-250 hover:bg-emerald-50 text-emerald-650 font-semibold',
      defaultLabel: 'Activar',
    },
    desactivar: {
      styles: 'border border-red-200 hover:bg-red-50 text-red-600 font-semibold',
      defaultLabel: 'Desactivar',
    },
    ajustar_stock: {
      styles: 'border border-gray-300 hover:bg-gray-50 text-gray-650 font-semibold',
      defaultLabel: 'Ajustar Stock',
    },
  };

  const config = configs[tipo];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition ${config.styles} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {label || config.defaultLabel}
    </button>
  );
};
