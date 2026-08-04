import React from 'react';
import { BsSearch, BsArrowUp, BsArrowDown } from 'react-icons/bs';

export interface SelectFilterOption {
  label: string;
  value: string | number;
}

export interface SelectFilterGroup {
  id: string;
  placeholder: string;
  value: string | number;
  onChange: (value: string) => void;
  options: SelectFilterOption[];
}

export interface SortOption {
  label: string;
  value: string;
}

export interface SearchAndFilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectFilters?: SelectFilterGroup[];
  sortOptions?: SortOption[];
  sortValue?: string;
  onSortValueChange?: (value: string) => void;
  sortOrder?: 'asc' | 'desc';
  onSortOrderChange?: () => void;
  totalResults?: number;
  totalCount?: number;
  resultsLabel?: string;
}

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchPlaceholder = 'Buscar...',
  searchValue,
  onSearchChange,
  selectFilters = [],
  sortOptions = [],
  sortValue = '',
  onSortValueChange,
  sortOrder = 'asc',
  onSortOrderChange,
  totalResults,
  totalCount,
  resultsLabel = 'resultados',
}) => {
  return (
    <div className="space-y-3">
      {(totalResults !== undefined || totalCount !== undefined) && (
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded">
            Mostrando {totalResults !== undefined ? totalResults : 0}
            {totalCount !== undefined ? ` de ${totalCount}` : ''} {resultsLabel}
          </span>
        </div>
      )}

      <div className="bg-white border border-gray-250/70 rounded-xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Buscador Principal */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <BsSearch className="w-4 h-4 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 h-10 border border-gray-300 rounded-lg text-xs placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
          />
        </div>

        {/* 2. Selects de Filtros */}
        {selectFilters.map((filter) => (
          <div key={filter.id}>
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="w-full px-3 h-10 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              <option value="ALL">{filter.placeholder}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* 3. Selector de Ordenamiento */}
        {sortOptions.length > 0 && onSortValueChange && (
          <div className="flex gap-1 items-center">
            <select
              value={sortValue}
              onChange={(e) => onSortValueChange(e.target.value)}
              className="flex-grow px-3 h-10 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-gray-400"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {onSortOrderChange && (
              <button
                type="button"
                onClick={onSortOrderChange}
                className="h-10 w-10 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-600 font-bold flex items-center justify-center shrink-0"
                title={sortOrder === 'asc' ? 'Orden Ascendente' : 'Orden Descendente'}
              >
                {sortOrder === 'asc' ? <BsArrowUp className="w-3.5 h-3.5" /> : <BsArrowDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
