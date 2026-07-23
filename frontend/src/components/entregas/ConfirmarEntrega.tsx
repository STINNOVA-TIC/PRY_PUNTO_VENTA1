import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { entregasAPI } from '../../api/entregas.api';
import { adminAPI } from '../../api/admin.api';

export const ConfirmarEntrega: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Lógica de códigos de verificación
  const [codigos, setCodigos] = useState<string[]>([]);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState<string>('');
  const [codigoCorrecto, setCodigoCorrecto] = useState<boolean | null>(null);

  // Registro de fotografía de comprobación

  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  useEffect(() => {
    if (id) {
      cargarSolicitud(id);
    }
  }, [id]);

  const cargarSolicitud = async (solId: string) => {
    try {
      setLoading(true);
      const response = await entregasAPI.getById(solId);
      const data = response.data;
      setSolicitud(data);

      // Generar 3 códigos: el correcto y 2 falsos
      const correctCode = data.codigo_entrega || 'BOD-000';
      const fakeCodes: string[] = [];
      while (fakeCodes.length < 2) {
        const randNum = Math.floor(100 + Math.random() * 900);
        const fake = `BOD-${randNum}`;
        if (fake !== correctCode && !fakeCodes.includes(fake)) {
          fakeCodes.push(fake);
        }
      }

      // Mezclar los códigos
      const todos = [correctCode, ...fakeCodes].sort(() => Math.random() - 0.5);
      setCodigos(todos);
    } catch (err) {
      console.error('Error cargando solicitud:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCodigo = (code: string) => {
    setCodigoSeleccionado(code);
    const esCorrecto = code === solicitud.codigo_entrega;
    setCodigoCorrecto(esCorrecto);
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
        setError('Error al subir la fotografía de comprobación');
      } finally {
        setSubiendoFoto(false);
      }
    }
  };

  const handleConfirmar = async () => {
    if (!solicitud) return;
    if (!codigoCorrecto) {
      setError('Debes verificar el código de seguridad correcto para realizar la entrega.');
      return;
    }
    if (!fotoUrl) {
      setError('Debes tomar/cargar la fotografía de comprobación del despacho.');
      return;
    }

    try {
      await entregasAPI.confirmar({
        solicitud_id: solicitud.id,
        guardia_id: 2, // Mock Guardia ID
        metodo_verificacion: 'qr_code',
        observaciones: observaciones || 'Retirado de bodega por el colaborador.',
        foto_entrega: fotoUrl
      });
      setMensaje('✅ Pedido despachado y entregado con éxito');
      setTimeout(() => navigate('/entregas'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al confirmar la entrega');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        <p className="text-sm text-gray-500 font-medium">Cargando detalles de entrega...</p>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="max-w-md mx-auto text-center py-12 bg-white border border-red-200 rounded-xl mt-8">
        <span className="text-4xl">⚠️</span>
        <h3 className="text-lg font-bold text-red-700 mt-2">Error</h3>
        <p className="text-gray-500 text-sm mt-1">La solicitud de entrega no existe o no pudo cargarse.</p>
        <button
          onClick={() => navigate('/entregas')}
          className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold"
        >
          Volver a Entregas
        </button>
      </div>
    );
  }

  const formatFecha = (fechaStr: string) => {
    try {
      return new Date(fechaStr).toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return fechaStr;
    }
  };

  return (
    <div className="max-w-2xl mx-auto font-sans space-y-6">
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">📦 Confirmar Despacho en Bodega</h2>
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
            <span className="text-xs uppercase font-semibold text-gray-400">Código de Retiro</span>
            <p className="text-base font-mono font-bold text-gray-800">{solicitud.codigo_entrega || `#${solicitud.id}`}</p>
          </div>
          <div>
            <span className="text-xs uppercase font-semibold text-gray-400">Fecha de Solicitud</span>
            <p className="text-sm font-semibold text-gray-700">{formatFecha(solicitud.fecha_solicitud)}</p>
          </div>
        </div>

        {/* Productos a Entregar */}
        <div>
          <h3 className="text-xs uppercase font-semibold text-gray-400 mb-3">Productos a Entregar (Ubicación en Anaquel)</h3>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                  <th className="px-4 py-3">Código Anaquel / Producto</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitud.detalles ? (
                  solicitud.detalles.map((d: any) => (
                    <tr key={d.id} className="text-gray-700">
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        <span className="font-mono text-gray-400 mr-2 bg-gray-50 px-2 py-0.5 border border-gray-150 rounded text-[10px]">
                          {d.producto_codigo}
                        </span>
                        {d.producto_nombre}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{d.cantidad}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="text-gray-700">
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {solicitud.producto?.nombre}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{solicitud.cantidad_solicitada}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* VERIFICACIÓN POR CÓDIGOS */}
        {solicitud.estado === 'pendiente' && (
          <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs uppercase font-bold text-gray-650">1. Verificar Código de Seguridad</h3>
              <p className="text-[10px] text-gray-500">Pregunte al colaborador el código de retiro generado en su pantalla.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {codigos.map((code) => {
                const isSelected = codigoSeleccionado === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelectCodigo(code)}
                    className={`p-4 border rounded-xl font-mono text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? codigoCorrecto
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-white hover:bg-gray-100 border-gray-250 text-gray-600'
                    }`}
                  >
                    <span>{code}</span>
                    {isSelected && (
                      <span className="text-[9px] uppercase font-bold tracking-wider">
                        {codigoCorrecto ? 'Correcto ✓' : 'Incorrecto ✗'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {codigoCorrecto === false && (
              <p className="text-[10px] text-red-600 font-bold">✗ Código de retiro incorrecto. Por favor, verifique el código real en la pantalla del colaborador.</p>
            )}

            {codigoCorrecto === true && (
              <div className="bg-white p-4 border border-emerald-100 rounded-xl space-y-3 mt-3">
                <div className="flex items-center gap-4">
                  <img
                    src={solicitud.empleado?.foto || `https://ui-avatars.com/api/?name=${solicitud.empleado?.nombre}&size=128`}
                    alt="Empleado"
                    className="w-16 h-16 rounded-full border border-gray-200 object-cover"
                  />
                  <div>
                    <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">Identidad Confirmada</span>
                    <p className="font-bold text-gray-800 text-sm mt-1">{solicitud.empleado?.nombre}</p>
                    <p className="text-[10px] text-gray-400">
                      Cédula: {solicitud.empleado?.codigo} • {solicitud.empleado?.cargo} ({solicitud.empleado?.departamento})
                    </p>
                  </div>
                </div>

                {/* FOTOGRAFÍA DE COMPROBACIÓN */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <label className="block text-xs font-semibold text-gray-650">2. Fotografía de Comprobación</label>
                  <p className="text-[9px] text-gray-400 font-medium">Tome una fotografía del colaborador con el producto entregado.</p>
                  
                  <div className="mt-1">
                    {!fotoUrl ? (
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 rounded-xl p-5 cursor-pointer transition select-none">
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
                        <div className="relative w-full max-w-xs aspect-video bg-gray-105 rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
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
                </div>

                {/* OBSERVACIONES */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-650">Observaciones</label>
                  <textarea
                    placeholder="Escribe alguna observación (ej. Se entregó frío, etc.)"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 placeholder-gray-450 focus:outline-none focus:border-gray-400 resize-none"
                    rows={2}
                  />
                </div>
              </div>
            )}
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
          {solicitud.estado === 'pendiente' ? (
            <button
              onClick={handleConfirmar}
              disabled={!codigoCorrecto || !fotoUrl || subiendoFoto}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg text-sm font-semibold transition active:scale-95 shadow-sm disabled:opacity-40"
            >
              ✓ Confirmar y Entregar Mercancía
            </button>
          ) : (
            <div className="flex-1 text-center py-2.5 bg-gray-100 border border-gray-200 text-gray-500 text-xs font-semibold rounded-lg">
              Esta solicitud ya está {solicitud.estado}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
