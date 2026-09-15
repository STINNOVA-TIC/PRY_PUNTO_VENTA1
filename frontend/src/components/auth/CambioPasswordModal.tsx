import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BsEye, BsEyeSlash } from 'react-icons/bs';

interface Props { obligatorio: boolean; onClose: () => void; }

const requisitos = 'Mínimo 6 caracteres, una mayúscula, una minúscula, un número y un símbolo.';

export const CambioPasswordModal: React.FC<Props> = ({ obligatorio, onClose }) => {
  const { changePassword } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const campoPassword = (
    etiqueta: string,
    valor: string,
    setValor: (valor: string) => void,
    visible: boolean,
    alternar: () => void
  ) => (
    <label className="block text-xs font-semibold text-gray-700">
      {etiqueta}
      <span className="relative mt-1 block">
        <input
          required
          type={visible ? 'text' : 'password'}
          value={valor}
          onChange={e => setValor(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10"
        />
        <button
          type="button"
          onClick={alternar}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-label={visible ? `Ocultar ${etiqueta.toLowerCase()}` : `Mostrar ${etiqueta.toLowerCase()}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
        >
          {visible ? <BsEyeSlash className="h-4 w-4" /> : <BsEye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/[A-ZÁÉÍÓÚÑ]/.test(nueva) || !/[a-záéíóúñ]/.test(nueva) || !/\d/.test(nueva) || !/[^A-Za-zÁÉÍÓÚáéíóúÑñ\d\s]/.test(nueva) || nueva.length < 6) {
      setError(requisitos);
      return;
    }
    if (nueva === actual) { setError('La nueva contraseña no puede ser igual a la actual.'); return; }
    if (nueva !== confirmacion) { setError('La confirmación no coincide.'); return; }
    try {
      setGuardando(true);
      await changePassword(actual, nueva);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'No se pudo cambiar la contraseña.');
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <form onSubmit={guardar} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{obligatorio ? 'Cambia tu contraseña para continuar' : 'Cambiar contraseña'}</h2>
          <p className="text-xs text-gray-500 mt-1">{requisitos}</p>
        </div>
        {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs p-3">{error}</div>}
        {campoPassword('Contraseña actual', actual, setActual, mostrarActual, () => setMostrarActual(value => !value))}
        {campoPassword('Nueva contraseña', nueva, setNueva, mostrarNueva, () => setMostrarNueva(value => !value))}
        {campoPassword('Confirmar nueva contraseña', confirmacion, setConfirmacion, mostrarConfirmacion, () => setMostrarConfirmacion(value => !value))}
        <div className="flex justify-end gap-2 pt-2">
          {!obligatorio && <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold">Cancelar</button>}
          <button disabled={guardando} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold disabled:opacity-50">{guardando ? 'Guardando...' : 'Actualizar contraseña'}</button>
        </div>
      </form>
    </div>
  );
};
