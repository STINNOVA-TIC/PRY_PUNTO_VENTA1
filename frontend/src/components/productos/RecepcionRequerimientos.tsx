import React, { useState, useEffect } from 'react';
import { ordenesAPI } from '../../api/ordenes.api';
import { useAuth } from '../../context/AuthContext';
import { VistaImpresionRequerimiento } from './VistaImpresionRequerimiento';
import { adminAPI } from '../../api/admin.api';
import { BotonRecargar } from '../common/BotonRecargar';

export const RecepcionRequerimientos: React.FC = () => {
  const { user } = useAuth();
  const rol = user?.rol.nombre?.toLowerCase();

  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtros
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal de Recepción
  const [selectedOrden, setSelectedOrden] = useState<any | null>(null);
  const [facturasInputs, setFacturasInputs] = useState<string[]>(['']);
  const [receptionLoading, setReceptionLoading] = useState(false);
  const [receptionError, setReceptionError] = useState('');

  // Modal de Detalle
  const [detailOrden, setDetailOrden] = useState<any | null>(null);

  // Modal de impresión
  const [printOrden, setPrintOrden] = useState<any | null>(null);

  const isAutorizado = rol && ['admin', 'guardia', 'inventario'].includes(rol);

  useEffect(() => {
    if (isAutorizado) {
      cargarDatos();
    }
  }, [isAutorizado]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');
      const [ordRes, empRes] = await Promise.all([
        ordenesAPI.getAll(),
        adminAPI.read('empresa')
      ]);
      setOrdenes(ordRes.data || []);
      setEmpresas((empRes.data || []).filter((emp: any) => emp.empresa_estado === 'activo'));
    } catch (err: any) {
      console.error('Error al cargar órdenes de compra:', err);
      setError('No se pudieron cargar los requerimientos del sistema.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReceiveModal = (orden: any) => {
    setSelectedOrden(orden);
    setFacturasInputs(['']);
    setReceptionError('');
  };

  const handleAddFacturaInput = () => {
    setFacturasInputs([...facturasInputs, '']);
  };

  const handleRemoveFacturaInput = (index: number) => {
    const nextInputs = facturasInputs.filter((_, idx) => idx !== index);
    setFacturasInputs(nextInputs);
  };

  const handleFacturaInputChange = (index: number, val: string) => {
    const nextInputs = [...facturasInputs];
    nextInputs[index] = val;
    setFacturasInputs(nextInputs);
  };

  const handleConfirmReception = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrden) return;

    const cleanFacturas = facturasInputs.map(f => f.trim()).filter(f => f.length > 0);
    if (cleanFacturas.length === 0) {
      setReceptionError('Debe ingresar al menos un código de factura válido.');
      return;
    }

    try {
      setReceptionLoading(true);
      setReceptionError('');
      await ordenesAPI.entregar(selectedOrden.id, cleanFacturas);
      
      setSuccess(`Requerimiento ${selectedOrden.codigo} recibido y stock actualizado con éxito.`);
      setSelectedOrden(null);
      cargarDatos();
      
      // Desvanecer el cartel de éxito a los 5 segundos
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err: any) {
      console.error('Error al entregar orden:', err);
      setReceptionError(err.response?.data?.message || 'Error al procesar la recepción.');
    } finally {
      setReceptionLoading(false);
    }
  };

  // Filtrado de requerimientos
  const filteredOrdenes = ordenes.filter((oc) => {
    const matchEstado = filterEstado === 'todos' || oc.estado === filterEstado;
    const matchSearch = 
      oc.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (oc.empresa_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (oc.empleado_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchEstado && matchSearch;
  });

  if (!isAutorizado) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white border border-red-200 shadow-xl rounded-2xl p-8 text-center font-sans">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
        <p className="text-sm text-gray-500 mb-6">
          No tienes permisos para acceder al módulo de recepción de requerimientos. Esta sección está reservada exclusivamente para los roles de <strong>Administración, Guardia y Operador de Inventario</strong>.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold transition"
        >
          Volver Atrás
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Recepción de Requerimientos</h1>
          <p className="text-xs text-gray-500 mt-1">Registra la recepción de productos, asocia facturas de compra e incrementa el stock físico en el inventario.</p>
        </div>
        <BotonRecargar onRefresh={cargarDatos} loading={loading} />
      </div>

      {/* Alertas */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <span>✅</span>
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <span>❌</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Controles de Búsqueda y Filtros */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase">Buscar Requerimiento</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por secuencial, empresa o solicitante..."
            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gray-800"
          />
        </div>
        <div className="w-full md:w-60">
          <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase">Filtrar por Estado</label>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-gray-800"
          >
            <option value="todos">Todos los Estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="comprada">Comprada</option>
            <option value="recibida">Recibida</option>
            <option value="entregado">Entregado</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Tabla Principal */}
      {loading ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl text-gray-500 text-xs font-semibold">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-850 rounded-full mb-2"></div>
          <div>Cargando listado de requerimientos...</div>
        </div>
      ) : filteredOrdenes.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl text-gray-400 text-xs font-medium">
          No se encontraron requerimientos que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Secuencial</th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Departamento</th>
                  <th className="px-6 py-4">Solicitante</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Facturas</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-gray-750 divide-y divide-y-gray-100">
                {filteredOrdenes.map((oc) => (
                  <tr key={oc.id} className="hover:bg-gray-50/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">{oc.codigo}</td>
                    <td className="px-6 py-4 font-semibold">{oc.empresa_nombre || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-600">{oc.departamento_nombre || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-600">{oc.empleado_nombre || 'Sistema'}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(oc.fecha_solicitud).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2.5 py-1 rounded border ${
                        oc.estado === 'entregado'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : oc.estado === 'aprobada' || oc.estado === 'recibida'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : oc.estado === 'rechazada' || oc.estado === 'cancelada'
                          ? 'bg-red-50 text-red-700 border-red-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {oc.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {oc.facturas && oc.facturas.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {oc.facturas.map((f: string, i: number) => (
                            <span key={i} className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded font-mono text-[9px] font-bold">
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic font-mono text-[10px]">Sin facturas</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDetailOrden(oc)}
                          className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg font-bold text-[10px] shadow-sm transition"
                          title="Ver detalles"
                        >
                          🔍 Detalle
                        </button>
                        
                        <button
                          onClick={() => setPrintOrden(oc)}
                          className="px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg font-bold text-[10px] shadow-sm transition"
                          title="Descargar PDF"
                        >
                          📄 PDF
                        </button>

                        {oc.estado !== 'entregado' && oc.estado !== 'cancelada' && (
                          <button
                            onClick={() => handleOpenReceiveModal(oc)}
                            className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-bold text-[10px] shadow-sm transition"
                          >
                            📥 Recibir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: RECIBIR PRODUCTOS */}
      {selectedOrden && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in font-sans">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase">Recibir Requerimiento</h3>
                <span className="text-xs font-mono font-bold text-gray-500 mt-0.5 block">{selectedOrden.codigo}</span>
              </div>
              <button 
                onClick={() => setSelectedOrden(null)}
                className="text-gray-400 hover:text-gray-600 text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReception} className="flex-1 overflow-y-auto p-6 space-y-6">
              {receptionError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-semibold">
                  ❌ {receptionError}
                </div>
              )}

              {/* Detalle de Productos a Recibir */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2.5 uppercase tracking-wider">Productos a Recibir</h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                        <th className="px-4 py-2.5">Código</th>
                        <th className="px-4 py-2.5">Producto</th>
                        <th className="px-4 py-2.5 text-center">Cant. Solicitada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {selectedOrden.detalles?.map((det: any) => (
                        <tr key={det.id} className="text-gray-700">
                          <td className="px-4 py-2.5 font-mono font-bold text-gray-500">{det.producto_codigo}</td>
                          <td className="px-4 py-2.5 font-medium">{det.producto_nombre}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-gray-900">{det.cantidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ingreso de Facturas */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Facturas Asociadas</h4>
                  <button
                    type="button"
                    onClick={handleAddFacturaInput}
                    className="px-2.5 py-1 text-[10px] font-bold bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-750 rounded-lg transition"
                  >
                    ➕ Agregar Factura
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">Ingresa los códigos de las facturas que respaldan la recepción de estos bienes y/o servicios.</p>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {facturasInputs.map((fac, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-[10px] text-gray-400 font-bold font-mono w-6">#{idx + 1}</span>
                      <input
                        type="text"
                        value={fac}
                        onChange={(e) => handleFacturaInputChange(idx, e.target.value)}
                        placeholder="Ej. FAC-001-002-12345"
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-xl text-xs focus:ring-1 focus:ring-gray-800 focus:outline-none font-mono"
                        required
                      />
                      {facturasInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFacturaInput(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setSelectedOrden(null)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-55 text-gray-600 rounded-xl text-xs font-bold transition"
                  disabled={receptionLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                  disabled={receptionLoading}
                >
                  {receptionLoading ? '⏳ Procesando...' : '📥 Confirmar Recepción y Actualizar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE COMPLETO */}
      {detailOrden && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in font-sans">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase">Detalle del Requerimiento</h3>
                <span className="text-xs font-mono font-bold text-gray-500 mt-0.5 block">{detailOrden.codigo}</span>
              </div>
              <button 
                onClick={() => setDetailOrden(null)}
                className="text-gray-400 hover:text-gray-600 text-base"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Empresa</span>
                  <span className="font-semibold text-gray-800">{detailOrden.empresa_nombre || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Departamento</span>
                  <span className="font-semibold text-gray-800">{detailOrden.departamento_nombre || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Solicitante</span>
                  <span className="font-semibold text-gray-800">{detailOrden.empleado_nombre || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Fecha Solicitud</span>
                  <span className="font-semibold text-gray-800">{new Date(detailOrden.fecha_solicitud).toLocaleString('es-ES')}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Estado</span>
                  <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border mt-0.5 ${
                    detailOrden.estado === 'entregado'
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>{detailOrden.estado}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Proveedor</span>
                  <span className="font-semibold text-gray-800">{detailOrden.proveedor_nombre}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Justificación</span>
                <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-150 leading-relaxed italic">
                  "{detailOrden.justificacion}"
                </p>
              </div>

              {detailOrden.facturas && detailOrden.facturas.length > 0 && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Facturas Asociadas</span>
                  <div className="flex flex-wrap gap-2">
                    {detailOrden.facturas.map((f: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-750 border border-gray-200 rounded-lg font-mono text-xs font-bold">
                        📄 {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">Detalle de Artículos</h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                        <th className="px-4 py-2.5">Código</th>
                        <th className="px-4 py-2.5">Artículo</th>
                        <th className="px-4 py-2.5 text-center">Cantidad</th>
                        <th className="px-4 py-2.5 text-right">Precio Unitario</th>
                        <th className="px-4 py-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {detailOrden.detalles?.map((det: any) => (
                        <tr key={det.id}>
                          <td className="px-4 py-2.5 font-mono font-semibold text-gray-500">{det.producto_codigo}</td>
                          <td className="px-4 py-2.5 font-medium">{det.producto_nombre}</td>
                          <td className="px-4 py-2.5 text-center font-bold">{det.cantidad}</td>
                          <td className="px-4 py-2.5 text-right">${Number(det.precio_unitario || 0).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">${Number(det.subtotal || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  onClick={() => setDetailOrden(null)}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPRESIÓN REQUERIMIENTO */}
      {printOrden && (
        <VistaImpresionRequerimiento
          orden={printOrden}
          empresas={empresas}
          onClose={() => setPrintOrden(null)}
        />
      )}
    </div>
  );
};
