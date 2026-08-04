import React, { useState, useEffect } from 'react';
import { usuariosAPI, UsuarioOperador } from '../../api/usuarios.api';
import { empleadosAPI } from '../../api/empleados.api';
import { Empleado } from '../../types';
import { ModalFormulario, CampoFormulario } from '../common/ModalFormulario';
import { BotonRecargar } from '../common/BotonRecargar';
import { BotonAccion } from '../common/BotonAccion';
import { Paginacion } from '../common/Paginacion';
import { SearchAndFilterBar } from '../common/SearchAndFilterBar';
import { useModal } from '../../context/ModalContext';

export const PanelAdminUsuarios: React.FC = () => {
  const { showConfirm } = useModal();
  const [usuarios, setUsuarios] = useState<UsuarioOperador[]>([]);
  const [roles, setRoles] = useState<{ id: number; nombre: string; descripcion: string }[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Modal Operador
  const [isModalAbierto, setIsModalAbierto] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<UsuarioOperador | null>(null);

  // Paginación de operadores
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRol, setFilterRol] = useState<number | 'ALL'>('ALL');
  const [filterEstado, setFilterEstado] = useState<'ALL' | 'activo' | 'inactivo'>('ALL');

  const usuariosFiltrados = React.useMemo(() => {
    return usuarios.filter((u) => {
      const query = searchQuery.toLowerCase().trim();
      const nombre = `${u.nombre} ${u.email} ${u.rol?.nombre || ''} ${u.empleado ? u.empleado.nombre : ''}`.toLowerCase();
      if (query && !nombre.includes(query)) return false;

      if (filterRol !== 'ALL' && u.rol?.id !== filterRol) return false;
      if (filterEstado === 'activo' && !u.activo) return false;
      if (filterEstado === 'inactivo' && u.activo) return false;

      return true;
    });
  }, [usuarios, searchQuery, filterRol, filterEstado]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRol, filterEstado]);

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
    setEditingUsuario(u);
    setIsModalAbierto(true);
  };

  const handleCreateNewClick = () => {
    setEditingUsuario(null);
    setIsModalAbierto(true);
  };

  const camposOperador: CampoFormulario[] = [
    { name: 'nombre', label: 'Nombre de Usuario', tipo: 'texto', placeholder: 'Ej. Carlos Martínez', required: true },
    { name: 'email', label: 'Email / Login', tipo: 'email', placeholder: 'carlos.martinez@empresa.com', required: true },
    {
      name: 'password',
      label: 'Contraseña',
      tipo: 'password',
      placeholder: 'Ingresa contraseña'
    },
    {
      name: 'rol_id',
      label: 'Rol de Acceso',
      tipo: 'select',
      placeholder: 'Selecciona Rol...',
      opciones: roles.map((r) => ({ value: r.id, label: `${r.nombre.toUpperCase()} - ${r.descripcion}` })),
      required: true
    },
    {
      name: 'empleado_id',
      label: 'Vincular a un Colaborador de Nómina (Opcional)',
      tipo: 'select',
      placeholder: 'Ninguno / Usuario Operador General',
      colSpan: 2,
      opciones: empleados.map((emp) => ({ value: emp.id, label: `${emp.nombre} ${emp.apellido} (Ced: ${emp.codigo_empleado})` }))
    },
    { name: 'activo', label: 'Usuario Habilitado / Activo', tipo: 'checkbox' }
  ];

  const valoresInicialesOperador = (u: UsuarioOperador | null) => ({
    nombre: u?.nombre || '',
    email: u?.email || '',
    password: '',
    rol_id: u?.rol?.id || (roles.length > 0 ? roles[0].id : ''),
    empleado_id: u?.empleado?.id || '',
    activo: u?.activo !== undefined ? u.activo : true
  });

  const handleGuardarOperador = async (valores: Record<string, any>) => {
    if (!valores.nombre || !valores.email || (!editingUsuario && !valores.password) || !valores.rol_id) {
      throw new Error('Nombre, email, contraseña (para nuevos) y rol son requeridos.');
    }

    const payload = {
      nombre: valores.nombre,
      email: valores.email,
      password: valores.password || undefined,
      rol_id: Number(valores.rol_id),
      empleado_id: valores.empleado_id ? Number(valores.empleado_id) : null,
      activo: !!valores.activo
    };

    if (editingUsuario) {
      await usuariosAPI.update(editingUsuario.id, payload);
      setMensaje('Operador actualizado exitosamente.');
    } else {
      await usuariosAPI.create(payload);
      setMensaje('Operador creado exitosamente.');
    }
    setIsModalAbierto(false);
    cargarDatos();
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm({
      title: 'Confirmar Acción',
      message: '¿Estás seguro de eliminar o inactivar a este operador del sistema?',
      confirmLabel: 'Inactivar/Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;

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

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const usuariosPaginados = usuariosFiltrados.slice(startIndex, endIndex);

  return (
    <div className="font-sans space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Operadores del Sistema</h1>
          <p className="text-xs text-gray-500 mt-1">Gestión de accesos, perfiles de sistema y asignación de roles</p>
        </div>
        <div className="flex items-center gap-2">
          <BotonRecargar onRefresh={cargarDatos} loading={loading} />
          <button
            onClick={handleCreateNewClick}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            Nuevo Operador
          </button>
        </div>
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

      {/* BÚSQUEDA Y FILTROS */}
      <SearchAndFilterBar
        searchPlaceholder="Buscar por nombre, email, rol o colaborador..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalResults={usuariosFiltrados.length}
        totalCount={usuarios.length}
        resultsLabel="operadores"
        selectFilters={[
          {
            id: 'rol',
            placeholder: 'Todos los Roles',
            value: filterRol,
            onChange: (val) => setFilterRol(val === 'ALL' ? 'ALL' : Number(val)),
            options: roles.map((r) => ({ label: r.nombre, value: r.id }))
          },
          {
            id: 'estado',
            placeholder: 'Todos los Estados',
            value: filterEstado,
            onChange: (val) => setFilterEstado(val as any),
            options: [
              { label: 'Activo', value: 'activo' },
              { label: 'Inactivo', value: 'inactivo' }
            ]
          }
        ]}
      />

      {/* LISTADO */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {usuariosFiltrados.length === 0 ? (
            <p className="text-center py-12 text-xs text-gray-400 font-medium">No se encontraron operadores.</p>
          ) : (
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
              {usuariosPaginados.map((u) => (
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
                      <BotonAccion
                        tipo="editar"
                        onClick={() => handleEditClick(u)}
                      />
                      <BotonAccion
                        tipo="eliminar"
                        onClick={() => handleDelete(u.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>

        {usuariosFiltrados.length > 0 && (
        <Paginacion
          currentPage={currentPage}
          totalItems={usuariosFiltrados.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
        )}
      </div>

      <ModalFormulario
        isOpen={isModalAbierto}
        onClose={() => setIsModalAbierto(false)}
        titulo={editingUsuario ? 'Editar Operador' : 'Registrar Nuevo Operador'}
        campos={camposOperador}
        valoresIniciales={valoresInicialesOperador(editingUsuario)}
        onGuardar={handleGuardarOperador}
        botonGuardarLabel="Guardar Operador"
      />

    </div>
  );
};
