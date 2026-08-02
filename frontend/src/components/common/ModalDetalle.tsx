import React from 'react';

export interface CampoDetalle {
  label: string;
  value: React.ReactNode;
}

interface ModalDetalleProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  campos?: CampoDetalle[];
  children?: React.ReactNode;
}

export const ModalDetalle: React.FC<ModalDetalleProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  campos = [],
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 text-left max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start pb-2 border-b border-gray-100 gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5 break-words">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg shrink-0"
            aria-label="Cerrar"
          >
            x
          </button>
        </div>

        {badge}

        {campos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {campos.map((c, i) => (
              <div key={i}>
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  {c.label}
                </span>
                <span className="text-xs text-gray-700 font-medium break-words">{c.value}</span>
              </div>
            ))}
          </div>
        )}

        {children}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
