import React from 'react';

interface PaginacionProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
}

export const Paginacion: React.FC<PaginacionProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 30, 50, 100]
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      // Si estamos cerca del inicio
      if (currentPage <= 3) {
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
      }
      // Si estamos cerca del final
      else if (currentPage >= totalPages - 2) {
        pages.push('...');
        for (let i = totalPages - 3; i < totalPages; i++) {
          pages.push(i);
        }
      }
      // Si estamos en el medio
      else {
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        pages.push('...');
      }

      pages.push(totalPages);
    }

    // Limpiar duplicados de '...' consecutivos
    return pages.filter((item, index, self) => {
      if (item === '...' && self[index - 1] === '...') return false;
      return true;
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t border-gray-150 bg-white font-sans text-xs select-none">
      
      {/* Selector de Items por Página */}
      <div className="flex items-center gap-2">
        <select
          value={itemsPerPage}
          onChange={(e) => {
            onItemsPerPageChange(Number(e.target.value));
            onPageChange(1); // Reset to page 1 on resize
          }}
          className="px-2 py-1.5 border border-gray-300 rounded bg-white text-gray-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
        >
          {itemsPerPageOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span className="text-gray-400 text-[11px]">por página</span>
      </div>

      {/* Controladores de Página */}
      <div className="flex items-center gap-1.5">
        
        {/* Retroceder */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-7 h-7 flex items-center justify-center border border-gray-250 rounded text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        >
          &lt;
        </button>

        {/* Listado de Números */}
        {getPageNumbers().map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`dots-${idx}`} className="w-7 h-7 flex items-center justify-center text-gray-400 select-none">
                ...
              </span>
            );
          }

          return (
            <button
              key={`page-${page}`}
              type="button"
              onClick={() => handlePageClick(page as number)}
              className={`w-7 h-7 flex items-center justify-center font-bold rounded transition active:scale-95 cursor-pointer ${
                currentPage === page
                  ? 'bg-lime-650 hover:bg-lime-750 text-white'
                  : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {page}
            </button>
          );
        })}

        {/* Avanzar */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-7 h-7 flex items-center justify-center border border-gray-250 rounded text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        >
          &gt;
        </button>
      </div>

      {/* Cantidad Total de Registros */}
      <div className="text-gray-550 font-medium">
        Total <span className="font-bold text-gray-800">{totalItems}</span> Registros
      </div>

    </div>
  );
};
