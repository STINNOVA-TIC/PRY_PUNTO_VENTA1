import React, { useEffect, useState } from 'react';
import { BsX } from 'react-icons/bs';
import { activosTiAPI, RegistroActivoTI } from '../../api/activosTi.api';

interface ModalActivosColaboradorProps {
  isOpen: boolean;
  onClose: () => void;
  cedula: string;
  nombre: string;
}

const formatearFecha = (fecha: string | null) =>
  fecha ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES') : '—';

export const ModalActivosColaborador: React.FC<ModalActivosColaboradorProps> = ({ isOpen, onClose, cedula, nombre }) => {
  const [registros, setRegistros] = useState<RegistroActivoTI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !cedula) return;
    let cancelado = false;

    const cargar = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await activosTiAPI.getPorColaborador(cedula);
        if (!cancelado) setRegistros(res.data || []);
      } catch (err) {
        console.error('Error cargando activos del colaborador:', err);
        if (!cancelado) {
          setError('No se pudieron cargar los activos del colaborador.');
          setRegistros([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    cargar();
    return () => { cancelado = true; };
  }, [isOpen, cedula]);

  if (!isOpen) return null;

  const enPoder = registros.reduce((suma, r) => suma + (r.ingresados ?? r.total ?? 0) - (r.salidos ?? 0), 0);

  return (
    <div
      className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-xl w-full max-w-4xl max-h-[85vh] shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex justify-between items-start">
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Activos TI</h2>
            <p className="text-xs text-gray-500 mt-0.5">{nombre} · CI {cedula}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
            <BsX className="text-2xl" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 overflow-y-auto space-y-4">
          {loading ? (
            <p className="text-center py-10 text-xs text-gray-400">Cargando...</p>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{error}</div>
          ) : registros.length === 0 ? (
            <p className="text-center py-10 text-xs text-gray-400">Este colaborador no tiene activos registrados.</p>
          ) : (
            <>
              <div className="flex gap-3 text-xs">
                <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-semibold">Registros: {registros.length}</span>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">En su poder: {enPoder}</span>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                      <th className="px-3 py-2.5">Acta</th>
                      <th className="px-3 py-2.5">Equipo / Material</th>
                      <th className="px-3 py-2.5">Serial - Marca</th>
                      <th className="px-3 py-2.5">Condición</th>
                      <th className="px-3 py-2.5 text-center">Ing. / Sal.</th>
                      <th className="px-3 py-2.5">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {registros.map((r) => (
                      <tr key={r.id} className="align-top">
                        <td className="px-3 py-2.5 font-mono font-bold text-gray-700">{r.acta_numero ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-gray-800 block">{r.material || r.equipo_tipo || '—'}</span>
                          {r.descripcion && <span className="text-[10px] text-gray-400 block">{r.descripcion}</span>}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-gray-600">{r.serial_marca || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600">{r.condicion || '—'}</td>
                        <td className="px-3 py-2.5 text-center font-mono">{r.ingresados ?? 0} / {r.salidos ?? 0}</td>
                        <td className="px-3 py-2.5 text-gray-500">{formatearFecha(r.fecha_acta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};