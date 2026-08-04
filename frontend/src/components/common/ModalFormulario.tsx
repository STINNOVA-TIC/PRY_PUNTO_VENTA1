import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../api/admin.api';
import { BsX } from 'react-icons/bs';

export interface CampoFormulario {
  name: string;
  label: string;
  tipo: 'texto' | 'email' | 'password' | 'numero' | 'select' | 'textarea' | 'checkbox' | 'foto';
  placeholder?: string;
  opciones?: { value: string | number; label: string }[];
  required?: boolean;
  colSpan?: 1 | 2 | 3;
  fotoCarpeta?: 'empleado' | 'producto' | 'entrega' | 'firma' | 'firmas';
  fotoAviso?: string;
}

interface ModalFormularioProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  campos: CampoFormulario[];
  valoresIniciales?: Record<string, any>;
  onGuardar: (valores: Record<string, any>) => Promise<void>;
  botonGuardarLabel?: string;
}

const TIPOS_COMUNES = {
  texto: 'text',
  email: 'email',
  password: 'password',
  numero: 'number',
} as const;

export const ModalFormulario: React.FC<ModalFormularioProps> = ({
  isOpen,
  onClose,
  titulo,
  campos,
  valoresIniciales,
  onGuardar,
  botonGuardarLabel = 'Guardar Datos',
}) => {
  const [valores, setValores] = useState<Record<string, any>>({});
  const [urlOption, setUrlOption] = useState<'url' | 'file'>('url');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen || prevIsOpenRef.current) return;
    prevIsOpenRef.current = isOpen;

    const iniciales: Record<string, any> = {};
    campos.forEach((campo) => {
      iniciales[campo.name] = valoresIniciales?.[campo.name] !== undefined
        ? valoresIniciales[campo.name]
        : (campo.tipo === 'checkbox' ? false : '');
    });
    setValores(iniciales);
    setUrlOption('url');
    setError('');
    setSaving(false);
  }, [isOpen, campos, valoresIniciales]);

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const setValor = (name: string, value: any) => {
    setValores((prev) => ({ ...prev, [name]: value }));
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, campo: CampoFormulario) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setSubiendoFoto(true);
        setError('');
        const res = await adminAPI.uploadPhoto(file, campo.fotoCarpeta || 'empleado');
        setValor(campo.name, res.url);
      } catch (err) {
        console.error('Error al subir foto:', err);
        setError('Error al subir la fotografía.');
      } finally {
        setSubiendoFoto(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    for (const campo of campos) {
      if (campo.required && (valores[campo.name] === '' || valores[campo.name] === undefined || valores[campo.name] === null)) {
        setError(`${campo.label} es un campo requerido.`);
        return;
      }
    }

    try {
      setSaving(true);
      await onGuardar(valores);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar los datos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Cabecera */}
        <div className="bg-gray-50 border-b border-gray-150 px-6 py-4 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{titulo}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl font-bold transition flex items-center justify-center"
            aria-label="Cerrar"
          >
            <BsX className="text-2xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campos.map((campo) => {
              const spanClass = campo.colSpan === 3
                ? 'sm:col-span-2'
                : campo.colSpan === 1
                ? 'sm:col-span-1'
                : campo.colSpan === 2
                ? 'sm:col-span-2'
                : '';

              if (campo.tipo === 'checkbox') {
                return (
                  <div key={campo.name} className={`${spanClass} flex items-center gap-2 pt-1`}>
                    <input
                      type="checkbox"
                      id={`modal_${campo.name}`}
                      checked={!!valores[campo.name]}
                      onChange={(e) => setValor(campo.name, e.target.checked)}
                      className="rounded text-gray-800"
                    />
                    <label htmlFor={`modal_${campo.name}`} className="text-xs text-gray-600 font-semibold select-none">
                      {campo.label}
                    </label>
                  </div>
                );
              }

              if (campo.tipo === 'select') {
                return (
                  <div key={campo.name} className={spanClass}>
                    <label className="block text-xs text-gray-500 mb-1">{campo.label}</label>
                    <select
                      value={valores[campo.name] ?? ''}
                      onChange={(e) => setValor(campo.name, e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none"
                      required={campo.required}
                    >
                      <option value="">{campo.placeholder || 'Selecciona...'}</option>
                      {campo.opciones?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (campo.tipo === 'foto') {
                return (
                  <div key={campo.name} className={`${spanClass} space-y-2`}>
                    <label className="block text-xs font-semibold text-gray-500">{campo.label}</label>
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 font-medium text-gray-650">
                        <input
                          type="radio"
                          name={`photo_${campo.name}`}
                          checked={urlOption === 'url'}
                          onChange={() => setUrlOption('url')}
                        />
                        Dirección URL (Imagen Web)
                      </label>
                      <label className="flex items-center gap-1.5 font-medium text-gray-650">
                        <input
                          type="radio"
                          name={`photo_${campo.name}`}
                          checked={urlOption === 'file'}
                          onChange={() => setUrlOption('file')}
                        />
                        Subir o Tomar Foto (Cámara)
                      </label>
                    </div>

                    {urlOption === 'url' ? (
                      <input
                        type="text"
                        value={valores[campo.name] || ''}
                        onChange={(e) => setValor(campo.name, e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                      />
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFotoUpload(e, campo)}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                      />
                    )}
                    {campo.fotoAviso && <p className="text-[10px] text-gray-400">{campo.fotoAviso}</p>}
                    {subiendoFoto && <p className="text-[10px] text-gray-400 animate-pulse font-medium">Subiendo fotografía...</p>}
                    {valores[campo.name] && (
                      <div className="pt-1">
                        <p className="text-[10px] text-emerald-700 font-semibold mb-1">Vista previa:</p>
                        <img src={valores[campo.name]} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      </div>
                    )}
                  </div>
                );
              }

              if (campo.tipo === 'textarea') {
                return (
                  <div key={campo.name} className={spanClass}>
                    <label className="block text-xs text-gray-500 mb-1">{campo.label}</label>
                    <textarea
                      value={valores[campo.name] ?? ''}
                      onChange={(e) => setValor(campo.name, e.target.value)}
                      placeholder={campo.placeholder}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none resize-none"
                      required={campo.required}
                    />
                  </div>
                );
              }

              return (
                <div key={campo.name} className={spanClass}>
                  <label className="block text-xs text-gray-500 mb-1">{campo.label}</label>
                  <input
                    type={TIPOS_COMUNES[campo.tipo] || 'text'}
                    value={valores[campo.name] ?? ''}
                    onChange={(e) => setValor(campo.name, e.target.value)}
                    placeholder={campo.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                    required={campo.required}
                  />
                </div>
              );
            })}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-250 text-gray-650 rounded-lg text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              {saving ? 'Guardando...' : botonGuardarLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
