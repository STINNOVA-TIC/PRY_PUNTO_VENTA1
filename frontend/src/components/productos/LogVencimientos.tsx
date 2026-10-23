import React, { useEffect, useMemo, useState } from 'react';
import { BsPencil, BsCheckLg, BsXLg, BsArrowCounterclockwise } from 'react-icons/bs';
import { productosAPI } from '../../api/productos.api';
import { useAuth } from '../../context/AuthContext';
import { SearchAndFilterBar } from '../common/SearchAndFilterBar';
import { Paginacion } from '../common/Paginacion';
import { BotonRecargar } from '../common/BotonRecargar';

// Debe coincidir con los alias del SELECT del backend
interface LoteVencimiento {
  id: string;
  recepcion_id: number | null;   // null = requerimiento antiguo, no editable
  producto_codigo: string;
  producto_nombre: string;
  categoria: string;
  cantidad: number;
  fecha_ingreso: string;         // 'YYYY-MM-DD'
  fecha_vencimiento: string;     // 'YYYY-MM-DD' (editada o calculada)
  vencimiento_manual: boolean;   // true = la puso un usuario
  referencia: string;
  factura: string | null;
}

type EstadoVenc = 'vencido' | 'por_vencer' | 'vigente';

const DIAS_VIDA_UTIL = 35; // solo informativo; el cálculo está en el backend
const DIAS_ALERTA = 7;     // última semana antes de vencer = "por vencer"

const calcularEstado = (fecha: string): { dias: number; estado: EstadoVenc } => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(`${fecha}T00:00:00`);
  const dias = Math.round((venc.getTime() - hoy.getTime()) / 86400000);
  if (dias < 0) return { dias, estado: 'vencido' };
  if (dias <= DIAS_ALERTA) return { dias, estado: 'por_vencer' };
  return { dias, estado: 'vigente' };
};

const formatearFecha = (fecha: string | null) =>
  fecha ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES') : '—';

