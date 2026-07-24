import React, { useState, useEffect } from 'react';
import { usuariosAPI, UsuarioOperador } from '../../api/usuarios.api';
import { empleadosAPI } from '../../api/empleados.api';
import { Empleado } from '../../types';
import { BotonRecargar } from '../common/BotonRecargar';

export const PanelAdminUsuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioOperador[]>([]);
  const [roles, setRoles] = useState<{ id: number; nombre: string; descripcion: string }[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Formulario Operador
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRol, setSelectedRol] = useState<number | ''>('');
  const [selectedEmpleado, setSelectedEmpleado] = useState<number | ''>('');
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');
      
      const userRes = await usuariosAPI.getAll();
      setUsuarios(userRes.data);

      const rolRes = await usuariosAPI.getRoles();
      setRoles(rolRes.data);

      const empRes = await empleadosAPI.getAll();
      setEmpleados(empRes.data);
    } catch (err) {
      console.error('Error cargando operadores:', err);
      setError('No se pudo cargar la lista de operadores del sistema.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (u: UsuarioOperador) => {
    setEditingId(u.id);
    setNombre(u.nombre);
    setEmail(u.email);
    setPassword('');
    setSelectedRol(u.rol ? u.rol.id : '');
    setSelectedEmpleado(u.empleado ? u.empleado.id : '');
    setActivo(u.activo);
    setShowForm(true);
  };

  const handleCreateNewClick = () => {
    setEditingId(null);
    setNombre('');
    setEmail('');
    setPassword('');
    setSelectedRol(roles.length > 0 ? roles[0].id : '');
    setSelectedEmpleado('');
    setActivo(true);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!nombre || !email || (!editingId && !password) || !selectedRol) {
      setError('Nombre, email, contraseña (para nuevos) y rol son requeridos.');
      return;
    }

    const payload = {
      nombre,
      email,
      password: password || undefined,
      rol_id: Number(selectedRol),
      empleado_id: selectedEmpleado ? Number(selectedEmpleado) : null,
      activo
    };

    try {
      if (editingId) {
        await usuariosAPI.update(editingId, payload);
        setMensaje('Operador actualizado exitosamente.');
      } else {
        await usuariosAPI.create(payload);
        setMensaje('Operador creado exitosamente.');
      }
      setShowForm(false);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el operador');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar o inactivar a este operador del sistema?')) return;

    try {
      const res = await usuariosAPI.delete(id);
      setMensaje(res.message || 'Operador procesado correctamente.');
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar operador');
    }
  };

  if (loading && usuarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        <p className="text-sm text-gray-500 font-medium">Cargando operadores del sistema...</p>
      </div>
    );
  }

  return (
    <div className="font-sans space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Operadores del Sistema</h1>
          <p className="text-xs text-gray-500 mt-1">Gestión de accesos, perfiles de sistema y asignación de roles</p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <BotonRecargar onRefresh={cargarDatos} loading={loading} />
            <button
              onClick={handleCreateNewClick}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              Nuevo Operador
            </button>
          </div>
        )}
      </div>

      {mensaje && (
        <div className="p-4 bg-gray-50 border border-gray-200 text-gray-800 rounded-lg text-sm font-medium">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* FORMULARIO */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-2xl space-y-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
            {editingId ? 'Editar Operador' : 'Registrar Nuevo Operador'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre de Usuario</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Carlos Martínez"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email / Login</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos.martinez@empresa.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingId ? 'Dejar en blanco para no cambiar' : 'Ingresa contraseña'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                required={!editingId}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rol de Acceso</label>
              <select
                value={selectedRol}
                onChange={(e) => setSelectedRol(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none"
                required
              >
                <option value="">Selecciona Rol...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre.toUpperCase()} - {r.descripcion}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Vincular a un Colaborador de Nómina (Opcional)</label>
            <select
              value={selectedEmpleado}
              onChange={(e) => setSelectedEmpleado(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none"
            >
              <option value="">Ninguno / Usuario Operador General</option>
              {empleados.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido} (Ced: {emp.codigo_empleado})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="usuario_activo"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="rounded text-gray-800"
            />
            <label htmlFor="usuario_activo" className="text-xs text-gray-600 font-semibold select-none">
              Usuario Habilitado / Activo
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold transition"
            >
              Guardar Operador
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-250 text-gray-650 rounded-lg text-xs font-semibold transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* LISTADO */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                <th className="px-5 py-3.5">Operador</th>
                <th className="px-5 py-3.5">Email / Login</th>
                <th className="px-5 py-3.5">Rol Asignado</th>
                <th className="px-5 py-3.5">Colaborador Vinculado</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4 font-bold text-gray-800">{u.nombre}</td>
                  <td className="px-5 py-4 font-mono text-gray-400">{u.email}</td>
                  <td className="px-5 py-4">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border bg-gray-50 text-gray-650 border-gray-200">
                      {u.rol?.nombre}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 font-medium">
                    {u.empleado ? u.empleado.nombre : 'Sin vincular'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                      u.activo
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleEditClick(u)}
                        className="px-2.5 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg font-semibold text-[10px] transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-650 rounded-lg font-semibold text-[10px] transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
