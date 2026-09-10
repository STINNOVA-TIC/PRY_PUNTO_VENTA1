import React, { useState, useEffect } from 'react';
import { usuariosAPI, UsuarioOperador, PermisoItemUsuario } from '../../api/usuarios.api';
import { empleadosAPI } from '../../api/empleados.api';
import { Empleado } from '../../types';
import { ModalFormulario, CampoFormulario } from '../common/ModalFormulario';
import { BotonRecargar } from '../common/BotonRecargar';
import { BotonAccion } from '../common/BotonAccion';
import { Paginacion } from '../common/Paginacion';
import { SearchAndFilterBar } from '../common/SearchAndFilterBar';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';
import { BsKey, BsCheck2Circle, BsXCircle, BsShieldCheck } from 'react-icons/bs';

export const PanelAdminUsuarios: React.FC = () => {
  const { hasPermission, user } = useAuth();
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

  // Modal de Permisos Personalizados
  const [isPermisosModalAbierto, setIsPermisosModalAbierto] = useState(false);
  const [usuarioPermisosSelected, setUsuarioPermisosSelected] = useState<UsuarioOperador | null>(null);
  const [permisosUsuario, setPermisosUsuario] = useState<PermisoItemUsuario[]>([]);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);
  const [filtroModuloPermiso, setFiltroModuloPermiso] = useState<string>('TODOS');
  const [busquedaPermiso, setBusquedaPermiso] = useState<string>('');

  const canManageUserPermissions = () => {
    if (user?.rol?.nombre === 'admin') return true;
    return hasPermission('roles.editar') || hasPermission('roles.crear') || hasPermission('usuarios.editar');
  };

  const canViewUserPermissions = () => {
    if (user?.rol?.nombre === 'admin') return true;
    return hasPermission('roles.ver') || hasPermission('roles.crear') || hasPermission('roles.editar') || hasPermission('usuarios.editar') || hasPermission('usuarios.ver');
  };

  // Paginación de operadores
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRol, setFilterRol] = useState<number | 'ALL'>('ALL');
  const [filterEstado, setFilterEstado] = useState<'ALL' | 'activo' | 'inactivo'>('ALL');
  const [sortBy, setSortBy] = useState<'nombre' | 'email' | 'rol'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const usuariosFiltrados = React.useMemo(() => {
    return usuarios
      .filter((u) => {
        const query = searchQuery.toLowerCase().trim();
        const nombre = `${u.nombre} ${u.email} ${u.rol?.nombre || ''} ${u.empleado ? u.empleado.nombre : ''}`.toLowerCase();
        if (query && !nombre.includes(query)) return false;

        if (filterRol !== 'ALL' && u.rol?.id !== filterRol) return false;
        if (filterEstado === 'activo' && !u.activo) return false;
        if (filterEstado === 'inactivo' && u.activo) return false;

        return true;
      })
      .sort((a, b) => {
        const valueA = (sortBy === 'email' ? a.email : sortBy === 'rol' ? a.rol?.nombre : a.nombre) || '';
        const valueB = (sortBy === 'email' ? b.email : sortBy === 'rol' ? b.rol?.nombre : b.nombre) || '';
        return valueA.localeCompare(valueB, 'es', { sensitivity: 'base' }) * (sortOrder === 'asc' ? 1 : -1);
      });
  }, [usuarios, searchQuery, filterRol, filterEstado, sortBy, sortOrder]);

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

      try {
        const rolRes = await usuariosAPI.getRoles();
        setRoles(rolRes.data);
      } catch (e) {
        console.warn('No se pudieron cargar roles:', e);
      }

      try {
        const empRes = await empleadosAPI.getAll();
        setEmpleados(empRes.data);
      } catch (e) {
        console.warn('No se pudieron cargar empleados vinculados:', e);
      }
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

  // Abrir modal de permisos personalizados
  const handleOpenPermisos = async (u: UsuarioOperador) => {
    setUsuarioPermisosSelected(u);
    setIsPermisosModalAbierto(true);
    setLoadingPermisos(true);
    setFiltroModuloPermiso('TODOS');
    setBusquedaPermiso('');

    try {
      const res = await usuariosAPI.getUserPermissions(u.id);
      setPermisosUsuario(res.data);
    } catch (err) {
      console.error('Error al cargar permisos del usuario:', err);
      setError('No se pudieron obtener los permisos del usuario');
    } finally {
      setLoadingPermisos(false);
    }
  };

  const togglePermiso = (permisoId: number) => {
    if (!canManageUserPermissions()) return;
    setPermisosUsuario(prev => prev.map(p => {
      if (p.id === permisoId) {
        return { ...p, activo: !p.activo };
      }
      return p;
    }));
  };

  const handleQuitarTodosLosPermisos = () => {
    if (!canManageUserPermissions()) return;
    setPermisosUsuario(prev => prev.map(p => ({ ...p, activo: false })));
  };

  const handleGuardarPermisosPersonalizados = async () => {
    if (!usuarioPermisosSelected || !canManageUserPermissions()) return;
    try {
      setGuardandoPermisos(true);
      const cambios = permisosUsuario.map(p => ({
        permiso_id: p.id,
        activo: p.activo
      }));
      await usuariosAPI.saveUserPermissions(usuarioPermisosSelected.id, cambios);
      setMensaje(`Permisos de ${usuarioPermisosSelected.nombre} actualizados con éxito.`);
      setIsPermisosModalAbierto(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar permisos personalizados');
    } finally {
      setGuardandoPermisos(false);
    }
  };

  const camposOperador: CampoFormulario[] = [
    {
      name: 'empleado_id',
      label: 'Colaborador vinculado',
      tipo: 'select',
      placeholder: 'Selecciona un colaborador...',
      colSpan: 2,
      required: true,
      opciones: empleados
        .filter(emp => !usuarios.some(u => u.empleado?.id === emp.id && u.id !== editingUsuario?.id))
        .map((emp) => ({ value: emp.id, label: `${emp.nombre} ${emp.apellido} (Ced: ${emp.codigo_empleado})` })),
      completarAlCambiar: (empleadoId) => {
        const empleado = empleados.find(emp => emp.id === Number(empleadoId));
        return empleado
          ? { nombre: `${empleado.nombre} ${empleado.apellido}`.trim(), email: empleado.email || '' }
          : { nombre: '', email: '' };
      }
    },
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
    if (!valores.nombre || !valores.email || (!editingUsuario && !valores.password) || !valores.rol_id || !valores.empleado_id) {
      throw new Error('Nombre, email, contraseña (para nuevos), rol y colaborador son requeridos.');
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

  // Módulos únicos para filtrar dentro del modal de permisos
  const modulosDisponibles = React.useMemo(() => {
    const setMod = new Set<string>();
    permisosUsuario.forEach(p => setMod.add(p.modulo_nombre));
    return Array.from(setMod);
  }, [permisosUsuario]);

  const permisosFiltradosModal = React.useMemo(() => {
    return permisosUsuario.filter(p => {
      if (filtroModuloPermiso !== 'TODOS' && p.modulo_nombre !== filtroModuloPermiso) return false;
      if (busquedaPermiso) {
        const q = busquedaPermiso.toLowerCase();
        return p.nombre.toLowerCase().includes(q) || p.clave.toLowerCase().includes(q) || (p.descripcion && p.descripcion.toLowerCase().includes(q));
      }
      return true;
    });
  }, [permisosUsuario, filtroModuloPermiso, busquedaPermiso]);

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
          <h1 className="text-xl font-bold text-gray-800">Administración de Operadores</h1>
          <p className="text-xs text-gray-500 mt-1">Gestión de accesos, perfiles de sistema y asignación de roles</p>
        </div>
        <div className="flex items-center gap-2">
          <BotonRecargar onRefresh={cargarDatos} loading={loading} />
          {hasPermission('usuarios.crear') && (
            <button
              onClick={handleCreateNewClick}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              Registrar Operador
            </button>
          )}
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
        sortOptions={[
          { label: 'Ordenar por: Nombre', value: 'nombre' },
          { label: 'Ordenar por: Email', value: 'email' },
          { label: 'Ordenar por: Rol', value: 'rol' }
        ]}
        sortValue={sortBy}
        onSortValueChange={(val) => setSortBy(val as 'nombre' | 'email' | 'rol')}
        sortOrder={sortOrder}
        onSortOrderChange={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
      />

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
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400 font-medium">
                    No se encontraron operadores que coincidan con los filtros.
                  </td>
                </tr>
              ) : usuariosPaginados.map((u) => (
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
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      u.activo
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-red-50 text-red-650 border-red-100'
                    }`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-2 justify-end items-center">
                      {canViewUserPermissions() && (
                        <button
                          onClick={() => handleOpenPermisos(u)}
                          title={canManageUserPermissions() ? "Personalizar permisos de este usuario" : "Ver permisos de este usuario"}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition"
                        >
                          <BsKey className="h-3.5 w-3.5" />
                          Permisos
                        </button>
                      )}
                      {(user?.rol?.nombre === 'admin' || hasPermission('usuarios.editar')) && (
                        <BotonAccion
                          tipo="editar"
                          onClick={() => handleEditClick(u)}
                        />
                      )}
                      {(user?.rol?.nombre === 'admin' || hasPermission('usuarios.eliminar')) && (
                        <BotonAccion
                          tipo="eliminar"
                          onClick={() => handleDelete(u.id)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Paginacion
          currentPage={currentPage}
          totalItems={usuariosFiltrados.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
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

      {/* MODAL INTERACTIVO DE PERMISOS PERSONALIZADOS */}
      {isPermisosModalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            {/* Cabecera */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <BsShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">
                    Personalización de Permisos: {usuarioPermisosSelected?.nombre}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Roles base: {(usuarioPermisosSelected?.roles || []).map(r => r.nombre).join(', ') || usuarioPermisosSelected?.rol?.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPermisosModalAbierto(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Filtros dentro del modal */}
            <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-center justify-between bg-white">
              <div className="flex gap-1 overflow-x-auto py-1">
                <button
                  onClick={() => setFiltroModuloPermiso('TODOS')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    filtroModuloPermiso === 'TODOS'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos los Módulos
                </button>
                {modulosDisponibles.map(mod => (
                  <button
                    key={mod}
                    onClick={() => setFiltroModuloPermiso(mod)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      filtroModuloPermiso === mod
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {mod}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Filtrar permiso..."
                value={busquedaPermiso}
                onChange={e => setBusquedaPermiso(e.target.value)}
                className="px-3 py-1 text-xs border border-gray-200 rounded-lg w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Lista de permisos interactiva */}
            <div className="p-6 overflow-y-auto flex-1 space-y-2">
              {loadingPermisos ? (
                <div className="py-12 text-center text-xs text-gray-400 font-medium">
                  Cargando permisos del usuario...
                </div>
              ) : permisosFiltradosModal.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No hay permisos que coincidan con el filtro.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {permisosFiltradosModal.map(perm => (
                    <div
                      key={perm.id}
                      onClick={() => togglePermiso(perm.id)}
                      className={`p-3 rounded-xl border transition flex items-start justify-between gap-2 select-none ${
                        canManageUserPermissions() ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        perm.activo
                          ? 'bg-emerald-50/40 border-emerald-200' + (canManageUserPermissions() ? ' hover:bg-emerald-50/70' : '')
                          : 'bg-gray-50/60 border-gray-200 opacity-65' + (canManageUserPermissions() ? ' hover:opacity-90' : '')
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-gray-800">{perm.nombre}</span>
                          <span className="text-[9px] font-mono text-gray-400 bg-white px-1.5 py-0.5 rounded border">
                            {perm.modulo_nombre}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{perm.descripcion || perm.clave}</p>
                        {perm.heredado_rol && (
                          <span className="inline-block text-[9px] text-blue-600 font-medium">
                            • Heredado de rol
                          </span>
                        )}
                      </div>
                      <div className="pt-0.5">
                        {perm.activo ? (
                          <BsCheck2Circle className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <BsXCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pie del modal con acciones */}
            <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                Total activos: <strong className="text-gray-800">{permisosUsuario.filter(p => p.activo).length}</strong> de {permisosUsuario.length}
                {!canManageUserPermissions() && (
                  <span className="ml-2 text-amber-600 font-medium">(Solo lectura)</span>
                )}
              </div>
              <div className="flex gap-2">
                {canManageUserPermissions() && (
                  <button
                    type="button"
                    onClick={handleQuitarTodosLosPermisos}
                    disabled={guardandoPermisos || !permisosUsuario.some(p => p.activo)}
                    className="px-4 py-2 border border-red-200 text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Quitar todos
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsPermisosModalAbierto(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold transition"
                >
                  {canManageUserPermissions() ? 'Cancelar' : 'Cerrar'}
                </button>
                {canManageUserPermissions() && (
                  <button
                    type="button"
                    onClick={handleGuardarPermisosPersonalizados}
                    disabled={guardandoPermisos}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {guardandoPermisos ? 'Guardando...' : 'Guardar Permisos'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