const ESTILO_ESTADO: Record<EstadoVenc, { label: string; clase: string }> = {
  vencido:    { label: 'Vencido',    clase: 'bg-red-50 text-red-700 border-red-100' },
  por_vencer: { label: 'Por vencer', clase: 'bg-amber-50 text-amber-700 border-amber-100' },
  vigente:    { label: 'Vigente',    clase: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

export const LogVencimientos: React.FC = () => {
  const { hasPermission } = useAuth();
  const puedeEditar = hasPermission('compras.requerimientos.recibir') || hasPermission('productos.editar');

  const [lotes, setLotes] = useState<LoteVencimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('ALL');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Edición en línea de la fecha
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [fechaEditada, setFechaEditada] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await productosAPI.getVencimientos();
      setLotes(res.data || []);
    } catch (err) {
      console.error('Error cargando vencimientos:', err);
      setError('No se pudo cargar el registro de vencimientos.');
      setLotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const iniciarEdicion = (lote: LoteVencimiento) => {
    if (!lote.recepcion_id) return;
    setEditandoId(lote.recepcion_id);
    setFechaEditada(lote.fecha_vencimiento);
    setError('');
    setMensaje('');
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setFechaEditada('');
  };

  // fecha = null restablece a la calculada (ingreso + 35 días)
  const guardarFecha = async (recepcionId: number, fecha: string | null) => {
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const res = await productosAPI.actualizarVencimiento(recepcionId, fecha);
      setMensaje(res.message || 'Fecha actualizada.');
      cancelarEdicion();
      await cargar();
    } catch (err: any) {
      console.error('Error actualizando vencimiento:', err);
      setError(err?.response?.data?.message || 'No se pudo actualizar la fecha de vencimiento.');
    } finally {
      setGuardando(false);
    }
  };

  const categorias = useMemo(
    () => Array.from(new Set(lotes.map((l) => l.categoria))).sort(),
    [lotes]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lotes
      .map((l) => ({ ...l, ...calcularEstado(l.fecha_vencimiento) }))
      .filter((l) =>
        (!q ||
          (l.producto_nombre || '').toLowerCase().includes(q) ||
          (l.producto_codigo || '').toLowerCase().includes(q) ||
          (l.referencia || '').toLowerCase().includes(q)) &&
        (filtroEstado === 'ALL' || l.estado === filtroEstado) &&
        (filtroCategoria === 'ALL' || l.categoria === filtroCategoria)
      )
      .sort((a, b) => a.dias - b.dias);
  }, [lotes, busqueda, filtroEstado, filtroCategoria]);

  const paginados = filtrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Log de Vencimientos de Productos</h2>
          <p className="text-xs text-gray-400">
            Por defecto: fecha de ingreso + {DIAS_VIDA_UTIL} días ({DIAS_VIDA_UTIL / 7} semanas). Puedes ajustar la fecha de cada lote.
          </p>
        </div>
        <BotonRecargar onRefresh={cargar} loading={loading} />
      </div>

      {mensaje && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">{mensaje}</div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">{error}</div>
      )}

      <SearchAndFilterBar
        searchPlaceholder="Buscar por producto, código o requerimiento..."
        searchValue={busqueda}
        onSearchChange={(v) => { setBusqueda(v); setCurrentPage(1); }}
        totalResults={filtrados.length}
        totalCount={lotes.length}
        resultsLabel="lotes"
        selectFilters={[
          {
            id: 'categoria',
            placeholder: 'Todas las categorías',
            value: filtroCategoria,
            onChange: (v) => { setFiltroCategoria(v); setCurrentPage(1); },
            options: categorias.map((c) => ({ value: c, label: c })),
          },
          {
            id: 'estado',
            placeholder: 'Todos los estados',
            value: filtroEstado,
            onChange: (v) => { setFiltroEstado(v); setCurrentPage(1); },
            options: [
              { value: 'vencido', label: 'Vencido' },
              { value: 'por_vencer', label: `Por vencer (≤ ${DIAS_ALERTA} días)` },
              { value: 'vigente', label: 'Vigente' },
            ],
          },
        ]}
      />

      {loading ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl text-gray-400 text-xs">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl text-gray-400 text-xs font-medium">
          No hay recepciones de requerimientos registradas.
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4">Cantidad</th>
                    <th className="px-6 py-4">Ingreso</th>
                    <th className="px-6 py-4">Vencimiento</th>
                    <th className="px-6 py-4">Días restantes</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Requerimiento</th>
                    <th className="px-6 py-4">Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {paginados.map((l) => {
                    const enEdicion = l.recepcion_id !== null && editandoId === l.recepcion_id;
                    return (
                      <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50/30">
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {l.producto_codigo && <span className="font-mono">{l.producto_codigo}-</span>}
                          {l.producto_nombre}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{l.categoria}</td>
                        <td className="px-6 py-4">{l.cantidad}</td>
                        <td className="px-6 py-4 text-gray-400">{formatearFecha(l.fecha_ingreso)}</td>

                        {/* Celda de vencimiento editable */}
                        <td className="px-6 py-4">
                          {enEdicion ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={fechaEditada}
                                min={l.fecha_ingreso}
                                onChange={(e) => setFechaEditada(e.target.value)}
                                className="h-8 rounded-lg border border-gray-300 px-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
                              />
                              <button
                                type="button"
                                title="Guardar"
                                disabled={guardando || !fechaEditada}
                                onClick={() => guardarFecha(l.recepcion_id as number, fechaEditada)}
                                className="p-1.5 rounded-lg bg-gray-800 text-white hover:bg-gray-700 disabled:bg-gray-400"
                              >
                                <BsCheckLg className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                title="Cancelar"
                                disabled={guardando}
                                onClick={cancelarEdicion}
                                className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
                              >
                                <BsXLg className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{formatearFecha(l.fecha_vencimiento)}</span>
                              {l.vencimiento_manual ? (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">Editada</span>
                              ) : (
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 border border-gray-200">Est.</span>
                              )}
                              {puedeEditar && l.recepcion_id !== null && (
                                <button
                                  type="button"
                                  title="Cambiar fecha de vencimiento"
                                  onClick={() => iniciarEdicion(l)}
                                  className="p-1 rounded text-gray-400 hover:text-gray-800 hover:bg-gray-100"
                                >
                                  <BsPencil className="h-3 w-3" />
                                </button>
                              )}
                              {puedeEditar && l.recepcion_id !== null && l.vencimiento_manual && (
                                <button
                                  type="button"
                                  title={`Restablecer a ${DIAS_VIDA_UTIL} días desde el ingreso`}
                                  disabled={guardando}
                                  onClick={() => guardarFecha(l.recepcion_id as number, null)}
                                  className="p-1 rounded text-gray-400 hover:text-gray-800 hover:bg-gray-100"
                                >
                                  <BsArrowCounterclockwise className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {l.dias < 0 ? `Hace ${Math.abs(l.dias)} días` : l.dias === 0 ? 'Vence hoy' : `${l.dias} días`}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${ESTILO_ESTADO[l.estado].clase}`}>
                            {ESTILO_ESTADO[l.estado].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-600">{l.referencia}</td>
                        <td className="px-6 py-4 font-mono text-gray-400">{l.factura || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Paginacion
            currentPage={currentPage}
            totalItems={filtrados.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}
    </div>
  );
};