import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ventasAPI } from '../../api/ventas.api';
import { Producto, CreateVentaRequest } from '../../types';
import { CatalogoProductos } from '../productos/CatalogoProductos';
import logoEmpresa from '../../assets/logo.png';

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
  const [activeTab, setActiveTab] = useState<'productos' | 'carrito'>('productos');

  const agregarProducto = (producto: Producto) => {
    setMensaje('');
    setCodigoRetiroResult('');

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
      setShowSuccessModal(true);
    } catch (error: any) {
      setMensaje(error.response?.data?.message || 'Error al procesar la compra');
    } finally {
      setLoading(false);
    }
  };

  const handleSalir = () => {
    logout();
  };

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

        <button
          onClick={handleSalir}
          className="bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
        >
          Salir
        </button>
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
            <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2 flex-shrink-0">
              Carrito de Compras
            </h2>

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

                <div className="pt-2.5 border-t border-gray-100 space-y-1.5 text-xs flex-shrink-0">
                  <div className="flex justify-between font-bold text-gray-800 text-sm pt-1.5">
                    <span>Total:</span>
                    <span>${totalNeto.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={realizarVenta}
                  disabled={loading || items.length === 0}
                  className="w-full bg-gray-800 text-white py-2.5 rounded-lg hover:bg-gray-700 font-medium transition disabled:opacity-50 text-xs mt-2 flex-shrink-0"
                >
                  {loading ? 'Procesando...' : 'Confirmar Pedido'}
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
        <div className={`${activeTab === 'productos' ? 'flex' : 'hidden'} md:flex md:col-span-2 lg:col-span-3 flex-col min-h-0 bg-white border border-gray-200 rounded-xl p-5 shadow-sm`}>
          <div className="overflow-y-auto flex-grow pr-1">
            <CatalogoProductos onAgregarProducto={agregarProducto} />
          </div>
        </div>
      </div>

      {/* MODAL DE ÉXITO DE COMPRA */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-gray-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-5 text-center transform scale-100 transition duration-200">
            <div className="flex justify-center text-5xl">
              ✅
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

            <button
              onClick={() => {
                setShowSuccessModal(false);
                setCodigoRetiroResult('');
              }}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
            >
              Entendido / Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
