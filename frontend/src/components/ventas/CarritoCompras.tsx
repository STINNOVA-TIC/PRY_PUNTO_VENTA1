import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ventasAPI } from '../../api/ventas.api';
import { empleadosAPI } from '../../api/empleados.api';
import { autoconsumoAPI } from '../../api/autoconsumo.api';
import { entregasAPI } from '../../api/entregas.api';
import { Producto, CreateVentaRequest } from '../../types';
import { CatalogoProductos } from '../productos/CatalogoProductos';
import { BotonRecargar } from '../common/BotonRecargar';
import { Paginacion } from '../common/Paginacion';
import logoEmpresa from '../../assets/logo.png';
import { BsTrash, BsFileEarmarkText, BsCheckCircle, BsInfoCircle, BsHourglassSplit, BsXCircle } from 'react-icons/bs';

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

export const CarritoCompras: React.FC = () => {
  const { user, logout } = useAuth();
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [codigoRetiroResult, setCodigoRetiroResult] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'productos' | 'carrito' | 'pedidos'>('productos');
  const [countdown, setCountdown] = useState(5);

  // Estados de Autoconsumo e Historial
  const [isAutoconsumoMode, setIsAutoconsumoMode] = useState(false);
  const [justificacion, setJustificacion] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string | number>('');
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [showAutoconsumoModal, setShowAutoconsumoModal] = useState(false);
  
  const [historialAutoconsumo, setHistorialAutoconsumo] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Paginación del historial "Mis Pedidos y Códigos de Retiro"
  const [currentPagePedidos, setCurrentPagePedidos] = useState(1);
  const [itemsPerPagePedidos, setItemsPerPagePedidos] = useState(10);

  const cargarHistorial = async () => {
    try {
      setLoadingHistorial(true);
      const [entregasRes, autoconsumosRes] = await Promise.allSettled([
        entregasAPI.getAll(),
        autoconsumoAPI.getAll()
      ]);

      const listCombined: any[] = [];

      if (entregasRes.status === 'fulfilled' && entregasRes.value.data) {
        entregasRes.value.data.forEach((ent: any) => {
          listCombined.push({
            id: `ent-${ent.id}`,
            codigo: ent.codigo_entrega || `RET-${ent.id}`,
            fecha_solicitud: ent.fecha_solicitud,
            estado: ent.estado,
            justificacion: 'Pedido de consumo personal (Descuento de nómina)',
            tipo: 'pedido',
            detalles: ent.detalles || []
          });
        });
      }

      if (autoconsumosRes.status === 'fulfilled' && autoconsumosRes.value.data) {
        autoconsumosRes.value.data.forEach((auto: any) => {
          listCombined.push({
            id: `auto-${auto.id}`,
            codigo: auto.codigo || `AUTO-${auto.id}`,
            fecha_solicitud: auto.fecha_solicitud,
            estado: auto.estado,
            justificacion: auto.justificacion || 'Autoconsumo interno',
            tipo: 'autoconsumo',
            detalles: auto.detalles || []
          });
        });
      }

      listCombined.sort((a, b) => new Date(b.fecha_solicitud).getTime() - new Date(a.fecha_solicitud).getTime());

      setHistorialAutoconsumo(listCombined);
      setCurrentPagePedidos(1);
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    if (user) {
      cargarHistorial();
    }
  }, [user]);

  useEffect(() => {
    let timer: any;
    if (showSuccessModal) {
      setCountdown(5);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSalir();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showSuccessModal]);

  const agregarProducto = (producto: Producto) => {
    setMensaje('');
    setCodigoRetiroResult('');

    // Siempre buscamos el producto en la lista original de items para saber qué cantidad ya hay en el carrito
    const existing = items.find(i => i.producto.id === producto.id);
    
    if (existing) {
      if (existing.cantidad < producto.stock_actual) {
        setItems(items.map(i =>
          i.producto.id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        ));
      } else {
        setMensaje('No hay suficiente stock disponible de este producto');
      }
    } else {
      if (producto.stock_actual > 0) {
        setItems([...items, { producto, cantidad: 1 }]);
      } else {
        setMensaje('Este producto no tiene stock disponible');
      }
    }
  };

  const quitarProducto = (productoId: number) => {
    const item = items.find(i => i.producto.id === productoId);
    if (item) {
      if (item.cantidad > 1) {
        setItems(items.map(i =>
          i.producto.id === productoId
            ? { ...i, cantidad: i.cantidad - 1 }
            : i
        ));
      } else {
        setItems(items.filter(i => i.producto.id !== productoId));
      }
    }
  };

  const clearCart = () => {
    setItems([]);
    setMensaje('');
  };

  const totalNeto = items.reduce((sum, i) => sum + i.producto.precio_venta * i.cantidad, 0);

  const realizarVenta = async () => {
    if (items.length === 0) {
      setMensaje('El carrito está vacío. Agrega productos del menú.');
      return;
    }

    if (!user?.empleado) {
      setMensaje('Solo empleados autorizados pueden comprar.');
      return;
    }

    setLoading(true);
    setMensaje('');
    setCodigoRetiroResult('');

    try {
      const data: CreateVentaRequest = {
        empleado_id: user.empleado.id,
        productos: items.map(i => ({
          producto_id: i.producto.id,
          cantidad: i.cantidad,
        })),
        metodo_pago: 'nomina',
      };

      const res = await ventasAPI.create(data);
      setItems([]);
      
      const codRetiro = res.data?.codigo_retiro || 'RET-NUEVA-COMPRA';
      setCodigoRetiroResult(codRetiro);
      setMensaje('✅ Compra realizada con éxito.');
      cargarHistorial();
      setShowSuccessModal(true);
    } catch (error: any) {
      setMensaje(error.response?.data?.message || 'Error al procesar la compra');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAutoconsumoMode) {
      const fetchMetadata = async () => {
        try {
          const deptoRes = await empleadosAPI.getDepartamentos();
          setDepartamentos(deptoRes.data || []);
        } catch (err) {
          console.error('Error fetching metadata for autoconsumo:', err);
        }
      };
      fetchMetadata();
    }
  }, [isAutoconsumoMode]);

  const canCreateAutoconsumo = !!user?.permitir_autoconsumo;

  const realizarAutoconsumo = async () => {
    if (items.length === 0) {
      setMensaje('El carrito está vacío. Agrega productos del menú.');
      return;
    }

    if (!user?.empleado) {
      setMensaje('Solo empleados autorizados pueden registrar autoconsumo.');
      return;
    }

    if (!justificacion.trim()) {
      setMensaje('Por favor, ingresa una justificación para el autoconsumo.');
      return;
    }

    if (!selectedDeptId) {
      setMensaje('Por favor, selecciona el departamento.');
      return;
    }

    setLoading(true);
    setMensaje('');
    setCodigoRetiroResult('');

    try {
      const res = await autoconsumoAPI.crear({
        empleado_id: user.empleado.id,
        departamento_id: Number(selectedDeptId),
        justificacion: justificacion.trim(),
        productos: items.map(i => ({
          producto_id: i.producto.id,
          cantidad: i.cantidad,
        })),
      });

      setItems([]);
      setJustificacion('');
      setSelectedDeptId('');
      setShowAutoconsumoModal(false);
      const codRetiro = res.data?.codigo || 'AUTO-NUEVA-SOLICITUD';
      setCodigoRetiroResult(codRetiro);
      setMensaje('✅ Solicitud de autoconsumo registrada con éxito. Debe ser aprobada por Talento Humano.');
      cargarHistorial();
      setShowSuccessModal(true);
    } catch (error: any) {
      setMensaje(error.response?.data?.message || 'Error al procesar el autoconsumo');
    } finally {
      setLoading(false);
    }
  };

  const handleSalir = () => {
    logout();
  };

  // Lista paginada de "Mis Pedidos y Códigos de Retiro"
  const historialPaginado = React.useMemo(() => {
    const startIndex = (currentPagePedidos - 1) * itemsPerPagePedidos;
    const endIndex = startIndex + itemsPerPagePedidos;
    return historialAutoconsumo.slice(startIndex, endIndex);
  }, [historialAutoconsumo, currentPagePedidos, itemsPerPagePedidos]);

  return (
    <div className="flex flex-col font-sans h-[calc(100vh-3rem)] overflow-hidden space-y-4">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex justify-between items-center bg-white border border-gray-200 rounded-xl px-5 py-2.5 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <img 
            src={logoEmpresa} 
            alt="Logotipo" 
            className="h-8 w-auto object-contain select-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {canCreateAutoconsumo && (
            <button
              onClick={() => {
                setIsAutoconsumoMode(!isAutoconsumoMode);
                setItems([]); // Limpiar carrito al cambiar de modo
                setMensaje('');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 border ${
                isAutoconsumoMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-650 shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}
            >
              {isAutoconsumoMode ? 'Volver a Compras' : 'Modo Autoconsumo'}
            </button>
          )}
          {/* Botón de Mis Pedidos al lado de Salir (solo visible en computadora) */}
          <button
            onClick={() => setActiveTab(activeTab === 'pedidos' ? 'productos' : 'pedidos')}
            className={`hidden md:flex px-4 py-2 rounded-lg text-xs font-bold transition items-center gap-1 active:scale-95 border ${
              activeTab === 'pedidos'
                ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-850 shadow-sm'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
            }`}
          >
            {activeTab === 'pedidos' ? '🛍️ Ver Catálogo' : '📋 Mis Pedidos / Códigos'}
          </button>
          <button
            onClick={handleSalir}
            className="bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
          >
            Salir
          </button>
        </div>
      </div>

      {/* PESTAÑAS PARA DISPOSITIVOS MÓVILES (Oculto en md y superior) */}
      <div className="flex md:hidden bg-gray-100 p-1 rounded-xl gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('productos')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'productos'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🛍️ Productos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('carrito')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all relative ${
            activeTab === 'carrito'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🛒 Mi Carrito {items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-gray-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              {items.reduce((acc, curr) => acc + curr.cantidad, 0)}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pedidos')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'pedidos'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Mis Pedidos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 flex-grow min-h-0">
        
        {/* PANEL IZQUIERDO: Datos del Empleado + Carrito */}
        <div className={`${activeTab === 'carrito' ? 'flex' : 'hidden'} md:flex md:col-span-1 flex-col min-h-0 space-y-4`}>
          {/* Datos del Empleado */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4 flex-shrink-0">
            <div className="text-center space-y-3">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Comprador Activo
              </h2>
              <div className="flex justify-center">
                <img
                  src={user?.empleado?.foto_perfil || `https://ui-avatars.com/api/?name=${user?.nombre}&size=128`}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full border border-gray-250 object-cover shadow-sm"
                />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-gray-800 leading-snug">
                  {user?.empleado?.nombre && user?.empleado?.apellido
                    ? `${user.empleado.nombre} ${user.empleado.apellido}`
                    : user?.nombre}
                </h3>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                  {user?.empleado?.cargo || 'Colaborador'}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2 text-[11px] text-gray-600">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-400">Departamento:</span>
                <span className="font-bold text-gray-700">{user?.empleado?.departamento || 'General'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-400">Centro de Costos:</span>
                <span className="font-bold text-gray-700">{user?.empleado?.centro_costos || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-400">Cédula / ID:</span>
                <span className="font-mono font-bold text-gray-700">{user?.empleado?.codigo_empleado || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Carrito de Compras */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col min-h-0 flex-grow space-y-3">
            <div className="flex justify-between items-center text-base font-semibold text-gray-800 border-b border-gray-100 pb-2 flex-shrink-0">
              <h2 className="flex items-center gap-2">
                Carrito de Compras
              </h2>
              <button onClick={clearCart} title="Vaciar carrito" className="text-gray-600 hover:text-red-650 transition flex items-center justify-center p-1">
                <BsTrash className="h-5 w-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-grow flex items-center justify-center text-center text-gray-400 text-xs py-4">
                Tu carrito está vacío.<br />Selecciona productos.
              </div>
            ) : (
              <div className="flex flex-col min-h-0 flex-grow">
                <div className="overflow-y-auto flex-grow space-y-2.5 pr-1 text-xs">
                  {items.map((item) => (
                    <div key={item.producto.id} className="flex justify-between items-center text-xs border-b border-gray-100 pb-2.5">
                      <div className="flex-grow pr-2">
                        <div className="flex flex-col">
                          <span className="font-mono text-[8px] text-gray-400 bg-gray-50 border border-gray-150 px-1 py-0.5 rounded w-fit mb-0.5">{item.producto.codigo_barras}</span>
                          <span className="font-semibold text-gray-800 line-clamp-1">{item.producto.nombre}</span>
                        </div>
                        <div className="text-[10px] text-gray-550 mt-0.5">
                          ${(item.producto.precio_venta).toFixed(2)} c/u
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Selector de cantidad interactivo */}
                        <div className="flex items-center gap-1 bg-gray-50 border border-gray-250/70 rounded-lg p-0.5">
                          <button
                            onClick={() => quitarProducto(item.producto.id)}
                            className="w-5 h-5 flex items-center justify-center rounded-md bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold transition active:scale-95 text-[10px]"
                          >
                            -
                          </button>
                          <span className="font-bold text-gray-700 min-w-[12px] text-center text-[10px] select-none">{item.cantidad}</span>
                          <button
                            onClick={() => agregarProducto(item.producto)}
                            className="w-5 h-5 flex items-center justify-center rounded-md bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold transition active:scale-95 text-[10px]"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-bold text-gray-800 min-w-[45px] text-right">
                          ${(item.producto.precio_venta * item.cantidad).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 border-t border-gray-100 space-y-2 text-xs flex-shrink-0">
                  <div className="flex justify-between font-bold text-gray-800 text-sm pt-1 border-t border-gray-100/60">
                    <span>{isAutoconsumoMode ? 'Costo Empresa:' : 'Total:'}</span>
                    <span>${totalNeto.toFixed(2)}</span>
                  </div>
                  
                  {isAutoconsumoMode && (
                    <span className="text-[10px] font-semibold text-emerald-600 block leading-tight">
                      * Asumido por la empresa (no se descuenta del salario).
                    </span>
                  )}
                </div>

                <button
                  onClick={isAutoconsumoMode ? () => setShowAutoconsumoModal(true) : realizarVenta}
                  disabled={loading || items.length === 0}
                  className={`w-full py-2.5 rounded-lg font-semibold transition disabled:opacity-50 text-xs mt-2 flex-shrink-0 ${
                    isAutoconsumoMode
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  {loading ? 'Procesando...' : isAutoconsumoMode ? 'Confirmar Autoconsumo' : 'Confirmar Pedido'}
                </button>
              </div>
            )}

            {mensaje && !mensaje.includes('éxito') && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex-shrink-0">
                {mensaje}
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: Catalogo de Productos */}
        <div className={`${activeTab === 'productos' ? 'flex' : 'hidden'} ${activeTab === 'pedidos' ? 'md:hidden' : 'md:flex'} md:col-span-2 lg:col-span-3 flex-col min-h-0 bg-white border border-gray-200 rounded-xl p-5 shadow-sm`}>
          <div className="overflow-y-auto flex-grow pr-1">
            <CatalogoProductos 
              onAgregarProducto={agregarProducto} 
              hideZeroStock={true}
              onProductosLoaded={(prods) => {
                // Sincronizar los items del carrito con el stock_actual fresco del catálogo al cargar/actualizar
                setItems(prevItems => prevItems.map(item => {
                  const match = prods.find(p => p.id === item.producto.id);
                  if (match) {
                    return {
                      ...item,
                      producto: { ...item.producto, stock_actual: match.stock_actual },
                      // Limitar la cantidad al stock real disponible en caso de desfase
                      cantidad: Math.min(item.cantidad, match.stock_actual)
                    };
                  }
                  return item;
                }).filter(item => item.producto.stock_actual > 0)); // Eliminar del carrito si ya no existe stock disponible
              }}
            />
          </div>
        </div>

        {/* PANEL HISTORIAL: Mis Pedidos / Códigos */}
        <div className={`${activeTab === 'pedidos' ? 'flex flex-col md:col-span-2 lg:col-span-3' : 'hidden'} min-h-0 bg-white border border-gray-200 rounded-xl p-5 shadow-sm overflow-hidden`}>
          <div className="flex justify-between items-center pb-3 border-b border-gray-150 mb-4">
            <div className="flex items-center gap-2">
              <BsFileEarmarkText className="text-gray-600 text-lg" />
              <h2 className="text-sm font-bold text-gray-800">Mis Pedidos y Códigos de Retiro</h2>
            </div>
            <BotonRecargar onRefresh={cargarHistorial} loading={loadingHistorial} />
          </div>

          <div className="overflow-y-auto flex-1 space-y-3.5 pr-1">
            {historialAutoconsumo.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No tienes solicitudes registradas en tu historial.
              </div>
            ) : (
              historialPaginado.map((auto) => (
                <div key={auto.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3 shadow-none">
                  {/* Fila 1: Código, Fecha y Estado */}
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-850 bg-white px-2 py-0.5 border border-gray-250 rounded">
                        {auto.codigo}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(auto.codigo);
                        }}
                        className="text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-700 px-1.5 py-0.5 rounded font-medium active:scale-95"
                      >
                        Copiar Código
                      </button>
                    </div>
                    
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(auto.fecha_solicitud).toLocaleDateString()}
                    </span>

                    {/* Estado Badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      auto.estado === 'entregado'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-250'
                        : auto.estado === 'aprobado'
                        ? 'bg-blue-100 text-blue-800 border border-blue-250'
                        : auto.estado === 'rechazado' || auto.estado === 'cancelado'
                        ? 'bg-red-100 text-red-800 border border-red-250'
                        : 'bg-amber-100 text-amber-800 border border-amber-250'
                    }`}>
                      {auto.estado === 'entregado' ? (
                        <span className="flex items-center gap-1">
                          <BsCheckCircle className="text-emerald-600 shrink-0" /> Entregado
                        </span>
                      ) : auto.estado === 'aprobado' ? (
                        <span className="flex items-center gap-1">
                          <BsInfoCircle className="text-blue-600 shrink-0" /> Aprobado (Por Retirar)
                        </span>
                      ) : auto.estado === 'pendiente' ? (
                        <span className="flex items-center gap-1">
                          <BsHourglassSplit className="text-amber-500 shrink-0" /> Pendiente Aprobación
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <BsXCircle className="text-red-600 shrink-0" /> {auto.estado}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Justificación */}
                  <div className="text-xs text-gray-650 bg-white p-2.5 border border-gray-150 rounded-lg">
                    <span className="font-bold text-gray-400 block text-[9px] uppercase tracking-wider mb-0.5">Justificación / Motivo:</span>
                    {auto.justificacion}
                  </div>

                  {/* Detalles / Productos */}
                  <div className="space-y-1">
                    <span className="font-bold text-gray-400 block text-[9px] uppercase tracking-wider">Productos de la Solicitud:</span>
                    <div className="grid grid-cols-1 gap-1 pl-1">
                      {auto.detalles?.map((det: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-gray-700 py-1 border-b border-gray-100 last:border-0">
                          <span>• {det.producto_nombre || 'Artículo de Consumo'}</span>
                          <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-[10px]">x{det.cantidad}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Paginación del historial */}
          {historialAutoconsumo.length > 0 && (
            <div className="pt-3 border-t border-gray-150 mt-3 flex-shrink-0">
              <Paginacion
                currentPage={currentPagePedidos}
                totalItems={historialAutoconsumo.length}
                itemsPerPage={itemsPerPagePedidos}
                onPageChange={setCurrentPagePedidos}
                onItemsPerPageChange={setItemsPerPagePedidos}
              />
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE ÉXITO DE COMPRA */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-gray-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-5 text-center transform scale-100 transition duration-200">
            <div className="flex justify-center">
              <BsCheckCircle className="text-emerald-500 text-5xl" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-800">¡Pedido Confirmado!</h3>
              <p className="text-xs text-gray-500">Presenta este código al guardia para retirar tu producto.</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl font-mono text-2xl font-black text-gray-800 tracking-wider">
              {codigoRetiroResult}
            </div>

            <p className="text-[10px] text-gray-400">
              El cobro será descontado de tu nómina a fin de mes.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCodigoRetiroResult('');
                }}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
              >
                Continuar Comprando
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCodigoRetiroResult('');
                  handleSalir();
                }}
                className="w-full bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 py-2.5 rounded-lg text-xs font-bold transition active:scale-95"
              >
                Salir ({countdown}s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE AUTOCONSUMO */}
      {showAutoconsumoModal && (
        <div className="fixed inset-0 bg-gray-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 transform scale-105 transition duration-200">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-800">Detalles de Autoconsumo</h3>
              <p className="text-xs text-gray-500">Selecciona el departamento y justificación para registrar el consumo interno.</p>
            </div>

            {/* Departamento Destino */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Departamento Destino
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:border-emerald-500 font-medium text-gray-700"
              >
                <option value="">Selecciona Departamento</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Justificación */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Justificación
              </label>
              <textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                placeholder="Reunión de departamento, refrigerio, etc..."
                rows={3}
                className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-emerald-500 resize-none font-medium text-gray-700"
              />
            </div>

            {/* Mensaje de error interno del modal */}
            {mensaje && !mensaje.includes('éxito') && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px]">
                {mensaje}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAutoconsumoModal(false);
                  setMensaje('');
                }}
                className="w-1/2 bg-gray-50 hover:bg-gray-100 text-gray-650 border border-gray-200 py-2 rounded-lg text-xs font-bold transition active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={realizarAutoconsumo}
                disabled={loading}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
