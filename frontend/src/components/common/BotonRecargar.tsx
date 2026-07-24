import React from 'react';

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
      <svg
        className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 4v6h-6" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    </button>
  );
};
export default BotonRecargar;
