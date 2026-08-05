import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productosAPI } from '../../api/productos.api';
import { ordenesAPI } from '../../api/ordenes.api';
import { adminAPI } from '../../api/admin.api';
import { Producto } from '../../types';
import { BsFileEarmarkPdfFill, BsX } from 'react-icons/bs';
import { ModalImportExport } from '../common/ModalImportExport';
import { ModalFormulario, CampoFormulario } from '../common/ModalFormulario';
import { BotonRecargar } from '../common/BotonRecargar';
import { BotonAccion } from '../common/BotonAccion';
import { SearchAndFilterBar } from '../common/SearchAndFilterBar';
import { Paginacion } from '../common/Paginacion';
import { BotonDescargar } from '../common/BotonDescargar';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const PanelInventario: React.FC = () => {
  const { user } = useAuth();
  const rol = user?.rol.nombre;
  const { showConfirm, showAlert } = useModal();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [proveedores, setProveedores] = useState<{ id: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  
  // Modal de Producto (crear / editar)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);

  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Formulario de Ajuste de Stock
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [newStockVal, setNewStockVal] = useState('');

  // Filtros y Ordenamiento del Inventario
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'active' | 'inactive'>('ALL');
  const [filterStock, setFilterStock] = useState<'ALL' | 'low' | 'normal'>('ALL');
  const [sortBy, setSortBy] = useState<'codigo' | 'nombre' | 'precio_venta' | 'precio_costo' | 'stock_actual'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Paginación del Inventario
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Subsecciones y paginación del historial de órdenes
  const [moduloActivo, setModuloActivo] = useState<'inventario' | 'historial'>('inventario');
  const [historialPage, setHistorialPage] = useState(1);
  const [historialItemsPerPage, setHistorialItemsPerPage] = useState(5);

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

      const provRes = await productosAPI.getProveedores();
      setProveedores(provRes.data);
    } catch (error) {
      console.error('Error cargando datos de inventario:', error);
    } finally {
      setLoading(false);
    }
  };

  const camposProducto: CampoFormulario[] = [
    { name: 'codigo', label: 'Código de producto', tipo: 'texto', placeholder: 'Ej. PROD-SOD-05', required: true },
    { name: 'nombre', label: 'Nombre Comercial', tipo: 'texto', placeholder: 'Ej. Jugo de Manzana Natural', required: true },
    { name: 'descripcion', label: 'Descripción corta', tipo: 'texto', placeholder: 'Ej. Envase de vidrio 400ml', colSpan: 2 },
    {
      name: 'categoria_id',
      label: 'Categoría',
      tipo: 'select',
      placeholder: 'Selecciona Categoría...',
      opciones: categorias.map(cat => ({ value: cat.id, label: cat.nombre })),
      required: true
    },
    {
      name: 'proveedor_id',
      label: 'Proveedor',
      tipo: 'select',
      placeholder: 'Selecciona Proveedor...',
      opciones: proveedores.map(prov => ({ value: prov.id, label: prov.nombre })),
      required: true
    },
    { name: 'precio_costo', label: 'Precio Compra (Costo)', tipo: 'numero', placeholder: '0.90' },
    { name: 'precio_venta', label: 'Precio Venta (POS)', tipo: 'numero', placeholder: '1.50', required: true },
    ...(editingProduct ? [] : [{ name: 'stock', label: 'Stock Inicial', tipo: 'numero' as const, placeholder: '50', required: true }]),
    {
      name: 'foto',
      label: 'Foto del Producto',
      tipo: 'foto',
      fotoCarpeta: 'producto',
      colSpan: 2,
      fotoAviso: 'Puedes ingresar una URL o subir/tomar una foto desde tu dispositivo.'
    }
  ];

  const valoresInicialesProducto = (p: Producto | null): Record<string, any> => ({
    codigo: p?.codigo_barras || '',
    nombre: p?.nombre || '',
    descripcion: p?.descripcion || '',
    categoria_id: p?.categoria_id || (categorias.length > 0 ? categorias[0].id : ''),
    proveedor_id: p?.proveedor_id || (proveedores.length > 0 ? proveedores[0].id : ''),
    precio_costo: p ? p.precio_costo : '',
    precio_venta: p ? p.precio_venta : '',
    stock: p ? p.stock_actual : '',
    foto: p?.foto || ''
  });

  const handleGuardarProducto = async (valores: Record<string, any>) => {
    if (!valores.codigo || !valores.nombre || !valores.precio_venta || (!editingProduct && !valores.stock) || !valores.categoria_id || !valores.proveedor_id) {
      throw new Error('Los campos Código, Nombre, Precio Venta, Categoría y Proveedor son requeridos.');
    }

    try {
      if (editingProduct) {
        await adminAPI.update('producto', editingProduct.id, {
          categoria_id: Number(valores.categoria_id),
          proveedor_id: Number(valores.proveedor_id),
          producto_codigo: valores.codigo,
          producto_nombre: valores.nombre,
          producto_descripcion: valores.descripcion,
          producto_precio: parseFloat(valores.precio_venta),
          producto_precio_compra: parseFloat(valores.precio_costo || '0'),
          producto_foto: valores.foto || null
        });
        setMensaje('Producto actualizado exitosamente.');
      } else {
        await productosAPI.create({
          codigo_barras: valores.codigo,
          nombre: valores.nombre,
          descripcion: valores.descripcion,
          precio_costo: parseFloat(valores.precio_costo || '0'),
          precio_venta: parseFloat(valores.precio_venta),
          stock_actual: parseInt(valores.stock),
          categoria_id: Number(valores.categoria_id),
          proveedor_id: Number(valores.proveedor_id),
          foto: valores.foto || undefined
        });
        setMensaje('Producto creado exitosamente.');
      }

      setIsProductModalOpen(false);
      cargarDatos();
    } catch (err: any) {
      throw err;
    }
  };

  const handleEditProductClick = (p: Producto) => {
    setEditingProduct(p);
    setIsProductModalOpen(true);
  };

  const handleCreateProductClick = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
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

  // Filtrado y ordenamiento de productos
  const productosFiltrados = React.useMemo(() => {
    return productos
      .filter((p) => {
        // 1. Buscador (Código, Nombre, Descripción)
        const query = searchTerm.toLowerCase().trim();
        if (query) {
          const matchNombre = p.nombre.toLowerCase().includes(query);
          const matchDesc = (p.descripcion || '').toLowerCase().includes(query);
          const matchCodigo = p.codigo_barras.toLowerCase().includes(query);
          if (!matchNombre && !matchDesc && !matchCodigo) return false;
        }

        // 2. Filtro de Categoría
        if (filterCategory !== 'ALL' && p.categoria_id !== filterCategory) {
          return false;
        }

        // 3. Filtro de Estado
        if (filterStatus === 'active' && !p.activo) return false;
        if (filterStatus === 'inactive' && p.activo) return false;

        // 4. Filtro de Stock
        const isLow = p.stock_actual <= 5;
        if (filterStock === 'low' && !isLow) return false;
        if (filterStock === 'normal' && isLow) return false;

        return true;
      })
      .sort((a, b) => {
        let fieldA: any = '';
        let fieldB: any = '';

        if (sortBy === 'codigo') {
          fieldA = a.codigo_barras;
          fieldB = b.codigo_barras;
        } else if (sortBy === 'nombre') {
          fieldA = a.nombre.toLowerCase();
          fieldB = b.nombre.toLowerCase();
        } else if (sortBy === 'precio_venta') {
          fieldA = a.precio_venta;
          fieldB = b.precio_venta;
        } else if (sortBy === 'precio_costo') {
          fieldA = a.precio_costo;
          fieldB = b.precio_costo;
        } else if (sortBy === 'stock_actual') {
          fieldA = a.stock_actual;
          fieldB = b.stock_actual;
        }

        if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [productos, searchTerm, filterCategory, filterStatus, filterStock, sortBy, sortOrder]);

  // Reiniciar a la primera página cuando cambian los filtros o el ordenamiento
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus, filterStock, sortBy, sortOrder, itemsPerPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const productosPaginados = productosFiltrados.slice(startIndex, endIndex);

  const historialStartIndex = (historialPage - 1) * historialItemsPerPage;
  const historialEndIndex = historialStartIndex + historialItemsPerPage;
  const ordenesPaginadas = ordenes.slice(historialStartIndex, historialEndIndex);

  const exportarCSV = async () => {
    const listado = productosFiltrados;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay productos en inventario para exportar.',
        type: 'warning'
      });
      return;
    }

    const headers = ['Codigo', 'Producto', 'Descripcion', 'Precio Costo', 'Precio Venta', 'Stock', 'Val. Costo Total', 'Val. Venta Total'];
    let totalStock = 0;
    let totalValCosto = 0;
    let totalValVenta = 0;

    const rows = listado.map(p => {
      const valCosto = p.precio_costo * p.stock_actual;
      const valVenta = p.precio_venta * p.stock_actual;
      totalStock += p.stock_actual;
      totalValCosto += valCosto;
      totalValVenta += valVenta;

      return [
        p.codigo_barras,
        p.nombre,
        p.descripcion || '-',
        p.precio_costo.toFixed(2),
        p.precio_venta.toFixed(2),
        p.stock_actual,
        valCosto.toFixed(2),
        valVenta.toFixed(2)
      ];
    });

    // Añadir fila de totales
    rows.push([
      'TOTALES',
      `${listado.length} productos`,
      '',
      '',
      '',
      totalStock.toString(),
      totalValCosto.toFixed(2),
      totalValVenta.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Inventario_Stock_Totales_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarXLSX = async () => {
    const listado = productosFiltrados;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay productos en inventario para exportar.',
        type: 'warning'
      });
      return;
    }

    let totalStock = 0;
    let totalValCosto = 0;
    let totalValVenta = 0;

    const rows = listado.map(p => {
      const valCosto = p.precio_costo * p.stock_actual;
      const valVenta = p.precio_venta * p.stock_actual;
      totalStock += p.stock_actual;
      totalValCosto += valCosto;
      totalValVenta += valVenta;

      return {
        'Código': p.codigo_barras,
        'Producto': p.nombre,
        'Descripción': p.descripcion || '-',
        'Precio Costo': p.precio_costo,
        'Precio Venta': p.precio_venta,
        'Stock': p.stock_actual,
        'Val. Costo Total': valCosto,
        'Val. Venta Total': valVenta
      };
    });

    // Fila de totales
    rows.push({
      'Código': 'TOTALES',
      'Producto': `${listado.length} productos`,
      'Descripción': '',
      'Precio Costo': 0,
      'Precio Venta': 0,
      'Stock': totalStock,
      'Val. Costo Total': Number(totalValCosto.toFixed(2)),
      'Val. Venta Total': Number(totalValVenta.toFixed(2))
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario_Stock');
    XLSX.writeFile(workbook, `Inventario_Stock_Totales_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportarPDF = async () => {
    const listado = productosFiltrados;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay productos en inventario para exportar.',
        type: 'warning'
      });
      return;
    }

    const esGuardia = rol === 'guardia';

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFontSize(16);
    doc.text(esGuardia ? 'Reporte de Stock' : 'Reporte de Stock e Inventario Valorado', 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 14, 21);
    doc.text(`Filtros: Busqueda: "${searchTerm || 'Todas'}" | Categoria: ${filterCategory === 'ALL' ? 'Todas' : categorias.find(c => c.id === filterCategory)?.nombre || 'Todas'}`, 14, 26);

    const headers = esGuardia
      ? [['Código', 'Producto', 'Descripción', 'Stock']]
      : [['Código', 'Producto', 'Descripción', 'P. Costo', 'P. Venta', 'Stock', 'Val. Costo', 'Val. Venta']];
    let totalStock = 0;
    let totalValCosto = 0;
    let totalValVenta = 0;

    const rows = listado.map(p => {
      const valCosto = p.precio_costo * p.stock_actual;
      const valVenta = p.precio_venta * p.stock_actual;
      totalStock += p.stock_actual;
      totalValCosto += valCosto;
      totalValVenta += valVenta;

      if (esGuardia) {
        return [
          p.codigo_barras,
          p.nombre,
          p.descripcion || '-',
          p.stock_actual.toString()
        ];
      }

      return [
        p.codigo_barras,
        p.nombre,
        p.descripcion || '-',
        `$${p.precio_costo.toFixed(2)}`,
        `$${p.precio_venta.toFixed(2)}`,
        p.stock_actual.toString(),
        `$${valCosto.toFixed(2)}`,
        `$${valVenta.toFixed(2)}`
      ];
    });

    // Fila de totales
    rows.push(esGuardia
      ? ['TOTALES', `${listado.length} productos`, '', totalStock.toString()]
      : [
          'TOTALES',
          `${listado.length} productos`,
          '',
          '',
          '',
          totalStock.toString(),
          `$${totalValCosto.toFixed(2)}`,
          `$${totalValVenta.toFixed(2)}`
        ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 31,
      theme: 'striped',
      headStyles: { fillColor: [31, 41, 55] }, // Gray-800
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      didParseCell: (data) => {
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [243, 244, 246]; // Gray-100
        }
      }
    });

    doc.save(`Inventario_Stock_Totales_${new Date().toISOString().slice(0, 10)}.pdf`);
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
          {rol !== 'guardia' ? (
            <>
              <BotonDescargar
                onExportCSV={exportarCSV}
                onExportXLSX={exportarXLSX}
                onExportPDF={exportarPDF}
              />
              <button
                type="button"
                onClick={() => setIsImportExportOpen(true)}
                className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-750 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Importar / Exportar
              </button>
              <button
                onClick={handleCreateProductClick}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Crear Nuevo Producto
              </button>
              <Link
                to="/requerimientos"
                className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold shadow-sm transition inline-flex items-center"
              >
                Generar Orden de Compra
              </Link>
            </>
          ) : (
            <button
              onClick={exportarPDF}
              className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <BsFileEarmarkPdfFill /> Descargar PDF
            </button>
          )}
        </div>
      </div>

      {mensaje && (
        <div className="p-4 bg-gray-50 border border-gray-200 text-gray-800 rounded-lg text-sm font-medium">
          {mensaje}
        </div>
      )}

      {/* Selector de Subsecciones (Tabs) */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setModuloActivo('inventario')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
            moduloActivo === 'inventario'
              ? 'border-gray-800 text-gray-800'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Catálogo Físico en Bodega
        </button>
        <button
          onClick={() => setModuloActivo('historial')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
            moduloActivo === 'historial'
              ? 'border-gray-800 text-gray-800'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Historial de Órdenes de Reabastecimiento
        </button>
      </div>

      {/* SUBMODULO 1: INVENTARIO */}
      {moduloActivo === 'inventario' && (
      <>
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

        <SearchAndFilterBar
          searchPlaceholder="Buscar por nombre, código..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          totalResults={productosFiltrados.length}
          totalCount={productos.length}
          resultsLabel="productos"
          selectFilters={[
            {
              id: 'categoria',
              placeholder: 'Todas las Categorías',
              value: filterCategory,
              onChange: (val) => setFilterCategory(val === 'ALL' ? 'ALL' : Number(val)),
              options: categorias.map((cat) => ({ label: cat.nombre, value: cat.id }))
            },
            {
              id: 'estado',
              placeholder: 'Todos los Estados',
              value: filterStatus,
              onChange: (val) => setFilterStatus(val as any),
              options: [
                { label: 'Activo', value: 'active' },
                { label: 'Inactivo', value: 'inactive' }
              ]
            },
            {
              id: 'stock',
              placeholder: 'Todo el Inventario',
              value: filterStock,
              onChange: (val) => setFilterStock(val as any),
              options: [
                { label: 'Bajo Stock (≤ 5)', value: 'low' },
                { label: 'Stock Normal (> 5)', value: 'normal' }
              ]
            }
          ]}
          sortOptions={[
            { label: 'Ordenar por: Nombre', value: 'nombre' },
            { label: 'Ordenar por: Código', value: 'codigo' },
            { label: 'Ordenar por: Precio Venta', value: 'precio_venta' },
            { label: 'Ordenar por: Precio Compra', value: 'precio_costo' },
            { label: 'Ordenar por: Existencia', value: 'stock_actual' }
          ]}
          sortValue={sortBy}
          onSortValueChange={(val) => setSortBy(val as any)}
          sortOrder={sortOrder}
          onSortOrderChange={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
        />

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
                {productosPaginados.map((p) => {
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
                                  className="text-xs text-gray-400 hover:text-gray-650 flex items-center justify-center p-1"
                                >
                                  <BsX className="text-base" />
                                </button>
                            </div>
                          ) : (
                            <>
                              {rol !== 'guardia' ? (
                                <>
                                  <BotonAccion
                                    tipo="editar_detalle"
                                    onClick={() => handleEditProductClick(p)}
                                  />
                                  <BotonAccion
                                    tipo={p.activo ? 'desactivar' : 'activar'}
                                    onClick={() => handleToggleProductStatus(p.id, p.activo)}
                                  />
                                  <BotonAccion
                                    tipo="ajustar_stock"
                                    onClick={() => {
                                      setEditingStockId(p.id);
                                      setNewStockVal(p.stock_actual.toString());
                                    }}
                                  />
                                  {rol === 'admin' && (
                                    <BotonAccion
                                      tipo="eliminar"
                                      onClick={() => handleDeleteProduct(p.id)}
                                    />
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-semibold italic">Solo Lectura</span>
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

          <Paginacion
            currentPage={currentPage}
            totalItems={productosFiltrados.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </div>
      </>
      )}

      {/* SUBMODULO 2: HISTORIAL DE ÓRDENES DE REABASTECIMIENTO */}
      {moduloActivo === 'historial' && (
      <>
      {/* SECCIÓN 3: LISTADO DE ÓRDENES DE COMPRA */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-gray-800">Historial de Órdenes de Reabastecimiento</h2>

        {ordenes.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 border border-dashed border-gray-250 rounded-xl text-gray-400 text-xs">
            No se han emitido órdenes de compra.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ordenesPaginadas.map((oc) => (
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

        <Paginacion
          currentPage={historialPage}
          totalItems={ordenes.length}
          itemsPerPage={historialItemsPerPage}
          onPageChange={setHistorialPage}
          onItemsPerPageChange={setHistorialItemsPerPage}
        />
      </div>
      </>
      )}

      <ModalImportExport
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        title="Productos"
        columns={columnsConfig}
        data={productosMapeadosParaExportar}
        onImport={handleImportProductos}
      />

      <ModalFormulario
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        titulo={editingProduct ? 'Editar Producto' : 'Nuevo Producto en Bodega'}
        campos={camposProducto}
        valoresIniciales={valoresInicialesProducto(editingProduct)}
        onGuardar={handleGuardarProducto}
        botonGuardarLabel={editingProduct ? 'Guardar Cambios' : 'Registrar Producto'}
      />
    </div>
  );
};
