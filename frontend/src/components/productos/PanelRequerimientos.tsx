import React, { useState, useEffect } from 'react';
import { productosAPI } from '../../api/productos.api';
import { ordenesAPI } from '../../api/ordenes.api';
import { adminAPI } from '../../api/admin.api';
import { useAuth } from '../../context/AuthContext';
import { VistaImpresionRequerimiento } from './VistaImpresionRequerimiento';
import { BotonRecargar } from '../common/BotonRecargar';

import { useModal } from '../../context/ModalContext';

export const PanelRequerimientos: React.FC = () => {
  const { user } = useAuth();
  const { showConfirm } = useModal();

  // Datos del sistema
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Formulario cabecera
  const [empresaId, setEmpresaId] = useState<number | ''>('');
  const [sucursalId, setSucursalId] = useState<number | ''>('');
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');
  const [centroCostosId, setCentroCostosId] = useState<number | ''>('');
  const [justificacion, setJustificacion] = useState('');
  const [tipoArticulo, setTipoArticulo] = useState('OTROS');
  const [secuencialPreview, setSecuencialPreview] = useState('Cargando...');
  const [tipoCompra, setTipoCompra] = useState('LOCAL');

  // Formulario de ítem local
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [itemCantidad, setItemCantidad] = useState('1');
  const [itemUnidadMedida, setItemUnidadMedida] = useState('UNIDAD');
  const [itemNegociacion, setItemNegociacion] = useState('NO');
  const [itemFormaPago, setItemFormaPago] = useState('CONTADO');
  const [itemPlazoPago, setItemPlazoPago] = useState('INMEDIATO');
  const [itemTiempoEntrega, setItemTiempoEntrega] = useState('INMEDIATO');
  const [itemComentario, setItemComentario] = useState('');
  const [itemPrecioUnitario, setItemPrecioUnitario] = useState('0.00');
  const [itemProveedorId, setItemProveedorId] = useState<number | ''>('');
  const [itemDescripcion, setItemDescripcion] = useState('');
  const [itemFoto, setItemFoto] = useState('');

  // Artículos agregados localmente
  const [detallesLocales, setDetallesLocales] = useState<any[]>([]);

  // Campos adicionales generales
  const [lugarRecepcion, setLugarRecepcion] = useState('OTROS');
  const [requiereContrato, setRequiereContrato] = useState(false);
  const [requiereSeguro, setRequiereSeguro] = useState(false);
  const [requiereMantenimiento, setRequiereMantenimiento] = useState(false);
  const [asignadoTrabajador, setAsignadoTrabajador] = useState(false);
  const [trabajadorAsignado, setTrabajadorAsignado] = useState('');
  const [caracteristicas, setCaracteristicas] = useState('');

  // Responsables
  const [elaboradoPor, setElaboradoPor] = useState('');
  const [aprobadoPor, setAprobadoPor] = useState('Gerente Financiera: Dominique Veloz');
  const [recibidoPor, setRecibidoPor] = useState('Compras: Mishell Paucar');

  // Estado para visualización / impresión
  const [selectedOrdenForPrint, setSelectedOrdenForPrint] = useState<any | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Calcular el código secuencial de previsualización
  useEffect(() => {
    if (departamentoId && empresaId) {
      obtenerSecuencialEstimado(departamentoId, empresaId);
    } else {
      setSecuencialPreview('[Selecciona Empresa y Departamento]');
    }
  }, [departamentoId, empresaId]);

  // Actualizar elaboradoPor cuando carguen los datos del usuario
  useEffect(() => {
    if (user) {
      const deptoLabel = user.empleado?.departamento || 'TIC';
      setElaboradoPor(`${deptoLabel}: ${user.nombre}`);
    }
  }, [user]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [empRes, sucRes, depRes, ccRes, prodRes, provRes, ordRes] = await Promise.all([
        adminAPI.read('empresa'),
        adminAPI.read('sucursal'),
        adminAPI.read('departamento'),
        adminAPI.read('centro_costos'),
        productosAPI.getAll(),
        productosAPI.getProveedores(),
        ordenesAPI.getAll()
      ]);

      // Filtrar y establecer empresas (ej: ST INNOVA y ST DRIVE)
      const empData = empRes.data || [];
      setEmpresas(empData);
      if (empData.length > 0) setEmpresaId(empData[0].empresa_id);

      const sucData = sucRes.data || [];
      setSucursales(sucData);
      if (sucData.length > 0) setSucursalId(sucData[0].sucursal_id);

      const depData = depRes.data || [];
      setDepartamentos(depData);
      if (depData.length > 0) setDepartamentoId(depData[0].departamento_id);

      const ccData = ccRes.data || [];
      setCentrosCosto(ccData);
      if (ccData.length > 0) setCentroCostosId(ccData[0].centro_costos_id);

      setProductos(prodRes.data || []);
      setProveedores(provRes.data || []);
      setOrdenes(ordRes.data || []);
    } catch (err) {
      console.error('Error cargando datos para requerimientos:', err);
      setError('Error al conectar con la base de datos para cargar catálogos.');
    } finally {
      setLoading(false);
    }
  };

  const obtenerSecuencialEstimado = async (depId: number, empId: number) => {
    try {
      const res = await ordenesAPI.getSiguienteSecuencial(depId, empId);
      if (res.success && res.data) {
        setSecuencialPreview(res.data.codigo);
      }
    } catch (err) {
      setSecuencialPreview('Error de secuencial');
    }
  };

  // Al seleccionar un producto, auto-llenar los campos del formulario de ítem
  const handleProductSelect = async (prodId: number) => {
    setSelectedProductId(prodId);
    if (!prodId) return;

    try {
      const prodRes = await productosAPI.getById(prodId);
      const prod = prodRes.data;
      if (prod) {
        setItemPrecioUnitario(Number(prod.producto_precio_compra || prod.producto_precio || 0).toFixed(2));
        setItemProveedorId(prod.proveedor_id || '');
        setItemDescripcion(prod.producto_nombre || '');
        setItemFoto(prod.producto_foto || '');
      }
    } catch (err) {
      console.error('Error cargando detalle de producto:', err);
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId && !itemDescripcion) {
      setError('Por favor selecciona un producto o ingresa una descripción del servicio.');
      return;
    }

    const qty = parseInt(itemCantidad);
    const price = parseFloat(itemPrecioUnitario);
    if (isNaN(qty) || qty <= 0) {
      setError('La cantidad debe ser un número entero mayor a 0.');
      return;
    }

    const subtotal = qty * price;

    const matchedProduct = productos.find(p => p.id === selectedProductId);
    const prodName = matchedProduct ? matchedProduct.nombre : itemDescripcion;
    const finalFoto = matchedProduct ? matchedProduct.foto : itemFoto;

    const nuevoItem = {
      producto_id: selectedProductId || null,
      descripcion: prodName,
      cantidad: qty,
      unidad_medida: itemUnidadMedida,
      negociacion_previa: itemNegociacion,
      forma_pago: itemFormaPago,
      plazo_pago: itemPlazoPago,
      tiempo_entrega: itemTiempoEntrega,
      comentario: itemComentario,
      precio_unitario: price,
      subtotal,
      foto: finalFoto || null,
      proveedor_id: itemProveedorId || null
    };

    setDetallesLocales([...detallesLocales, nuevoItem]);

    // Limpiar formulario de ítem
    setSelectedProductId('');
    setItemCantidad('1');
    setItemNegociacion('NO');
    setItemComentario('');
    setItemPrecioUnitario('0.00');
    setItemProveedorId('');
    setItemDescripcion('');
    setItemFoto('');
    setError('');
  };

  const handleRemoveLocalItem = (index: number) => {
    setDetallesLocales(detallesLocales.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (detallesLocales.length === 0) {
      setError('Debes agregar al menos un artículo o servicio al requerimiento.');
      return;
    }

    if (!justificacion.trim()) {
      setError('La justificación de la necesidad es un campo requerido.');
      return;
    }

    try {
      setSubmitLoading(true);

      const payload = {
        empresa_id: Number(empresaId),
        sucursal_id: Number(sucursalId),
        departamento_id: Number(departamentoId),
        centro_costos_id: Number(centroCostosId),
        proveedor_id: detallesLocales[0]?.proveedor_id || null, // Hereda el proveedor del primer ítem
        justificacion,
        tipo_articulo: tipoArticulo,
        negociacion_previa: detallesLocales[0]?.negociacion_previa || 'NO',
        forma_pago: detallesLocales[0]?.forma_pago || 'CONTADO',
        plazo_pago: detallesLocales[0]?.plazo_pago || 'INMEDIATO',
        tiempo_entrega: detallesLocales[0]?.tiempo_entrega || 'INMEDIATO',
        lugar_recepcion: lugarRecepcion,
        requiere_contrato: requiereContrato,
        requiere_seguro: requiereSeguro,
        requiere_mantenimiento: requiereMantenimiento,
        asignado_trabajador: asignadoTrabajador,
        trabajador_asignado: asignadoTrabajador ? trabajadorAsignado : null,
        caracteristicas,
        elaborado_por: elaboradoPor,
        aprobado_por: aprobadoPor,
        recibido_por: recibidoPor,
        detalles: detallesLocales,
        tipo_compra: tipoCompra
      };

      const res = await ordenesAPI.crear(payload);
      if (res.success) {
        setSuccess(`¡Requerimiento creado exitosamente con el código: ${res.data.codigo}!`);
        setJustificacion('');
        setDetallesLocales([]);
        setCaracteristicas('');
        setAsignadoTrabajador(false);
        setTrabajadorAsignado('');
        setTipoCompra('LOCAL');
        
        // Recargar el historial
        const ordRes = await ordenesAPI.getAll();
        setOrdenes(ordRes.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el requerimiento en el servidor.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEliminarOrden = async (ordenId: number) => {
    const confirmed = await showConfirm({
      title: 'Confirmar Eliminación',
      message: '¿Estás seguro de que deseas eliminar esta orden de reabastecimiento? Esta acción es irreversible.',
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');
      const res = await ordenesAPI.eliminar(ordenId);
      if (res.success) {
        setSuccess('Orden de reabastecimiento eliminada con éxito.');
        setOrdenes(prev => prev.filter(o => o.id !== ordenId));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al intentar eliminar la orden.');
    }
  };

  const handleOpenPrintPreview = async (ordenId: number) => {
    try {
      const res = await ordenesAPI.getById(ordenId);
      if (res.success) {
        setSelectedOrdenForPrint(res.data);
      }
    } catch (err) {
      console.error('Error recuperando detalle para impresión:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        <p className="text-sm text-gray-500 font-medium">Cargando módulo de requerimientos...</p>
      </div>
    );
  }

  return (
    <div className="font-sans space-y-8 max-w-6xl mx-auto">
      
      {/* CABECERA */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Requerimiento de Bienes y/o Servicios</h1>
          <p className="text-sm text-gray-500 mt-1">Generación de órdenes de compra con formato corporativo e impresión de documentos</p>
        </div>
        <BotonRecargar onRefresh={cargarDatos} loading={loading} />
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-xl text-sm font-medium animate-fade-in shadow-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium animate-fade-in shadow-sm">
          {error}
        </div>
      )}

      {/* FORMULARIO DE REQUERIMIENTO */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* SECCIÓN A: METADATOS Y CABECERA */}
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            Datos Generales del Requerimiento
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Empresa */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Empresa Solicitante</label>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-gray-800 focus:outline-none"
                required
              >
                <option value="">Seleccionar empresa...</option>
                {empresas.map(emp => (
                  <option key={emp.empresa_id} value={emp.empresa_id}>{emp.empresa_nombre_comercial}</option>
                ))}
              </select>
            </div>

            {/* Sucursal */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sucursal</label>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-gray-800 focus:outline-none"
                required
              >
                <option value="">Seleccionar sucursal...</option>
                {sucursales.map(suc => (
                  <option key={suc.sucursal_id} value={suc.sucursal_id}>{suc.sucursal_nombre}</option>
                ))}
              </select>
            </div>

            {/* Departamento */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Departamento</label>
              <select
                value={departamentoId}
                onChange={(e) => setDepartamentoId(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-gray-800 focus:outline-none"
                required
              >
                <option value="">Seleccionar departamento...</option>
                {departamentos.map(dept => (
                  <option key={dept.departamento_id} value={dept.departamento_id}>{dept.departamento_nombre} ({dept.departamento_codigo})</option>
                ))}
              </select>
            </div>

            {/* Centro de Costos */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Centro de Costos</label>
              <select
                value={centroCostosId}
                onChange={(e) => setCentroCostosId(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-gray-800 focus:outline-none"
                required
              >
                <option value="">Seleccionar centro de costos...</option>
                {centrosCosto.map(cc => (
                  <option key={cc.centro_costos_id} value={cc.centro_costos_id}>{cc.centro_costos_codigo} - {cc.centro_costos_nombre}</option>
                ))}
              </select>
            </div>

            {/* Persona que Solicita (Pre-llenado) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Persona que solicita</label>
              <input
                type="text"
                value={user?.nombre || ''}
                readOnly
                className="w-full px-3.5 py-2 border border-gray-250 bg-gray-50 text-gray-550 rounded-xl text-sm focus:outline-none"
              />
            </div>

            {/* Secuencial Preview */}
            <div>
              <label className="block text-xs font-semibold text-amber-600 mb-1">Vista previa del secuencial</label>
              <div className="w-full px-3.5 py-2 border border-amber-250 bg-amber-50/50 text-amber-800 font-mono font-bold rounded-xl text-sm">
                {secuencialPreview}
              </div>
            </div>

            {/* Tipo de Compra */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Compra</label>
              <select
                value={tipoCompra}
                onChange={(e) => setTipoCompra(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-gray-800 focus:outline-none"
                required
              >
                <option value="LOCAL">LOCAL</option>
                <option value="INTERNACIONAL">INTERNACIONAL</option>
              </select>
            </div>

          </div>

          {/* Justificación */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Justificación del Requerimiento</label>
            <textarea
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Describa el motivo o necesidad de este requerimiento de bienes y/o servicios..."
              rows={2}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-gray-800 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* SECCIÓN B: TIPO DE ARTÍCULO */}
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
            Tipo de Artículo
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Materia Prima', val: 'MATERIA PRIMA' },
              { label: 'Herramienta', val: 'HERRAMIENTA' },
              { label: 'Servicio', val: 'SERVICIO' },
              { label: 'Maquinaria o Equipo', val: 'MAQUINARIA O EQUIPO' },
              { label: 'Suministros / Consumibles', val: 'SUMINISTROS/ CONSUMIBLES' },
              { label: 'Otros', val: 'OTROS' }
            ].map(tipo => (
              <label
                key={tipo.val}
                className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer text-xs font-semibold select-none transition ${
                  tipoArticulo === tipo.val
                    ? 'border-gray-800 bg-gray-50 text-gray-850'
                    : 'border-gray-200 hover:bg-gray-50/50 text-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="tipoArticulo"
                  value={tipo.val}
                  checked={tipoArticulo === tipo.val}
                  onChange={(e) => setTipoArticulo(e.target.value)}
                  className="h-3.5 w-3.5 text-gray-800 focus:ring-gray-850"
                />
                <span>{tipo.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* SECCIÓN C: AÑADIR ARTÍCULOS O SERVICIOS (Formulario local) */}
        <div className="border-b border-gray-100 pb-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
            Agregar Productos o Servicios al Detalle
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 border border-gray-200 rounded-2xl">
            
            {/* Seleccionar Producto */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Producto (Almacén)</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
              >
                <option value="">-- Servicio o Artículo Personalizado --</option>
                {productos.filter(p => p.activo).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock_actual})</option>
                ))}
              </select>
            </div>

            {/* Descripción (si es servicio o para editar) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción / Nombre del Servicio</label>
              <input
                type="text"
                value={itemDescripcion}
                onChange={(e) => setItemDescripcion(e.target.value)}
                placeholder="Ej. ESIM PLAN DE DATOS"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white"
              />
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cantidad</label>
              <input
                type="number"
                value={itemCantidad}
                onChange={(e) => setItemCantidad(e.target.value)}
                min="1"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white"
              />
            </div>

            {/* Unidad de Medida */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Unidad de Medida</label>
              <select
                value={itemUnidadMedida}
                onChange={(e) => setItemUnidadMedida(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
              >
                <option value="UNIDAD">UNIDAD</option>
                <option value="DOCENA">DOCENA</option>
                <option value="CAJA">CAJA</option>
                <option value="PAQUETE">PAQUETE</option>
                <option value="KILO">KILO</option>
                <option value="LITRO">LITRO</option>
                <option value="METRO">METRO</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>

            {/* Precio Unitario */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Precio Unitario ($)</label>
              <input
                type="number"
                step="0.01"
                value={itemPrecioUnitario}
                onChange={(e) => setItemPrecioUnitario(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white"
              />
            </div>

            {/* Proveedor Sugerido */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor Sugerido</label>
              <select
                value={itemProveedorId}
                onChange={(e) => setItemProveedorId(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            {/* Negociación Previa */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Negociación Previa</label>
              <select
                value={itemNegociacion}
                onChange={(e) => setItemNegociacion(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700"
              >
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>
            </div>

            {/* Forma de Pago */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Forma de Pago</label>
              <select
                value={itemFormaPago}
                onChange={(e) => setItemFormaPago(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700"
              >
                <option value="CONTADO">CONTADO</option>
                <option value="CREDITO">CRÉDITO</option>
                <option value="DEBITO">DÉBITO</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>

            {/* Plazos de Pago */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Plazo de Pago</label>
              <select
                value={itemPlazoPago}
                onChange={(e) => setItemPlazoPago(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700"
              >
                <option value="INMEDIATO">INMEDIATO</option>
                <option value="TRES MESES">3 MESES</option>
                <option value="SEIS MESES">6 MESES</option>
                <option value="DOCE MESES">12 MESES</option>
              </select>
            </div>

            {/* Tiempo de Entrega */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tiempo de Entrega</label>
              <select
                value={itemTiempoEntrega}
                onChange={(e) => setItemTiempoEntrega(e.target.value)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700"
              >
                <option value="INMEDIATO">INMEDIATO</option>
                <option value="TRES MESES">3 MESES</option>
                <option value="SEIS MESES">6 MESES</option>
                <option value="DOCE MESES">12 MESES</option>
              </select>
            </div>

            {/* Foto URL (opcional) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Foto o Imagen URL (Opcional)</label>
              <input
                type="text"
                value={itemFoto}
                onChange={(e) => setItemFoto(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white"
              />
            </div>

            {/* Comentario */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Comentario del Artículo</label>
              <input
                type="text"
                value={itemComentario}
                onChange={(e) => setItemComentario(e.target.value)}
                placeholder="Ej. REPOSICION DE ESIM PARA GERENCIA..."
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white"
              />
            </div>

            {/* Botón de Agregar */}
            <div className="flex items-end md:col-span-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Añadir al Detalle
              </button>
            </div>

          </div>

          {/* Listado de artículos agregados en local */}
          {detallesLocales.length > 0 && (
            <div className="border border-gray-250 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 font-bold uppercase text-[9px] text-gray-550 text-center">
                    <th className="px-4 py-2 w-[8%]">Cant</th>
                    <th className="px-4 py-2 w-[12%]">Unidad</th>
                    <th className="px-4 py-2 w-[25%] text-left">Descripción</th>
                    <th className="px-4 py-2 w-[10%]">Negociación</th>
                    <th className="px-4 py-2 w-[12%]">Precio Unit</th>
                    <th className="px-4 py-2 w-[13%]">Subtotal</th>
                    <th className="px-4 py-2 w-[10%]">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {detallesLocales.map((item, index) => (
                    <tr key={index} className="border-b border-gray-150 hover:bg-gray-50/50 text-center">
                      <td className="px-4 py-3 font-bold">{item.cantidad}</td>
                      <td className="px-4 py-3 text-gray-500 font-semibold">{item.unidad_medida}</td>
                      <td className="px-4 py-3 text-left">
                        <span className="font-semibold text-gray-800">{item.descripcion}</span>
                        {item.comentario && <span className="text-[10px] text-gray-400 block italic">{item.comentario}</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-600">{item.negociacion_previa}</td>
                      <td className="px-4 py-3 font-mono">${item.precio_unitario.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-800">${item.subtotal.toFixed(2)} + IVA</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveLocalItem(index)}
                          className="px-2.5 py-1 text-[10px] bg-red-50 hover:bg-red-100 text-red-650 rounded-lg font-bold transition"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECCIÓN D: ADICIONALES, LUGAR & OBSERVACIONES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 pb-5">
          
          {/* Lugar de entrega */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Lugar de Entrega
            </h3>
            <div className="flex gap-4">
              {['ALANGASI', 'TAMBILLO', 'OTROS'].map(lugar => (
                <label
                  key={lugar}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl cursor-pointer text-xs font-bold select-none transition ${
                    lugarRecepcion === lugar
                      ? 'border-gray-800 bg-gray-50 text-gray-850'
                      : 'border-gray-200 hover:bg-gray-50/50 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="lugarRecepcion"
                    value={lugar}
                    checked={lugarRecepcion === lugar}
                    onChange={(e) => setLugarRecepcion(e.target.value)}
                    className="h-3.5 w-3.5 text-gray-800 focus:ring-gray-850"
                  />
                  <span>{lugar}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Especificaciones Adicionales / Características</label>
              <textarea
                value={caracteristicas}
                onChange={(e) => setCaracteristicas(e.target.value)}
                placeholder="Ingrese especificaciones de marcas, modelos, garantías, etc."
                rows={3}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Adicionales (Chequeos) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Adicionales del Contrato
            </h3>
            
            <div className="space-y-2 border border-gray-200 p-4 rounded-2xl bg-gray-50/30">
              
              <label className="flex items-center justify-between text-xs font-medium text-gray-700 select-none cursor-pointer">
                <span>¿Requiere realizar contrato?</span>
                <input
                  type="checkbox"
                  checked={requiereContrato}
                  onChange={(e) => setRequiereContrato(e.target.checked)}
                  className="h-4.5 w-4.5 rounded text-gray-800 focus:ring-gray-850 border-gray-300"
                />
              </label>

              <label className="flex items-center justify-between text-xs font-medium text-gray-700 select-none cursor-pointer pt-2 border-t border-gray-100">
                <span>¿Requiere contratación de seguro?</span>
                <input
                  type="checkbox"
                  checked={requiereSeguro}
                  onChange={(e) => setRequiereSeguro(e.target.checked)}
                  className="h-4.5 w-4.5 rounded text-gray-800 focus:ring-gray-850 border-gray-300"
                />
              </label>

              <label className="flex items-center justify-between text-xs font-medium text-gray-700 select-none cursor-pointer pt-2 border-t border-gray-100">
                <span>¿Requiere mantenimiento preventivo?</span>
                <input
                  type="checkbox"
                  checked={requiereMantenimiento}
                  onChange={(e) => setRequiereMantenimiento(e.target.checked)}
                  className="h-4.5 w-4.5 rounded text-gray-800 focus:ring-gray-850 border-gray-300"
                />
              </label>

              <label className="flex items-center justify-between text-xs font-medium text-gray-700 select-none cursor-pointer pt-2 border-t border-gray-100">
                <span>¿Será asignado a algún trabajador?</span>
                <input
                  type="checkbox"
                  checked={asignadoTrabajador}
                  onChange={(e) => setAsignadoTrabajador(e.target.checked)}
                  className="h-4.5 w-4.5 rounded text-gray-800 focus:ring-gray-850 border-gray-300"
                />
              </label>

              {asignadoTrabajador && (
                <div className="pt-2">
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase">Nombre del Colaborador</label>
                  <input
                    type="text"
                    value={trabajadorAsignado}
                    onChange={(e) => setTrabajadorAsignado(e.target.value)}
                    placeholder="Ej. David Quishpe"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    required={asignadoTrabajador}
                  />
                </div>
              )}

            </div>
          </div>
        </div>

        {/* SECCIÓN E: RESPONSABLES / FIRMAS */}
        <div>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">
            Responsables de Firmas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Elaborado por (Solicitante)</label>
              <input
                type="text"
                value={elaboradoPor}
                onChange={(e) => setElaboradoPor(e.target.value)}
                placeholder="Ej. TIC: David Quishpe"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Aprobado por (Gerente Finanzas)</label>
              <input
                type="text"
                value={aprobadoPor}
                onChange={(e) => setAprobadoPor(e.target.value)}
                placeholder="Ej. Gerente Financiera: Dominique Veloz"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Recibido por (Ventas/Compras)</label>
              <input
                type="text"
                value={recibidoPor}
                onChange={(e) => setRecibidoPor(e.target.value)}
                placeholder="Ej. Compras: Mishell Paucar"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm"
                required
              />
            </div>
          </div>
        </div>

        {/* BOTÓN DE ACCIÓN PRINCIPAL */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={submitLoading}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            {submitLoading ? 'Registrando Requerimiento...' : 'Crear Requerimiento de Compra'}
          </button>
        </div>

      </form>

      {/* HISTORIAL DE ÓRDENES */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Historial de Órdenes de Reabastecimiento y Requerimientos</h2>
          <p className="text-xs text-gray-400">Listado de requerimientos emitidos y herramientas de descarga oficial</p>
        </div>

        {ordenes.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl text-gray-400 text-xs font-medium">
            No se han registrado requerimientos u órdenes de compra aún.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                    <th className="px-6 py-4">Secuencial</th>
                    <th className="px-6 py-4">Empresa</th>
                    <th className="px-6 py-4">Departamento</th>
                    <th className="px-6 py-4">Solicitante</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-gray-750">
                  {ordenes.map((oc) => (
                    <tr key={oc.id} className="border-b border-gray-150 hover:bg-gray-50/30">
                      <td className="px-6 py-4 font-mono font-bold text-gray-850">{oc.codigo}</td>
                      <td className="px-6 py-4 font-medium">{oc.empresa_nombre || 'N/A'}</td>
                      <td className="px-6 py-4">{oc.departamento_nombre || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-500">{oc.empleado_nombre || 'Sistema'}</td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(oc.fecha_solicitud).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                          oc.estado === 'aprobada' || oc.estado === 'recibida'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : oc.estado === 'rechazada' || oc.estado === 'cancelada'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {oc.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenPrintPreview(oc.id)}
                          className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[10px] font-bold transition shadow-sm"
                        >
                          Ver / Imprimir PDF
                        </button>
                        {user?.rol.nombre === 'admin' && (
                          <button
                            onClick={() => handleEliminarOrden(oc.id)}
                            title="Eliminar Orden"
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition active:scale-95"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE IMPRESIÓN */}
      {selectedOrdenForPrint && (
        <VistaImpresionRequerimiento
          orden={selectedOrdenForPrint}
          empresas={empresas}
          onClose={() => setSelectedOrdenForPrint(null)}
        />
      )}

    </div>
  );
};
