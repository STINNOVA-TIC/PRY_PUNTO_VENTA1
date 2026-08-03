import React from 'react';
import { BsArrowClockwise } from 'react-icons/bs';

interface BotonRecargarProps {
  onRefresh: () => void | Promise<void>;
  loading: boolean;
  className?: string;
}

export const BotonRecargar: React.FC<BotonRecargarProps> = ({
  onRefresh,
  loading,
  className = '',
}) => {
  // Clase base premium neutra y consistente con el diseño general
  const baseClass = className.includes('bg-')
    ? className // Si se proveen clases específicas de fondo/bordes se respetan
    : `h-8 w-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-600 rounded-lg transition active:scale-95 disabled:opacity-60 ${className}`;

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      title="Recargar datos"
      className={baseClass}
    >
      <BsArrowClockwise className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );
};
export default BotonRecargar;
