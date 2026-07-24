import React, { useState, useRef, useEffect } from 'react';

interface BotonDescargarProps {
  onExportCSV: () => void;
  onExportXLSX: () => void;
  onExportPDF: () => void;
  label?: string;
}

export const BotonDescargar: React.FC<BotonDescargarProps> = ({
  onExportCSV,
  onExportXLSX,
  onExportPDF,
  label = 'Descargar',
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 flex items-center gap-1.5"
      >
        <span>{label}</span>
        <svg
          className={`h-3 w-3 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-1.5 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 border border-gray-200 py-1.5 divide-y divide-gray-50">
          <button
            type="button"
            onClick={() => {
              onExportCSV();
              setShowDropdown(false);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <span className="text-gray-400">📄</span> CSV
          </button>
          <button
            type="button"
            onClick={() => {
              onExportXLSX();
              setShowDropdown(false);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <span className="text-emerald-600">📊</span> Excel
          </button>
          <button
            type="button"
            onClick={() => {
              onExportPDF();
              setShowDropdown(false);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <span className="text-red-600">📕</span> PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default BotonDescargar;
