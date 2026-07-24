import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productosAPI } from '../../api/productos.api';
import { ordenesAPI } from '../../api/ordenes.api';
import { adminAPI } from '../../api/admin.api';
import { Producto } from '../../types';
import { ModalImportExport } from '../common/ModalImportExport';
import { BotonRecargar } from '../common/BotonRecargar';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';

export const PanelInventario: React.FC = () => {
  const { user } = useAuth();
  const rol = user?.rol.nombre;
  const { showConfirm, showAlert } = useModal();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [proveedores, setProveedores] = useState<{ id: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Formulario de Producto
  const [showProductForm, setShowProductForm] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioCosto, setPrecioCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [stock, setStock] = useState('');
  const [foto, setFoto] = useState('');
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  // Estados de subida de fotos
  const [urlOption, setUrlOption] = useState<'url' | 'file'>('url');
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setSubiendoFoto(true);
        const res = await adminAPI.uploadPhoto(file, 'producto');
        setFoto(res.url);
      } catch (err) {
        console.error('Error al subir foto:', err);
      } finally {
        setSubiendoFoto(false);
      }
    }
  };
  const [selectedCategoria, setSelectedCategoria] = useState<number | ''>('');
  const [selectedProveedor, setSelectedProveedor] = useState<number | ''>('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Formulario de Ajuste de Stock
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [newStockVal, setNewStockVal] = useState('');

  // Formulario de Orden de Compra
  const [showOCForm, setShowOCForm] = useState(false);
  const [ocJustificacion, setOcJustificacion] = useState('');
  const [selectedProductForOC, setSelectedProductForOC] = useState<number | ''>('');
  const [ocCantidad, setOcCantidad] = useState('');
  const [ocError, setOcError] = useState('');
  const [ocSuccess, setOcSuccess] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const prodRes = await productosAPI.getAll();
      setProductos(prodRes.data);

      const ordRes = await ordenesAPI.getAll();
      setOrdenes(ordRes.data);

      // Cargar categorías y proveedores para la creación de productos
      const catRes = await productosAPI.getCategorias();
      setCategorias(catRes.data);
      if (catRes.data.length > 0) {
        setSelectedCategoria(catRes.data[0].id);
      }

      const provRes = await productosAPI.getProveedores();
      setProveedores(provRes.data);
      if (provRes.data.length > 0) {
        setSelectedProveedor(provRes.data[0].id);
      }
    } catch (error) {
      console.error('Error cargando datos de inventario:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!codigo || !nombre || !precioVenta || (!editingProductId && !stock) || !selectedCategoria || !selectedProveedor) {
      setFormError('Los campos Código, Nombre, Precio Venta, Categoría y Proveedor son requeridos.');
      return;
    }

    try {
      if (editingProductId) {
        await adminAPI.update('producto', editingProductId, {
          categoria_id: Number(selectedCategoria),
          proveedor_id: Number(selectedProveedor),
          producto_codigo: codigo,
          producto_nombre: nombre,
          producto_descripcion: descripcion,
          producto_precio: parseFloat(precioVenta),
          producto_precio_compra: parseFloat(precioCosto || '0'),
          producto_foto: foto || null
        });
        setFormSuccess('Producto actualizado exitosamente.');
      } else {
        await productosAPI.create({
          codigo_barras: codigo,
          nombre,
          descripcion,
          precio_costo: parseFloat(precioCosto || '0'),
          precio_venta: parseFloat(precioVenta),
          stock_actual: parseInt(stock),
          categoria_id: Number(selectedCategoria),
          proveedor_id: Number(selectedProveedor),
          foto: foto || undefined
        });
        setFormSuccess('Producto creado exitosamente.');
      }

      setCodigo('');
      setNombre('');
      setDescripcion('');
      setPrecioCosto('');
      setPrecioVenta('');
      setStock('');
      setFoto('');
      setSelectedCategoria('');
      setSelectedProveedor('');
      setEditingProductId(null);

      // Cerrar formulario tras 1.5s
      setTimeout(() => {
        setShowProductForm(false);
        setFormSuccess('');
      }, 1500);

      cargarDatos();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al guardar los datos del producto');
    }
  };

  const handleEditProductClick = (p: Producto) => {
    setEditingProductId(p.id);
    setCodigo(p.codigo_barras);
    setNombre(p.nombre);
    setDescripcion(p.descripcion || '');
    setPrecioCosto(p.precio_costo.toString());
    setPrecioVenta(p.precio_venta.toString());
    setSelectedCategoria(p.categoria_id || '');
    setSelectedProveedor(p.proveedor_id || '');
    setFoto(p.foto || '');
    setUrlOption(p.foto ? 'url' : 'file');
    setShowProductForm(true);
    setShowOCForm(false);
    setFormError('');
    setFormSuccess('');
  };

  const handleCancelProductForm = () => {
    setCodigo('');
    setNombre('');
    setDescripcion('');
    setPrecioCosto('');
    setPrecioVenta('');
    setStock('');
    setFoto('');
    setSelectedCategoria('');
    setSelectedProveedor('');
    setEditingProductId(null);
    setShowProductForm(false);
    setFormError('');
    setFormSuccess('');
  };

  const handleDeleteProduct = async (id: number) => {
    const confirm = await showConfirm({
      title: 'Eliminar Producto',
      message: '¿Está seguro de que desea eliminar permanentemente este producto de la base de datos? Esta acción no se puede deshacer.',
      type: 'danger'
    });

    if (confirm) {
      try {
        await adminAPI.delete('producto', id);
        cargarDatos();
      } catch (err: any) {
        await showAlert({
          title: 'Error al Eliminar',
          message: err.response?.data?.message || 'No se pudo eliminar el producto físicamente de la base de datos.',
          type: 'danger'
        });
      }
    }
  };

  const handleToggleProductStatus = async (id: number, currentStatus: boolean) => {
    const actionText = currentStatus ? 'desactivar' : 'activar';
    const confirm = await showConfirm({
      title: `${currentStatus ? 'Desactivar' : 'Activar'} Producto`,
      message: `¿Está seguro de que desea ${actionText} este producto?`,
      type: 'warning'
    });

    if (confirm) {
      try {
        await adminAPI.toggleStatus('producto', id, !currentStatus);
        cargarDatos();
      } catch (err: any) {
        await showAlert({
          title: 'Error',
          message: err.response?.data?.message || 'No se pudo cambiar el estado del producto',
          type: 'danger'
        });
      }
    }
  };

  const columnsConfig = [
    { key: 'codigo_barras', label: 'Código' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'precio_costo', label: 'Precio Compra ($)' },
    { key: 'precio_venta', label: 'Precio Venta ($)' },
    { key: 'stock_actual', label: 'Existencia' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'proveedor', label: 'Proveedor' },
    { key: 'foto', label: 'Foto' }
  ];

  const productosMapeadosParaExportar = productos.map((p) => {
    const cat = categorias.find((c) => c.id === p.categoria_id);
    const prov = proveedores.find((pr) => pr.id === p.proveedor_id);
    return {
      ...p,
      categoria: cat ? cat.nombre : 'Sin Categoría',
      proveedor: prov ? prov.nombre : 'Sin Proveedor',
    };
  });

  const handleImportProductos = async (importedRows: any[]) => {
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < importedRows.length; i++) {
      const row = importedRows[i];

      if (!row.codigo_barras || !row.nombre || !row.precio_venta || !row.stock_actual) {
        errors.push(`Fila ${i + 1}: Código, Nombre, Precio Venta y Existencia son obligatorios.`);
        continue;
      }

      // Buscar categoria_id por nombre
      const foundCat = categorias.find(
        (c) => c.nombre.toLowerCase().trim() === String(row.categoria || '').toLowerCase().trim()
      );

      // Buscar proveedor_id por nombre
      const foundProv = proveedores.find(
        (pr) => pr.nombre.toLowerCase().trim() === String(row.proveedor || '').toLowerCase().trim()
      );

      if (!foundCat) {
        errors.push(`Fila ${i + 1} (${row.nombre}): Categoría "${row.categoria}" no existe en el sistema.`);
        continue;
      }

      if (!foundProv) {
        errors.push(`Fila ${i + 1} (${row.nombre}): Proveedor "${row.proveedor}" no existe en el sistema.`);
        continue;
      }

      try {
        await productosAPI.create({
          codigo_barras: String(row.codigo_barras),
          nombre: String(row.nombre),
          descripcion: row.descripcion ? String(row.descripcion) : '',
          precio_costo: row.precio_costo ? parseFloat(row.precio_costo) : 0,
          precio_venta: parseFloat(row.precio_venta),
          stock_actual: parseInt(row.stock_actual),
          categoria_id: foundCat.id,
          proveedor_id: foundProv.id,
          foto: row.foto ? String(row.foto) : undefined
        });
        successCount++;
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Error desconocido';
        errors.push(`Fila ${i + 1} (${row.nombre}): ${msg}`);
      }
    }

    cargarDatos();
    return { successCount, errors };
  };

  const handleUpdateStock = async (id: number) => {
    if (!newStockVal || isNaN(parseInt(newStockVal))) return;

    try {
      await productosAPI.updateStock(id, parseInt(newStockVal));
      setEditingStockId(null);
      setNewStockVal('');
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando stock:', error);
    }
  };

  const handleCreateOC = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcError('');
    setOcSuccess('');

    if (!ocJustificacion || !selectedProductForOC || !ocCantidad) {
      setOcError('Todos los campos de la orden de compra son requeridos.');
      return;
    }

    try {
      await ordenesAPI.crear({
        justificacion: ocJustificacion,
        detalles: [
          {
            producto_id: parseInt(selectedProductForOC as any),
            cantidad: parseInt(ocCantidad)
          }
        ]
      });

      setOcSuccess('Orden de compra generada exitosamente.');
      setOcJustificacion('');
      setSelectedProductForOC('');
      setOcCantidad('');
      setShowOCForm(false);
      cargarDatos();
    } catch (err: any) {
      setOcError(err.response?.data?.message || 'Error al generar la orden de compra');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        <p className="text-sm text-gray-500 font-medium">Cargando almacén e inventarios...</p>
      </div>
    );
  }

  return (
    <div className="font-sans space-y-8">
      
      {/* SECCIÓN 1: CABECERA & CONTROLES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Gestión de Inventario y Abastecimiento</h1>
          <p className="text-xs text-gray-500 mt-1">Control de existencias y emisión de órdenes de reabastecimiento</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <BotonRecargar onRefresh={cargarDatos} loading={loading} />
          <button
            type="button"
            onClick={() => setIsImportExportOpen(true)}
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-750 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            Importar / Exportar
          </button>
          <button
            onClick={() => {
              if (showProductForm) {
                handleCancelProductForm();
              } else {
                setShowProductForm(true);
                setShowOCForm(false);
              }
            }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            {showProductForm ? 'Cerrar Formulario' : 'Crear Nuevo Producto'}
          </button>
          
          <Link
            to="/requerimientos"
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold shadow-sm transition inline-flex items-center"
          >
            Generar Orden de Compra
          </Link>
        </div>
      </div>

      {/* MODAL / FORMULARIO: CREAR PRODUCTO */}
      {showProductForm && (
        <form onSubmit={handleCreateProduct} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-2xl space-y-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
            {editingProductId ? 'Editar Producto' : 'Nuevo Producto en Bodega'}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Código de producto</label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej. PROD-SOD-05"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre Comercial</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Jugo de Manzana Natural"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Descripción corta</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Envase de vidrio 400ml"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categoría</label>
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none"
                required
              >
                <option value="">Selecciona Categoría...</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Proveedor</label>
              <select
                value={selectedProveedor}
                onChange={(e) => setSelectedProveedor(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none"
                required
              >
                <option value="">Selecciona Proveedor...</option>
                {proveedores.map(prov => (
                  <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Precio Compra (Costo)</label>
              <input
                type="number"
                step="0.01"
                value={precioCosto}
                onChange={(e) => setPrecioCosto(e.target.value)}
                placeholder="0.90"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Precio Venta (POS)</label>
              <input
                type="number"
                step="0.01"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                placeholder="1.50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>

            {!editingProductId && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stock Inicial</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-500">Foto del Producto</label>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 font-medium text-gray-650">
                <input
                  type="radio"
                  name="photoOptionPOS"
                  checked={urlOption === 'url'}
                  onChange={() => setUrlOption('url')}
                />
                Dirección URL (Imagen Web)
              </label>
              <label className="flex items-center gap-1.5 font-medium text-gray-650">
                <input
                  type="radio"
                  name="photoOptionPOS"
                  checked={urlOption === 'file'}
                  onChange={() => setUrlOption('file')}
                />
                Subir archivo local
              </label>
            </div>

            {urlOption === 'url' ? (
              <input
                type="text"
                value={foto}
                onChange={(e) => setFoto(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoUpload}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            )}
            {subiendoFoto && <p className="text-[10px] text-gray-400 animate-pulse font-medium">Subiendo foto de producto...</p>}
            {foto && (
              <div className="pt-1">
                <p className="text-[10px] text-emerald-700 font-semibold mb-1">Vista previa:</p>
                <img src={foto} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
              </div>
            )}
          </div>

          {formError && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded">{formError}</p>}
          {formSuccess && <p className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded">{formSuccess}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold transition"
            >
              {editingProductId ? 'Guardar Cambios' : 'Registrar Producto'}
            </button>
            <button
              type="button"
              onClick={handleCancelProductForm}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-250 text-gray-650 rounded-lg text-xs font-semibold transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* MODAL / FORMULARIO: GENERAR ORDEN DE COMPRA */}
      {showOCForm && (
        <form onSubmit={handleCreateOC} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-2xl space-y-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
            Nueva Orden de Reabastecimiento
          </h3>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Producto a Reabastecer</label>
            <select
              value={selectedProductForOC}
              onChange={(e) => setSelectedProductForOC(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none"
              required
            >
              <option value="">Selecciona un producto...</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (Stock actual: {p.stock_actual})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cantidad a Solicitar</label>
              <input
                type="number"
                value={ocCantidad}
                onChange={(e) => setOcCantidad(e.target.value)}
                placeholder="Ej. 100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-500 mb-1">Justificación del pedido</label>
              <input
                type="text"
                value={ocJustificacion}
                onChange={(e) => setOcJustificacion(e.target.value)}
                placeholder="Ej. Reposición de stock por bajo nivel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          {ocError && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded">{ocError}</p>}
          {ocSuccess && <p className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded">{ocSuccess}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold transition"
            >
              Emitir Orden de Compra
            </button>
            <button
              type="button"
              onClick={() => setShowOCForm(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-250 text-gray-650 rounded-lg text-xs font-semibold transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* SECCIÓN 2: LISTADO DE PRODUCTOS EN BODEGA */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-gray-800">Catálogo Físico en Bodega</h2>
        
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                  <th className="px-5 py-3.5">Detalle</th>
                  <th className="px-5 py-3.5">Código</th>
                  <th className="px-5 py-3.5">Precio Compra</th>
                  <th className="px-5 py-3.5">Precio Venta</th>
                  <th className="px-5 py-3.5">Existencia</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productos.map((p) => {
                  const isLow = p.stock_actual <= 5;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.foto || 'https://img.icons8.com/fluent/1200/fast-moving-consumer-goods.jpg'}
                            alt={p.nombre}
                            className="w-12 h-12 rounded-lg border border-gray-200 object-cover"
                          />
                          <div>
                            <span className="font-semibold text-gray-800 block">{p.nombre}</span>
                            <span className="text-[10px] text-gray-400 block">{p.descripcion || 'Sin descripción'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-gray-400">{p.codigo_barras}</td>
                      <td className="px-5 py-4 font-medium text-gray-600">${p.precio_costo.toFixed(2)}</td>
                      <td className="px-5 py-4 font-bold text-gray-800">${p.precio_venta.toFixed(2)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-extrabold text-sm ${isLow ? 'text-red-600' : 'text-gray-700'}`}>
                            {p.stock_actual}
                          </span>
                          {isLow && (
                            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-red-50 text-red-500 rounded border border-red-100">
                              Bajo Mínimo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          p.activo 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-red-50 text-red-650 border-red-100'
                        }`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-2 justify-end items-center">
                          {editingStockId === p.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={newStockVal}
                                onChange={(e) => setNewStockVal(e.target.value)}
                                className="w-14 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-gray-400"
                                placeholder="Stock"
                              />
                              <button
                                onClick={() => handleUpdateStock(p.id)}
                                className="px-2 py-1 bg-gray-800 text-white rounded text-[10px] font-bold"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditingStockId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditProductClick(p)}
                                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-650 rounded-lg font-semibold text-[10px] transition"
                              >
                                Editar Detalle
                              </button>
                              <button
                                onClick={() => handleToggleProductStatus(p.id, p.activo)}
                                className={`px-3 py-1.5 border rounded-lg font-semibold text-[10px] transition ${
                                  p.activo 
                                    ? 'border-amber-250 hover:bg-amber-50 text-amber-600' 
                                    : 'border-emerald-250 hover:bg-emerald-50 text-emerald-600'
                                }`}
                              >
                                {p.activo ? 'Desactivar' : 'Activar'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingStockId(p.id);
                                  setNewStockVal(p.stock_actual.toString());
                                }}
                                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-655 rounded-lg font-semibold text-[10px] transition"
                              >
                                Ajustar Stock
                              </button>
                              {rol === 'admin' && (
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg font-semibold text-[10px] transition"
                                >
                                  Eliminar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: LISTADO DE ÓRDENES DE COMPRA */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-gray-800">Historial de Órdenes de Reabastecimiento</h2>

        {ordenes.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-250 rounded-xl text-gray-400 text-xs">
            No se han emitido órdenes de compra.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ordenes.map((oc) => (
              <div key={oc.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs text-gray-400 block">{oc.codigo}</span>
                    <span className="text-xs text-gray-450 block mt-0.5">Generador: {oc.usuario_nombre}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                    oc.estado === 'aprobada' || oc.estado === 'recibida'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {oc.estado}
                  </span>
                </div>

                <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100">
                  <span className="font-semibold text-gray-500 block text-[10px] uppercase mb-1">Justificación</span>
                  {oc.justificacion}
                </div>

                <div className="pt-2 border-t border-gray-50 text-xs">
                  <span className="font-semibold text-gray-500 block text-[10px] uppercase mb-1">Artículos solicitados</span>
                  <div className="space-y-1">
                    {oc.detalles.map((d: any) => (
                      <div key={d.id} className="flex justify-between text-gray-700">
                        <span>{d.producto_nombre}</span>
                        <span className="font-bold">x{d.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-right text-[10px] text-gray-400 pt-1">
                  Solicitado: {new Date(oc.fecha_solicitud).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalImportExport
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        title="Productos"
        columns={columnsConfig}
        data={productosMapeadosParaExportar}
        onImport={handleImportProductos}
      />
    </div>
  );
};
