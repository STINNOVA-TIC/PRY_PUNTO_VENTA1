import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { entregasAPI } from '../../api/entregas.api';
import { adminAPI } from '../../api/admin.api';
import { BsCheckCircle, BsExclamationTriangle, BsCamera, BsArrowLeft, BsArrowClockwise } from 'react-icons/bs';

export const RegistrarNoEntregado: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Foto de Evidencia
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
      setSolicitud(response.data);
    } catch (err) {
      console.error('Error cargando solicitud para no entregado:', err);
      setError('No se pudo cargar la solicitud.');
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
        setError('Error al subir la fotografía de evidencia.');
      } finally {
        setSubiendoFoto(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitud) return;
    
    if (!fotoUrl) {
      setError('Debes tomar/cargar la fotografía de evidencia de que el producto no fue retirado.');
      return;
    }

    try {
      setError('');
      setMensaje('');
      await entregasAPI.marcarNoEntregado(
        solicitud.id, 
        observaciones || 'Pedido no retirado por el empleado. Retornado a stock.',
        fotoUrl
      );
      setMensaje('Pedido marcado como No Entregado con éxito y stock devuelto a bodega.');
      setTimeout(() => navigate('/entregas'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar la solicitud de No Entregado.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        <p className="text-sm text-gray-500 font-medium">Cargando detalles de entrega...</p>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="max-w-md mx-auto text-center py-12 bg-white border border-red-200 rounded-xl mt-8 font-sans">
        <BsExclamationTriangle className="text-4xl text-red-600 mx-auto" />
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

  return (
    <div className="max-w-2xl mx-auto font-sans space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <BsCamera className="text-gray-600" /> Registrar Pedido No Entregado
        </h2>
        <button
          onClick={() => navigate('/entregas')}
          className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition flex items-center gap-1"
        >
          <BsArrowLeft /> Volver
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        
        {/* Datos Generales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-100">
          <div>
            <span className="text-xs uppercase font-semibold text-gray-400">Código de Retiro</span>
            <p className="text-base font-mono font-bold text-gray-800">{solicitud.codigo_entrega || `#${solicitud.id}`}</p>
          </div>
          <div>
            <span className="text-xs uppercase font-semibold text-gray-400">Empleado</span>
            <p className="text-sm font-semibold text-gray-700">{solicitud.empleado?.nombre}</p>
          </div>
        </div>

        {/* Artículos de la Entrega */}
        <div>
          <h3 className="text-xs uppercase font-semibold text-gray-400 mb-3">Productos que no fueron retirados</h3>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitud.detalles?.map((d: any) => (
                  <tr key={d.id} className="text-gray-700">
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      <div className="flex items-center flex-wrap">
                        <span className="font-mono text-gray-400 mr-2 bg-gray-50 px-2 py-0.5 border border-gray-150 rounded text-[10px] flex-shrink-0">
                          {d.producto_codigo}
                        </span>
                        <span className="text-gray-850">
                          {d.producto_nombre}
                          {d.producto_descripcion && (
                            <span className="text-[11px] text-gray-400 font-normal ml-1">
                              , {d.producto_descripcion}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{d.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Fotografía de Evidencia */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider">Fotografía de Evidencia</label>
            <p className="text-[10px] text-gray-450 leading-normal">
              Tome una foto de evidencia que demuestre que el pedido no se retiró o que el producto fue devuelto a los anaqueles del stock.
            </p>
            
            <div className="mt-1">
              {!fotoUrl ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-455 bg-gray-50 rounded-xl p-6 cursor-pointer transition select-none">
                  <BsCamera className="text-3xl text-gray-400" />
                  <span className="text-xs font-bold text-gray-700 mt-2">Tomar Foto de Evidencia</span>
                  <span className="text-[9px] text-gray-400 mt-1">Presiona para abrir la cámara</span>
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
                      alt="Evidencia No Entregado"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-black/60 px-3 py-1.5 rounded-lg border border-white/20">Evidencia lista</span>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none">
                    <BsArrowClockwise /> Cambiar Foto
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

          {/* Observaciones */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-750 uppercase tracking-wider">Observaciones / Justificación</label>
            <textarea
              placeholder="Detalla por qué no se entregó el pedido (ej. El empleado no retiró en la fecha establecida, etc.)"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-750 placeholder-gray-400 focus:outline-none focus:border-gray-500 resize-none font-sans"
              rows={3}
              required
            />
          </div>

          {mensaje && (
            <div className="p-4 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-250 text-emerald-800 flex items-center gap-1.5">
              <BsCheckCircle className="text-sm shrink-0" />
              {mensaje}
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl text-xs font-semibold bg-red-50 border border-red-250 text-red-850">
              {error}
            </div>
          )}

          {/* Confirmación */}
          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/entregas')}
              className="px-5 py-3 border border-gray-300 hover:bg-gray-55 text-gray-600 rounded-xl text-xs font-bold transition flex-1 sm:flex-initial"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!fotoUrl || subiendoFoto || !observaciones.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl text-xs font-bold transition shadow-md shadow-red-600/10 active:scale-95"
            >
              Confirmar
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
