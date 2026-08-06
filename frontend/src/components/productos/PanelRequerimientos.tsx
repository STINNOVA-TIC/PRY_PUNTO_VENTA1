import React, { useState, useEffect } from 'react';
import { productosAPI } from '../../api/productos.api';
import { ordenesAPI } from '../../api/ordenes.api';
import { adminAPI } from '../../api/admin.api';
import { empleadosAPI } from '../../api/empleados.api';
import { useAuth } from '../../context/AuthContext';
import { VistaImpresionRequerimiento } from './VistaImpresionRequerimiento';
import { BotonRecargar } from '../common/BotonRecargar';
import { useModal } from '../../context/ModalContext';
import { ModalFlujoRequerimiento } from './ModalFlujoRequerimiento';
import { BsTrash, BsDiagram3, BsFileEarmarkPdf, BsPencil } from 'react-icons/bs';
import { Paginacion } from '../common/Paginacion';

export const PanelRequerimientos: React.FC = () => {
  const { user } = useAuth();
  const { showConfirm } = useModal();
  const loggedEmpleadoId = user?.empleado?.id;
  const isEmployeeRole = user?.rol.nombre === 'empleado' || user?.rol.nombre === 'empleado_autorizado' || user?.rol.nombre === 'empleado_autorizado_firmar';

  // Datos del sistema
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [centrosCosto, setCentrosCosto] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);

  // Búsquedas y Tooltips
  const [productSearch, setProductSearch] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [ccSearch, setCcSearch] = useState('');
  const [showFotoTooltip, setShowFotoTooltip] = useState(false);
  const [itemCentrosCostoIds, setItemCentrosCostoIds] = useState<number[]>([]);
  const [moduloActivo, setModuloActivo] = useState<'requerimiento' | 'historial'>('requerimiento');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
  const [itemIncluyeIva, setItemIncluyeIva] = useState(true);
  const [itemProveedorId, setItemProveedorId] = useState<number | ''>('');
  const [itemDescripcion, setItemDescripcion] = useState('');
  const [itemFoto, setItemFoto] = useState('');

  // Artículos agregados localmente
  const [detallesLocales, setDetallesLocales] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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
  const [empleadoAprobadorId, setEmpleadoAprobadorId] = useState<number | ''>('');
  const [empleadoReceptorId, setEmpleadoReceptorId] = useState<number | ''>('');

  // Combobox de Aprobador y Receptor
  const [aprobadorSearch, setAprobadorSearch] = useState('');
  const [receptorSearch, setReceptorSearch] = useState('');
  const [aprobadorDropdownOpen, setAprobadorDropdownOpen] = useState(false);
  const [receptorDropdownOpen, setReceptorDropdownOpen] = useState(false);

  const [selectedOrdenForPrint, setSelectedOrdenForPrint] = useState<any | null>(null);
  const [selectedOrdenForFlow, setSelectedOrdenForFlow] = useState<any | null>(null);

  // Estados para firma digital propia
  const [currentFirma, setCurrentFirma] = useState(user?.empleado?.firma || '');
  const [subiendoFirma, setSubiendoFirma] = useState(false);

  // Estado para edición de requerimiento (solo admin)
  const [editingOrdenId, setEditingOrdenId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.empleado?.firma) {
      setCurrentFirma(user.empleado.firma);
    }
  }, [user]);

  const handleFirmaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && loggedEmpleadoId) {
      const file = e.target.files[0];
      try {
        setSubiendoFirma(true);
        setError('');
        setSuccess('');
        
        // 1. Subir la imagen de la firma
        const res = await adminAPI.uploadPhoto(file, 'firma');
        
        // 2. Asociar firma al empleado
        await empleadosAPI.updateSignature(loggedEmpleadoId, res.url);
        
        // 3. Actualizar estado local
        setCurrentFirma(res.url);
        
        // 4. Actualizar context si existe
        if (user && user.empleado) {
          user.empleado.firma = res.url;
        }
        
        setSuccess('Tu firma digitalizada ha sido actualizada exitosamente.');
      } catch (err: any) {
        console.error('Error al subir firma:', err);
        setError(err.response?.data?.message || err.message || 'Error al subir la firma');
      } finally {
        setSubiendoFirma(false);
      }
    }
  };

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

  // Actualizar elaboradoPor y preseleccionar departamento/centro de costos cuando carguen los datos del usuario
  useEffect(() => {
    if (user && user.empleado) {
      const deptoLabel = user.empleado.departamento || 'TIC';
      const primerNombre = user.empleado.nombre.split(' ')[0] || '';
      const primerApellido = user.empleado.apellido.split(' ')[0] || '';
      setElaboradoPor(`${deptoLabel}: ${primerNombre} ${primerApellido}`);
    }
    if (user && user.empleado && departamentos.length > 0) {
      const userDepto = departamentos.find(
        (d) => d.departamento_nombre.toLowerCase().trim() === user.empleado?.departamento.toLowerCase().trim()
      );
      if (userDepto) {
        setDepartamentoId(userDepto.departamento_id);
      }
    }
    if (user && user.empleado && centrosCosto.length > 0) {
      const userCCStr = user.empleado.centro_costos || '';
      const userCC = centrosCosto.find((cc) => {
        return userCCStr.toLowerCase().includes(cc.centro_costos_nombre.toLowerCase().trim()) ||
               userCCStr.toLowerCase().includes(cc.centro_costos_codigo.toLowerCase().trim()) ||
               cc.centro_costos_nombre.toLowerCase().trim() === userCCStr.toLowerCase().trim();
      });
      if (userCC) {
        setCentroCostosId(userCC.centro_costos_id);
      }
    }
  }, [user, departamentos, centrosCosto]);

  // Forzar moduloActivo a 'historial' para empleados
  useEffect(() => {
    if (isEmployeeRole) {
      setModuloActivo('historial');
    }
  }, [isEmployeeRole]);

  // Pre-seleccionar Dominique Veloz y Mishell Paucar por defecto al cargar colaboradores
  useEffect(() => {
    if (colaboradores.length > 0) {
      const dom = colaboradores.find(c => `${c.nombre} ${c.apellido}`.toLowerCase().includes('dominique veloz'));
      if (dom) {
        setEmpleadoAprobadorId(dom.id);
        const label = `${dom.departamento || 'General'}: ${dom.nombre} ${dom.apellido}`;
        setAprobadoPor(label);
        setAprobadorSearch(label);
      } else {
        const first = colaboradores[0];
        setEmpleadoAprobadorId(first.id);
        const label = `${first.departamento || 'General'}: ${first.nombre} ${first.apellido}`;
        setAprobadoPor(label);
        setAprobadorSearch(label);
      }

      const mish = colaboradores.find(c => `${c.nombre} ${c.apellido}`.toLowerCase().includes('mishell paucar'));
      if (mish) {
        setEmpleadoReceptorId(mish.id);
        const cc = (mish.centro_costos || '').trim() || 'Compras';
        const label = `${cc}: ${mish.nombre} ${mish.apellido}`;
        setRecibidoPor(label);
        setReceptorSearch(label);
      } else {
        const first = colaboradores[0];
        setEmpleadoReceptorId(first.id);
        const cc = (first.centro_costos || '').trim() || 'Compras';
        const label = `${cc}: ${first.nombre} ${first.apellido}`;
        setRecibidoPor(label);
        setReceptorSearch(label);
      }
    }
  }, [colaboradores]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [empRes, sucRes, depRes, ccRes, prodRes, provRes, ordRes, colabRes] = await Promise.all([
        adminAPI.read('empresa'),
        adminAPI.read('sucursal'),
        adminAPI.read('departamento'),
        adminAPI.read('centro_costos'),
        productosAPI.getAll(),
        productosAPI.getProveedores(),
        ordenesAPI.getAll(),
        empleadosAPI.getAll()
      ]);

      // Filtrar y establecer empresas (ej: ST INNOVA y ST DRIVE)
      const empData = (empRes.data || []).filter((emp: any) => emp.empresa_estado === 'activo');
      setEmpresas(empData);
      if (empData.length > 0) setEmpresaId(empData[0].empresa_id);

      const sucData = sucRes.data || [];
      setSucursales(sucData);
      if (sucData.length > 0) setSucursalId(sucData[0].sucursal_id);

      const depData = depRes.data || [];
      setDepartamentos(depData);
      
      let deptoSelectedId: number | '' = departamentoId || '';
      if (!deptoSelectedId && user && user.empleado) {
        const userDepto = depData.find(
          (d: any) => d.departamento_nombre.toLowerCase().trim() === user.empleado?.departamento.toLowerCase().trim()
        );
        if (userDepto) {
          deptoSelectedId = userDepto.departamento_id;
        }
      }
      if (!deptoSelectedId && depData.length > 0) {
        deptoSelectedId = depData[0].departamento_id;
      }
      if (deptoSelectedId) {
        setDepartamentoId(deptoSelectedId);
      }

      const ccData = ccRes.data || [];
      setCentrosCosto(ccData);

      let ccSelectedId: number | '' = centroCostosId || '';
      if (!ccSelectedId && user && user.empleado) {
        const userCCStr = user.empleado.centro_costos || '';
        const userCC = ccData.find((cc: any) => {
          return userCCStr.toLowerCase().includes(cc.centro_costos_nombre.toLowerCase().trim()) ||
                 userCCStr.toLowerCase().includes(cc.centro_costos_codigo.toLowerCase().trim()) ||
                 cc.centro_costos_nombre.toLowerCase().trim() === userCCStr.toLowerCase().trim();
        });
        if (userCC) {
          ccSelectedId = userCC.centro_costos_id;
        }
      }
      if (!ccSelectedId && ccData.length > 0) {
        ccSelectedId = ccData[0].centro_costos_id;
      }
      if (ccSelectedId) {
        setCentroCostosId(ccSelectedId);
      }

      setProductos(prodRes.data || []);
      setProveedores(provRes.data || []);
      setOrdenes(ordRes.data || []);
      setColaboradores(colabRes.data || []);
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

    // Obtener códigos de centros de costo seleccionados para este ítem
    const selectedCCs = centrosCosto.filter(cc => itemCentrosCostoIds.includes(cc.centro_costos_id));
    const ccCodes = selectedCCs.map(cc => cc.centro_costos_codigo).join(', ');
    const ccPrefix = ccCodes ? `[CC: ${ccCodes}] ` : '';
    const finalComment = `${ccPrefix}${itemComentario}`.trim();

    const nuevoItem = {
      producto_id: selectedProductId || null,
      descripcion: prodName,
      cantidad: qty,
      unidad_medida: itemUnidadMedida,
      negociacion_previa: itemNegociacion,
      forma_pago: itemFormaPago,
      plazo_pago: itemPlazoPago,
      tiempo_entrega: itemTiempoEntrega,
      comentario: finalComment,
      precio_unitario: price,
      subtotal,
      incluye_iva: itemIncluyeIva,
      foto: finalFoto || null,
      proveedor_id: itemProveedorId || null
    };

    if (editingIndex !== null) {
      const updated = [...detallesLocales];
      updated[editingIndex] = nuevoItem;
      setDetallesLocales(updated);
      setEditingIndex(null);
    } else {
      setDetallesLocales([...detallesLocales, nuevoItem]);
    }

    // Limpiar formulario de ítem
    setSelectedProductId('');
    setProductSearch('');
    setProductDropdownOpen(false);
    setItemCantidad('1');
    setItemNegociacion('NO');
    setItemComentario('');
    setItemPrecioUnitario('0.00');
    setItemIncluyeIva(true);
    setItemProveedorId('');
    setItemDescripcion('');
    setItemFoto('');
    setItemCentrosCostoIds([]);
    setCcSearch('');
    setError('');
  };

  const handleEditLocalItem = (index: number) => {
    const item = detallesLocales[index];
    if (!item) return;

    setSelectedProductId(item.producto_id || '');
    setProductSearch(
      item.producto_id
        ? `${productos.find(p => p.id === item.producto_id)?.codigo_barras || ''} - ${item.descripcion}`
        : ''
    );
    setItemCantidad(String(item.cantidad || 1));
    setItemUnidadMedida(item.unidad_medida || 'UNIDAD');
    setItemNegociacion(item.negociacion_previa || 'NO');
    setItemFormaPago(item.forma_pago || 'CONTADO');
    setItemPlazoPago(item.plazo_pago || 'INMEDIATO');
    setItemTiempoEntrega(item.tiempo_entrega || 'INMEDIATO');
    setItemComentario(item.comentario || '');
    setItemPrecioUnitario(Number(item.precio_unitario || 0).toFixed(2));
    setItemIncluyeIva(item.incluye_iva !== false);
    setItemProveedorId(item.proveedor_id || '');
    setItemDescripcion(item.producto_id ? '' : item.descripcion || '');
    setItemFoto(item.foto || '');
    setItemCentrosCostoIds([]);
    setCcSearch('');
    setEditingIndex(index);
    setError('');
  };

  const handleRemoveLocalItem = (index: number) => {
    setDetallesLocales(detallesLocales.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setSelectedProductId('');
      setProductSearch('');
      setProductDropdownOpen(false);
      setItemCantidad('1');
      setItemNegociacion('NO');
      setItemComentario('');
      setItemPrecioUnitario('0.00');
      setItemIncluyeIva(true);
      setItemProveedorId('');
      setItemDescripcion('');
      setItemFoto('');
      setItemCentrosCostoIds([]);
      setCcSearch('');
    }
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
        empleado_aprobador_id: empleadoAprobadorId ? Number(empleadoAprobadorId) : null,
        empleado_receptor_id: empleadoReceptorId ? Number(empleadoReceptorId) : null,
        detalles: detallesLocales,
        tipo_compra: tipoCompra
      };

      if (editingOrdenId) {
        await ordenesAPI.update(editingOrdenId, payload);
        setSuccess('¡Requerimiento actualizado exitosamente!');
        setEditingOrdenId(null);
        setJustificacion('');
        setDetallesLocales([]);
        setCaracteristicas('');
        setAsignadoTrabajador(false);
        setTrabajadorAsignado('');
        setTipoCompra('LOCAL');
        
        // Recargar el historial
        const ordRes = await ordenesAPI.getAll();
        setOrdenes(ordRes.data || []);
        setModuloActivo('historial');
      } else {
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
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el requerimiento en el servidor.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = async (ocShort: any) => {
    try {
      setSubmitLoading(true);
      setError('');
      setSuccess('');
      
      const res = await ordenesAPI.getById(ocShort.id);
      if (!res.success || !res.data) {
        throw new Error('No se pudo cargar la información del requerimiento');
      }
      
      const oc = res.data;
      setEditingOrdenId(oc.orden_compra_id);
      
      // Cargar metadatos
      setEmpresaId(oc.empresa_id || '');
      setSucursalId(oc.sucursal_id || '');
      setDepartamentoId(oc.departamento_id || '');
      setCentroCostosId(oc.centro_costos_id || '');
      setJustificacion(oc.orden_compra_justificacion || '');
      setTipoArticulo(oc.orden_compra_tipo_articulo || 'OTROS');
      setTipoCompra(oc.orden_compra_tipo_compra || 'LOCAL');
      setLugarRecepcion(oc.orden_compra_lugar_recepcion || 'OTROS');
      setRequiereContrato(!!oc.orden_compra_requiere_contrato);
      setRequiereSeguro(!!oc.orden_compra_requiere_seguro);
      setRequiereMantenimiento(!!oc.orden_compra_requiere_mantenimiento);
      setAsignadoTrabajador(!!oc.orden_compra_asignado_trabajador);
      setTrabajadorAsignado(oc.orden_compra_trabajador_asignado || '');
      setCaracteristicas(oc.orden_compra_caracteristicas || '');
      setElaboradoPor(oc.orden_compra_elaborado_por || '');
      
      // Firmas y responsables
      setAprobadoPor(oc.orden_compra_aprobado_por || '');
      setAprobadorSearch(oc.orden_compra_aprobado_por || '');
      setEmpleadoAprobadorId(oc.empleado_aprobador_id || '');
      
      setRecibidoPor(oc.orden_compra_recibido_por || '');
      setReceptorSearch(oc.orden_compra_recibido_por || '');
      setEmpleadoReceptorId(oc.empleado_receptor_id || '');
      
      // Cargar detalles
      const parsedDetalles = (oc.detalles || []).map((d: any) => ({
        producto_id: d.producto_id || null,
        proveedor_id: d.proveedor_id || null,
        descripcion: d.orden_compra_detalle_descripcion || d.descripcion || '',
        cantidad: Number(d.orden_compra_detalle_cantidad || d.cantidad || 1),
        unidad_medida: d.orden_compra_detalle_unidad_medida || d.unidad_medida || 'UNIDAD',
        precio_unitario: Number(d.orden_compra_detalle_precio_unitario || d.precio_unitario || 0),
        subtotal: Number(d.orden_compra_detalle_subtotal || d.subtotal || 0),
        foto: d.orden_compra_detalle_foto || d.foto || '',
        negociacion_previa: d.orden_compra_detalle_negociacion_previa || d.negociacion_previa || 'NO',
        incluye_iva: d.orden_compra_detalle_incluye_iva === undefined ? (d.incluye_iva === undefined ? true : !!d.incluye_iva) : !!d.orden_compra_detalle_incluye_iva,
        comentario: d.orden_compra_detalle_comentario || d.comentario || ''
      }));
      
      setDetallesLocales(parsedDetalles);
      setModuloActivo('requerimiento');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al obtener los detalles del requerimiento.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFirmar = async (ordenId: number) => {
    const confirmed = await showConfirm({
      title: 'Firmar Requerimiento',
      message: '¿Estás seguro de que deseas estampar tu firma registrada en este requerimiento?',
      confirmLabel: 'Sí, firmar',
      cancelLabel: 'Cancelar',
      type: 'info'
    });

    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');
      const res = await ordenesAPI.firmar(ordenId);
      if (res.success) {
        setSuccess('Requerimiento firmado exitosamente.');
        // Recargar las órdenes
        const ordRes = await ordenesAPI.getAll();
        setOrdenes(ordRes.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al firmar el requerimiento.');
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

  const handleOpenFlowView = async (ordenId: number) => {
    try {
      const res = await ordenesAPI.getById(ordenId);
      if (res.success) {
        setSelectedOrdenForFlow(res.data);
      }
    } catch (err) {
      console.error('Error recuperando trazabilidad:', err);
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

  const ordenesFiltradas = isEmployeeRole && loggedEmpleadoId
    ? ordenes.filter(oc => 
        oc.empleado_id === loggedEmpleadoId || 
        oc.empleado_aprobador_id === loggedEmpleadoId || 
        oc.empleado_receptor_id === loggedEmpleadoId
      )
    : ordenes;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const ordenesPaginadas = ordenesFiltradas.slice(startIndex, endIndex);

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

      {/* Selector de Subsecciones (Tabs) */}
      {!isEmployeeRole && (
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setModuloActivo('requerimiento')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
              moduloActivo === 'requerimiento'
                ? 'border-gray-800 text-gray-800'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Requerimiento de Bienes y/o Servicios
          </button>
          <button
            onClick={() => setModuloActivo('historial')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
              moduloActivo === 'historial'
                ? 'border-gray-800 text-gray-800'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Historial de Órdenes de Reabastecimiento y Requerimientos
          </button>
        </div>
      )}

      {/* SUBMODULO 1: REQUERIMIENTO */}
      {moduloActivo === 'requerimiento' && (
      <>
      {/* FORMULARIO DE REQUERIMIENTO */}
      {!isEmployeeRole && (
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
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-gray-800 focus:outline-none"
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
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-gray-800 focus:outline-none"
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
              <label className="block text-xs font-semibold text-gray-550 mb-1">Departamento</label>
              <input
                type="text"
                value={departamentos.find(d => d.departamento_id === departamentoId)?.departamento_nombre || 'Seleccionar departamento...'}
                readOnly
                className="w-full px-3.5 py-2 border border-gray-250 bg-gray-50 text-gray-550 rounded-xl text-sm focus:outline-none"
              />
            </div>

            {/* Centro de Costos */}
            <div>
              <label className="block text-xs font-semibold text-gray-550 mb-1">Centro de Costos</label>
              <input
                type="text"
                value={(() => {
                  const cc = centrosCosto.find(cc => cc.centro_costos_id === centroCostosId);
                  return cc ? `${cc.centro_costos_codigo} - ${cc.centro_costos_nombre}` : 'Seleccionar centro de costos...';
                })()}
                readOnly
                className="w-full px-3.5 py-2 border border-gray-250 bg-gray-50 text-gray-550 rounded-xl text-sm focus:outline-none"
              />
            </div>

            {/* Persona que Solicita (Pre-llenado) */}
            <div>
              <label className="block text-xs font-semibold text-gray-550 mb-1">Persona que solicita</label>
              <input
                type="text"
                value={user?.empleado ? `${user.empleado.nombre} ${user.empleado.apellido}` : user?.nombre || ''}
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
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-gray-800 focus:outline-none"
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
            
            {/* Seleccionar Producto (Combobox unificado) */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Producto (Almacén)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar y seleccionar producto..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedProductId('');
                    setProductDropdownOpen(true);
                  }}
                  onFocus={() => setProductDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setProductDropdownOpen(false), 150)}
                  className="w-full px-3.5 pr-8 h-10 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs font-bold"
                  tabIndex={-1}
                >
                  {productDropdownOpen ? '▲' : '▼'}
                </button>
              </div>

              {productDropdownOpen && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {productos
                    .filter(p => {
                      if (!p.activo) return false;
                      const q = productSearch.toLowerCase().trim();
                      if (!q) return true;
                      return p.nombre.toLowerCase().includes(q) || p.codigo_barras.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q);
                    })
                    .map(p => (
                      <button
                        type="button"
                        key={p.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setProductSearch(`${p.codigo_barras} - ${p.nombre}`);
                          handleProductSelect(p.id);
                          setProductDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <span className="font-semibold text-gray-800">{p.codigo_barras} - {p.nombre}</span>
                        <span className="block text-[10px] text-gray-400">{p.descripcion || 'Sin detalle'} (Stock: {p.stock_actual})</span>
                      </button>
                    ))}
                  {productos.filter(p => {
                    if (!p.activo) return false;
                    const q = productSearch.toLowerCase().trim();
                    if (!q) return true;
                    return p.nombre.toLowerCase().includes(q) || p.codigo_barras.toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q);
                  }).length === 0 && (
                    <div className="px-3 py-3 text-xs text-gray-400 italic">
                      Sin resultados. Escribe en "Descripción" para registrar un servicio o artículo personalizado.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Descripción (si es servicio o para editar) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción / Nombre del Servicio</label>
              <input
                type="text"
                value={itemDescripcion}
                onChange={(e) => setItemDescripcion(e.target.value)}
                placeholder="Ej. ESIM PLAN DE DATOS"
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white"
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
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white"
              />
            </div>

            {/* Unidad de Medida */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Unidad de Medida</label>
              <select
                value={itemUnidadMedida}
                onChange={(e) => setItemUnidadMedida(e.target.value)}
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
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
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white"
              />
            </div>

            {/* Incluye IVA */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Incluye IVA</label>
              <div className="h-10 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="itemIncluyeIva"
                  checked={itemIncluyeIva}
                  onChange={(e) => setItemIncluyeIva(e.target.checked)}
                  className="w-4 h-4 accent-gray-800"
                />
                <span className="text-xs font-semibold text-gray-600 select-none">Sí</span>
              </div>
            </div>

            {/* Proveedor Sugerido */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor Sugerido</label>
              <select
                value={itemProveedorId}
                onChange={(e) => setItemProveedorId(Number(e.target.value))}
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
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
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white text-gray-700"
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
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white text-gray-700"
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
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white text-gray-700"
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
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white text-gray-700"
              >
                <option value="INMEDIATO">INMEDIATO</option>
                <option value="TRES MESES">3 MESES</option>
                <option value="SEIS MESES">6 MESES</option>
                <option value="DOCE MESES">12 MESES</option>
              </select>
            </div>

            {/* Foto URL (opcional) */}
            <div className="relative">
              <div className="flex items-center gap-1 mb-1">
                <label className="block text-xs font-semibold text-gray-600">Foto o Imagen URL</label>
                <div
                  className="relative flex items-center"
                  onMouseEnter={() => setShowFotoTooltip(true)}
                  onMouseLeave={() => setShowFotoTooltip(false)}
                >
                  <div className="w-3.5 h-3.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full flex items-center justify-center text-[9px] font-bold shadow-sm cursor-help select-none">
                    !
                  </div>
                  {showFotoTooltip && (
                    <div className="absolute left-0 bottom-full mb-1.5 z-10 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg leading-relaxed pointer-events-none">
                      Este campo es opcional. La imagen o foto se trae directamente del producto cuando fue registrado.
                    </div>
                  )}
                </div>
              </div>
              <input
                type="text"
                value={itemFoto}
                onChange={(e) => setItemFoto(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white"
              />
            </div>

            {/* Selector de Múltiples Centros de Costo para el Ítem */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">Centros de Costo Asignados al Producto (Puede elegir más de uno)</label>
              <input
                type="text"
                placeholder="Buscar centro de costos por código o nombre..."
                value={ccSearch}
                onChange={(e) => setCcSearch(e.target.value)}
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-gray-800 focus:outline-none"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 bg-white p-3 border border-gray-300 rounded-xl max-h-40 overflow-y-auto">
                {centrosCosto
                  .filter(cc => {
                    const q = ccSearch.toLowerCase().trim();
                    if (!q) return true;
                    return cc.centro_costos_codigo.toLowerCase().includes(q) ||
                           cc.centro_costos_nombre.toLowerCase().includes(q);
                  })
                  .map(cc => (
                    <label key={cc.centro_costos_id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-gray-900 select-none px-2 py-1.5 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={itemCentrosCostoIds.includes(cc.centro_costos_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setItemCentrosCostoIds([...itemCentrosCostoIds, cc.centro_costos_id]);
                          } else {
                            setItemCentrosCostoIds(itemCentrosCostoIds.filter(id => id !== cc.centro_costos_id));
                          }
                        }}
                        className="h-3.5 w-3.5 text-gray-800 focus:ring-gray-850 rounded border-gray-300 flex-shrink-0"
                      />
                      <span className="truncate">
                        <span className="font-bold text-gray-800">{cc.centro_costos_codigo}</span>
                        <span className="text-gray-500"> - {cc.centro_costos_nombre}</span>
                      </span>
                    </label>
                  ))}
              </div>
            </div>

            {/* Comentario */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Comentario del Artículo</label>
              <input
                type="text"
                value={itemComentario}
                onChange={(e) => setItemComentario(e.target.value)}
                placeholder="Ej. REPOSICION DE ESIM PARA GERENCIA..."
                className="w-full px-3.5 h-10 border border-gray-300 rounded-xl text-sm bg-white"
              />
            </div>

            {/* Botón de Agregar */}
            <div className="flex items-end md:col-span-2">
              <button
                type="button"
                onClick={handleAddItem}
                className={`w-full h-10 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center ${editingIndex !== null ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}
              >
                {editingIndex !== null ? 'Guardar Cambios' : 'Añadir al Detalle'}
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
                      <td className="px-4 py-3 font-mono">
                        ${item.precio_unitario.toFixed(2)}
                        {item.incluye_iva && <span className="text-gray-400"> + IVA</span>}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-800">
                        ${item.subtotal.toFixed(2)}
                        {item.incluye_iva && <span className="text-gray-400"> + IVA</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditLocalItem(index)}
                            className={`px-2.5 py-1 text-[10px] rounded-lg font-bold transition ${
                              editingIndex === index
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-650'
                            }`}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveLocalItem(index)}
                            className="px-2.5 py-1 text-[10px] bg-red-50 hover:bg-red-100 text-red-650 rounded-lg font-bold transition"
                          >
                            Quitar
                          </button>
                        </div>
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
                className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-gray-50 text-gray-500 font-semibold"
                readOnly
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Aprobado por (Gerente Finanzas)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar aprobador..."
                  value={aprobadorSearch}
                  onChange={(e) => {
                    setAprobadorSearch(e.target.value);
                    setEmpleadoAprobadorId('');
                    setAprobadoPor('');
                    setAprobadorDropdownOpen(true);
                  }}
                  onFocus={() => setAprobadorDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setAprobadorDropdownOpen(false), 150)}
                  className="w-full px-3.5 pr-8 h-10 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAprobadorDropdownOpen(!aprobadorDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs font-bold"
                  tabIndex={-1}
                >
                  {aprobadorDropdownOpen ? '▲' : '▼'}
                </button>
              </div>

              {aprobadorDropdownOpen && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {colaboradores
                    .filter(c => {
                      const q = aprobadorSearch.toLowerCase().trim();
                      if (!q) return true;
                      const label = `${c.departamento || 'General'} ${c.nombre} ${c.apellido}`.toLowerCase();
                      return label.includes(q);
                    })
                    .map(c => {
                      const label = `${c.departamento || 'General'}: ${c.nombre} ${c.apellido}`;
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setEmpleadoAprobadorId(c.id);
                            setAprobadoPor(label);
                            setAprobadorSearch(label);
                            setAprobadorDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-semibold text-gray-800">{label}</span>
                          <span className="block text-[10px] text-gray-400">Cédula: {c.codigo_empleado || c.cedula || 'N/A'}</span>
                        </button>
                      );
                    })}
                  {colaboradores.filter(c => {
                    const q = aprobadorSearch.toLowerCase().trim();
                    if (!q) return true;
                    const label = `${c.departamento || 'General'} ${c.nombre} ${c.apellido}`.toLowerCase();
                    return label.includes(q);
                  }).length === 0 && (
                    <div className="px-3 py-3 text-xs text-gray-400 italic">
                      Sin resultados.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Recibido por (Ventas/Compras)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar receptor..."
                  value={receptorSearch}
                  onChange={(e) => {
                    setReceptorSearch(e.target.value);
                    setEmpleadoReceptorId('');
                    setRecibidoPor('');
                    setReceptorDropdownOpen(true);
                  }}
                  onFocus={() => setReceptorDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setReceptorDropdownOpen(false), 150)}
                  className="w-full px-3.5 pr-8 h-10 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setReceptorDropdownOpen(!receptorDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs font-bold"
                  tabIndex={-1}
                >
                  {receptorDropdownOpen ? '▲' : '▼'}
                </button>
              </div>

              {receptorDropdownOpen && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {colaboradores
                    .filter(c => {
                      const q = receptorSearch.toLowerCase().trim();
                      if (!q) return true;
                      const cc = (c.centro_costos || '').trim() || 'Compras';
                      const label = `${cc} ${c.nombre} ${c.apellido}`.toLowerCase();
                      return label.includes(q);
                    })
                    .map(c => {
                      const cc = (c.centro_costos || '').trim() || 'Compras';
                      const label = `${cc}: ${c.nombre} ${c.apellido}`;
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setEmpleadoReceptorId(c.id);
                            setRecibidoPor(label);
                            setReceptorSearch(label);
                            setReceptorDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-semibold text-gray-800">{label}</span>
                          <span className="block text-[10px] text-gray-400">Cédula: {c.codigo_empleado || c.cedula || 'N/A'}</span>
                        </button>
                      );
                    })}
                  {colaboradores.filter(c => {
                    const q = receptorSearch.toLowerCase().trim();
                    if (!q) return true;
                    const cc = (c.centro_costos || '').trim() || 'Compras';
                    const label = `${cc} ${c.nombre} ${c.apellido}`.toLowerCase();
                    return label.includes(q);
                  }).length === 0 && (
                    <div className="px-3 py-3 text-xs text-gray-400 italic">
                      Sin resultados.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTÓN DE ACCIÓN PRINCIPAL */}
        <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-100">
          {editingOrdenId && (
            <button
              type="button"
              onClick={() => {
                setEditingOrdenId(null);
                setJustificacion('');
                setDetallesLocales([]);
                setCaracteristicas('');
                setAsignadoTrabajador(false);
                setTrabajadorAsignado('');
                setTipoCompra('LOCAL');
                setModuloActivo('historial');
              }}
              className="px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
            >
              Cancelar Edición
            </button>
          )}
          <button
            type="submit"
            disabled={submitLoading}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 active:scale-95"
          >
            {submitLoading 
              ? (editingOrdenId ? 'Guardando Cambios...' : 'Registrando Requerimiento...') 
              : (editingOrdenId ? 'Guardar Cambios del Requerimiento' : 'Crear Requerimiento de Compra')
            }
          </button>
        </div>

      </form>
      )}
      </>
      )}

      {/* SUBMODULO 2: HISTORIAL */}
      {moduloActivo === 'historial' && (
      <>
      {/* HISTORIAL DE ÓRDENES */}
      <div className="space-y-4">
        {/* MI FIRMA DIGITALIZADA */}
        {loggedEmpleadoId && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden relative group">
              {currentFirma ? (
                <img 
                  src={currentFirma} 
                  alt="Mi Firma" 
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <span className="text-2xl text-gray-400">🖋️</span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Mi Firma Digitalizada</h3>
              <p className="text-xs text-gray-400 max-w-lg">
                Esta firma se estampará automáticamente en los requerimientos que elabores, apruebes o recibas. Sube una imagen PNG con fondo transparente de tu firma física.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              id="upload-firma-input" 
              accept="image/png,image/jpeg" 
              className="hidden" 
              onChange={handleFirmaUpload}
            />
            <button
              onClick={() => document.getElementById('upload-firma-input')?.click()}
              disabled={subiendoFirma}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              {subiendoFirma ? 'Subiendo...' : currentFirma ? 'Actualizar Firma' : 'Subir mi Firma'}
            </button>
          </div>
        </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-gray-800">Historial de Órdenes de Reabastecimiento y Requerimientos</h2>
          <p className="text-xs text-gray-400">Listado de requerimientos emitidos y herramientas de descarga oficial</p>
        </div>

        {ordenesFiltradas.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl text-gray-400 text-xs font-medium">
            No se han registrado requerimientos u órdenes de compra aún.
          </div>
        ) : (
          <>
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
                  {ordenesPaginadas.map((oc) => (
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
                        {loggedEmpleadoId && (
                          (oc.empleado_aprobador_id === loggedEmpleadoId && oc.estado === 'pendiente' && !oc.firma_aprobador) ||
                          (oc.empleado_receptor_id === loggedEmpleadoId && oc.estado === 'aprobada' && !oc.firma_recibido)
                        ) && (
                          <button
                            onClick={() => handleFirmar(oc.id)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition shadow-sm"
                          >
                            Firmar
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenPrintPreview(oc.id)}
                          className="px-2.5 py-1 bg-white hover:bg-gray-55 border border-gray-300 text-gray-700 rounded-lg font-bold text-[10px] shadow-sm transition flex items-center gap-1"
                          title="Descargar PDF"
                        >
                          <BsFileEarmarkPdf className="shrink-0" /> PDF
                        </button>
                        <button
                          onClick={() => handleOpenFlowView(oc.id)}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-[10px] font-bold transition shadow-sm flex items-center gap-1"
                          title="Ver Trazabilidad de Firmas"
                        >
                          <BsDiagram3 className="h-3 w-3" />
                          Flujo
                        </button>
                        {user?.rol.nombre === 'admin' && (
                          <>
                          <button
                            onClick={() => handleEdit(oc)}
                            title="Editar Requerimiento"
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg border border-amber-200 transition active:scale-95 flex items-center justify-center"
                          >
                            <BsPencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEliminarOrden(oc.id)}
                            title="Eliminar Orden"
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg border border-red-250 transition active:scale-95 flex items-center justify-center"
                          >
                            <BsTrash className="h-4 w-4" />
                          </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Paginacion
            currentPage={currentPage}
            totalItems={ordenesFiltradas.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
          </>
        )}
      </div>
      </>
      )}

      {/* MODAL DE IMPRESIÓN */}
      {selectedOrdenForPrint && (
        <VistaImpresionRequerimiento
          orden={selectedOrdenForPrint}
          empresas={empresas}
          onClose={() => setSelectedOrdenForPrint(null)}
        />
      )}
      {/* MODAL DE TRAZABILIDAD */}
      {selectedOrdenForFlow && (
        <ModalFlujoRequerimiento
          orden={selectedOrdenForFlow}
          onClose={() => setSelectedOrdenForFlow(null)}
        />
      )}
    </div>
  );
};
