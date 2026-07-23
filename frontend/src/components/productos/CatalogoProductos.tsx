import React, { useState, useEffect } from 'react';
import { productosAPI } from '../../api/productos.api';
import { Producto } from '../../types';
import { ProductoCard } from './ProductoCard';

interface CatalogoProductosProps {
  onAgregarProducto?: (producto: Producto) => void;
}

export const CatalogoProductos: React.FC<CatalogoProductosProps> = ({ onAgregarProducto }) => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'ALL'>('ALL');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        productosAPI.getAll(),
        productosAPI.getCategorias()
      ]);
      setProductos(prodRes.data);
      setCategorias(catRes.data);
    } catch (error) {
      console.error('Error cargando datos del catálogo:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = productos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.codigo_barras.includes(search);
    if (!matchesSearch) return false;
    
    if (selectedCategoryId === 'ALL') return true;
    return p.categoria_id === selectedCategoryId;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        <p className="text-sm text-gray-500 font-medium">Cargando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white border border-gray-150 p-4 rounded-xl shadow-sm">
        
        {/* Input de Búsqueda */}
        <div className="relative w-full md:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
          />
        </div>

        {/* Botones de Categorías */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1.5 md:pb-0 scrollbar-thin">
          <button
            onClick={() => setSelectedCategoryId('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
              selectedCategoryId === 'ALL'
                ? 'bg-gray-800 text-white shadow-sm'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            Todos
          </button>
          {categorias
            .filter((cat) => productos.some((p) => p.categoria_id === cat.id))
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                  selectedCategoryId === cat.id
                    ? 'bg-gray-800 text-white shadow-sm'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
        </div>

      </div>

      {/* Grilla de Productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((producto) => (
          <ProductoCard
            key={producto.id}
            producto={producto}
            onAgregar={onAgregarProducto}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-500 font-medium">No se encontraron productos en esta categoría</p>
        </div>
      )}
    </div>
  );
};
