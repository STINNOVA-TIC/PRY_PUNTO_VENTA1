import React, { useState, useRef, useEffect } from 'react';
import { BsFileEarmarkText, BsBarChart, BsFileEarmarkPdf, BsChevronDown } from 'react-icons/bs';

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
        <BsChevronDown className={`h-3 w-3 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
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
            <BsFileEarmarkText className="text-gray-400 text-sm shrink-0" /> CSV
          </button>
          <button
            type="button"
            onClick={() => {
              onExportXLSX();
              setShowDropdown(false);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-55 flex items-center gap-2 transition"
          >
            <BsBarChart className="text-emerald-600 text-sm shrink-0" /> Excel
          </button>
          <button
            type="button"
            onClick={() => {
              onExportPDF();
              setShowDropdown(false);
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <BsFileEarmarkPdf className="text-red-600 text-sm shrink-0" /> PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default BotonDescargar;
