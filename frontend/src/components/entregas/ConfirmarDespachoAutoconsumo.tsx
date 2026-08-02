import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { autoconsumoAPI } from '../../api/autoconsumo.api';
import { adminAPI } from '../../api/admin.api';

export const ConfirmarDespachoAutoconsumo: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [autoconsumo, setAutoconsumo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [observacion, setObservacion] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      cargarAutoconsumo(id);
    }
  }, [id]);

  const cargarAutoconsumo = async (autoId: string) => {
    try {
      setLoading(true);
      const response = await autoconsumoAPI.getById(autoId);
      setAutoconsumo(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar el autoconsumo');
    } finally {
      setLoading(false);
    }
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setSubiendoFoto(true);
        setError('');
        const res = await adminAPI.uploadPhoto(file, 'entrega');
        setFotoUrl(res.url);
      } catch (err) {
        setError('Error al subir la fotografía de comprobación.');
      } finally {
        setSubiendoFoto(false);
      }
    }
  };

  const handleConfirmar = async () => {
    if (!autoconsumo) return;
    if (!fotoUrl) {
      setError('Debes cargar una fotografía de comprobación del despacho.');
      return;
    }

    try {
      await autoconsumoAPI.entregar(autoconsumo.id, {
        observacion: observacion || 'Autoconsumo entregado a bodega.',
        foto_entrega: fotoUrl
      });
      setMensaje('✅ Autoconsumo despachado y entregado con éxito');
      setTimeout(() => navigate('/entregas'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al despachar el autoconsumo');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        <p className="text-sm text-gray-500 font-medium">Cargando detalle de autoconsumo...</p>
      </div>
    );
  }

  if (!autoconsumo) {
    return (
      <div className="max-w-md mx-auto text-center py-12 bg-white border border-red-200 rounded-xl mt-8">
        <span className="text-4xl">⚠️</span>
        <h3 className="text-lg font-bold text-red-700 mt-2">Error</h3>
        <p className="text-gray-500 text-sm mt-1">El autoconsumo no existe o no pudo cargarse.</p>
        <button
          onClick={() => navigate('/entregas')}
          className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold"
        >
          Volver a Entregas
        </button>
      </div>
    );
  }

  const total = autoconsumo.detalles?.reduce((sum: number, d: any) => sum + d.subtotal, 0) || 0;
  const esAprobado = autoconsumo.estado === 'aprobado';

  return (
    <div className="max-w-2xl mx-auto font-sans space-y-6">

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">📦 Confirmar Despacho de Autoconsumo</h2>
        <button
          onClick={() => navigate('/entregas')}
          className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition"
        >
          ← Volver al listado
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">

        {/* Cabecera / Info General */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
          <div>
            <span className="text-xs uppercase font-semibold text-gray-400">Código de Autoconsumo</span>
            <p className="text-base font-mono font-bold text-gray-800">{autoconsumo.codigo}</p>
          </div>
          <div>
            <span className="text-xs uppercase font-semibold text-gray-400">Fecha de Solicitud</span>
            <p className="text-sm font-semibold text-gray-700">
              {new Date(autoconsumo.fecha_solicitud).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Colaborador Destinatario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs uppercase font-semibold text-gray-400">Colaborador Destinatario</span>
            <p className="text-sm font-bold text-gray-800">{autoconsumo.empleado?.nombre}</p>
            <p className="text-[10px] text-gray-400 font-mono">C.I. {autoconsumo.empleado?.cedula}</p>
          </div>
          <div>
            <span className="text-xs uppercase font-semibold text-gray-400">Departamento / Centro de Costos</span>
            <p className="text-sm font-semibold text-gray-700">{autoconsumo.departamento?.nombre}</p>
            <p className="text-[10px] text-gray-400">
              {autoconsumo.centro_costos?.codigo} - {autoconsumo.centro_costos?.nombre}
            </p>
          </div>
        </div>

        {/* Justificación */}
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-600">
          <span className="font-semibold text-gray-400 uppercase text-[9px] block mb-1">Justificación</span>
          {autoconsumo.justificacion}
        </div>

        {/* Productos a Entregar */}
        <div>
          <h3 className="text-xs uppercase font-semibold text-gray-400 mb-3">Artículos a Entregar (Ubicación en Anaquel)</h3>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                  <th className="px-4 py-3">Código Anaquel / Producto</th>
                  <th className="px-4 py-3 text-center">Cantidad</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {autoconsumo.detalles?.map((d: any) => (
                  <tr key={d.id} className="text-gray-700">
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      <div className="flex items-center flex-wrap">
                        <span className="font-mono text-gray-400 mr-2 bg-gray-50 px-2 py-0.5 border border-gray-150 rounded text-[10px] flex-shrink-0">
                          {d.producto_codigo}
                        </span>
                        <span className="text-gray-850">{d.producto_nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold">{d.cantidad}</td>
                    <td className="px-4 py-3 text-right font-semibold">${d.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-3 font-bold text-gray-800 text-sm border-t border-gray-100 pt-2">
            <span>Total asumido por la empresa:</span>
            <span className="text-emerald-700">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* FOTOGRAFÍA DE COMPROBACIÓN */}
        {esAprobado && (
          <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs uppercase font-bold text-gray-650">1. Fotografía de Comprobación</h3>
              <p className="text-[10px] text-gray-500">Tome una fotografía del colaborador con los productos entregados.</p>
            </div>

            <div className="mt-1">
              {!fotoUrl ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 bg-white rounded-xl p-5 cursor-pointer transition select-none">
                  <span className="text-3xl">📸</span>
                  <span className="text-xs font-bold text-gray-700 mt-2">Tomar Foto de Evidencia</span>
                  <span className="text-[9px] text-gray-400 mt-1">Presione para activar la cámara de su dispositivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoChange}
                    className="hidden"
                    required
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="relative w-full max-w-xs aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                    <img
                      src={fotoUrl}
                      alt="Evidencia"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-black/60 px-3 py-1.5 rounded-lg border border-white/20">Evidencia Guardada</span>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none">
                    🔄 Cambiar Fotografía
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {subiendoFoto && (
              <div className="flex items-center gap-2 py-1">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-800"></div>
                <p className="text-[10px] text-gray-500 animate-pulse font-medium">Subiendo fotografía de evidencia...</p>
              </div>
            )}

            {/* OBSERVACIONES */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-650">Observaciones</label>
              <textarea
                placeholder="Detalla cualquier novedad física..."
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 placeholder-gray-450 focus:outline-none focus:border-gray-400 resize-none"
                rows={2}
              />
            </div>
          </div>
        )}

        {mensaje && (
          <div className="p-4 rounded-lg text-sm border bg-gray-50 border-gray-200 text-gray-800">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* BOTÓN CONFIRMAR */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-gray-100">
          {esAprobado ? (
            <button
              onClick={handleConfirmar}
              disabled={!fotoUrl || subiendoFoto}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg text-sm font-semibold transition active:scale-95 shadow-sm disabled:opacity-40"
            >
              ✓ Confirmar y Entregar Mercancía
            </button>
          ) : (
            <div className="flex-1 text-center py-2.5 bg-gray-100 border border-gray-200 text-gray-500 text-xs font-semibold rounded-lg">
              Esta solicitud ya está {autoconsumo.estado}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
