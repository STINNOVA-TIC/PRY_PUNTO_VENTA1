import React, { useState, useEffect } from 'react';
import { empleadosAPI } from '../../api/empleados.api';
import { Empleado } from '../../types';
import { ModalImportExport } from '../common/ModalImportExport';
import { ModalFormulario, CampoFormulario } from '../common/ModalFormulario';
import { BotonRecargar } from '../common/BotonRecargar';
import { BotonAccion } from '../common/BotonAccion';
import { Paginacion } from '../common/Paginacion';
import { useModal } from '../../context/ModalContext';

import { SearchAndFilterBar } from '../common/SearchAndFilterBar';

export const PanelAdminEmpleados: React.FC = () => {
  const { showConfirm } = useModal();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [departamentos, setDepartamentos] = useState<{ id: number; nombre: string }[]>([]);
  const [centrosCostos, setCentrosCostos] = useState<{ id: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal de registro / edición de colaborador
  const [isModalAbierto, setIsModalAbierto] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<any>(null);

  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Estados de búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState<number | 'ALL'>('ALL');
  const [filterCC, setFilterCC] = useState<number | 'ALL'>('ALL');
  const [filterEstado, setFilterEstado] = useState<'ALL' | 'activo' | 'inactivo'>('ALL');
  const [sortBy, setSortBy] = useState<'nombre' | 'codigo' | 'departamento' | 'cargo'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDept, filterCC, filterEstado]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');
      
      const empRes = await empleadosAPI.getAll();
      setEmpleados(empRes.data);

      const deptRes = await empleadosAPI.getDepartamentos();
      setDepartamentos(deptRes.data);

      const ccRes = await empleadosAPI.getCentrosCostos();
      setCentrosCostos(ccRes.data);
    } catch (err) {
      console.error('Error cargando empleados:', err);
      setError('No se pudo cargar la lista de colaboradores.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (emp: any) => {
    setEditingEmpleado(emp);
    setIsModalAbierto(true);
  };

  const handleCreateNewClick = () => {
    setEditingEmpleado(null);
    setIsModalAbierto(true);
  };

  const camposColaborador: CampoFormulario[] = [
    { name: 'cedula', label: 'Cédula / Documento', tipo: 'texto', placeholder: 'Ej. 1723456789', required: true },
    { name: 'email', label: 'Correo Electrónico (Email)', tipo: 'email', placeholder: 'ejemplo@empresa.com' },
    { name: 'nombre', label: 'Nombre', tipo: 'texto', placeholder: 'Nombres', required: true },
    { name: 'apellido', label: 'Apellido', tipo: 'texto', placeholder: 'Apellidos', required: true },
    { name: 'cargo', label: 'Cargo / Puesto', tipo: 'texto', placeholder: 'Ej. Vendedor' },
    {
      name: 'departamento_id',
      label: 'Departamento',
      tipo: 'select',
      opciones: departamentos.map((d) => ({ value: d.id, label: d.nombre }))
    },
    {
      name: 'centro_costos_id',
      label: 'Centro de Costos',
      tipo: 'select',
      opciones: centrosCostos.map((cc) => ({ value: cc.id, label: cc.nombre }))
    },
    {
      name: 'foto_perfil',
      label: 'Foto de Perfil del Colaborador',
      tipo: 'foto',
      fotoCarpeta: 'empleado',
      colSpan: 2,
      fotoAviso: 'Puedes ingresar una URL o subir/tomar una foto desde tu dispositivo.'
    },
    { name: 'activo', label: 'Colaborador Activo', tipo: 'checkbox' },
    { name: 'permitir_autoconsumo', label: 'Autorizar Autoconsumo (Consumo Interno)', tipo: 'checkbox' }
  ];

  const valoresInicialesColaborador = (emp: any) => ({
    cedula: emp?.codigo_empleado || '',
    nombre: emp?.nombre || '',
    apellido: emp?.apellido || '',
    email: emp?.email || '',
    cargo: emp?.cargo || '',
    foto_perfil: (emp?.foto_perfil || '').startsWith('https://ui-avatars') ? '' : (emp?.foto_perfil || ''),
    departamento_id: emp?.departamento_id || '',
    centro_costos_id: emp?.centro_costos_id || '',
    activo: emp?.activo !== undefined ? emp.activo : true,
    permitir_autoconsumo: emp?.permitir_autoconsumo || false
  });

  const handleGuardarColaborador = async (valores: Record<string, any>) => {
    const payload = {
      cedula: valores.cedula,
      nombre: valores.nombre,
      apellido: valores.apellido,
      email: valores.email || null,
      cargo: valores.cargo || null,
      foto_perfil: valores.foto_perfil || null,
      departamento_id: valores.departamento_id ? Number(valores.departamento_id) : null,
      centro_costos_id: valores.centro_costos_id ? Number(valores.centro_costos_id) : null,
      activo: !!valores.activo,
      permitir_autoconsumo: !!valores.permitir_autoconsumo
    };

    if (editingEmpleado) {
      await empleadosAPI.update(editingEmpleado.id, payload);
      setMensaje('Colaborador actualizado exitosamente.');
    } else {
      await empleadosAPI.create(payload);
      setMensaje('Colaborador creado exitosamente.');
    }
    setIsModalAbierto(false);
    cargarDatos();
  };

  const handleToggleActivo = async (emp: Empleado) => {
    const accion = emp.activo ? 'desactivar' : 'activar';
    const confirmed = await showConfirm({
      title: 'Confirmar Acción',
      message: `¿Estás seguro de ${accion} a este colaborador?`,
      confirmLabel: emp.activo ? 'Desactivar' : 'Activar',
      type: emp.activo ? 'danger' : 'warning'
    });
    if (!confirmed) return;

    try {
      await empleadosAPI.update(emp.id, {
        cedula: emp.codigo_empleado,
        nombre: emp.nombre,
        apellido: emp.apellido,
        email: emp.email || null,
        cargo: emp.cargo || null,
        foto_perfil: emp.foto_perfil?.startsWith('https://ui-avatars') ? null : (emp.foto_perfil || null),
        departamento_id: emp.departamento_id || null,
        centro_costos_id: emp.centro_costos_id || null,
        activo: !emp.activo
      });
      setMensaje(`Colaborador ${emp.activo ? 'desactivado' : 'activado'} exitosamente.`);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || `Error al ${accion} colaborador`);
    }
  };

  const columnsConfig = [
    { key: 'codigo_empleado', label: 'Cédula' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'email', label: 'Email' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'foto_perfil', label: 'Foto Perfil' },
    { key: 'departamento', label: 'Departamento' },
    { key: 'centro_costos', label: 'Centro de Costos' },
    { key: 'activo', label: 'Activo' },
  ];

  const handleImportColaboradores = async (importedRows: any[]) => {
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < importedRows.length; i++) {
      const row = importedRows[i];
      
      if (!row.codigo_empleado || !row.nombre || !row.apellido) {
        errors.push(`Fila ${i + 1}: Cédula, Nombre y Apellido son obligatorios.`);
        continue;
      }

      // Buscar departamento por nombre
      const foundDept = departamentos.find(
        (d) => d.nombre.toLowerCase().trim() === String(row.departamento || '').toLowerCase().trim()
      );

      // Buscar centro de costos por nombre
      const foundCC = centrosCostos.find(
        (cc) => cc.nombre.toLowerCase().trim() === String(row.centro_costos || '').toLowerCase().trim()
      );

      const isActive = row.activo !== undefined
        ? (String(row.activo).toLowerCase() === 'activo' ||
           String(row.activo).toLowerCase() === 'true' ||
           String(row.activo) === '1' ||
           row.activo === true ||
           String(row.activo).toLowerCase() === 'sí' ||
           String(row.activo).toLowerCase() === 'si')
        : true;

      try {
        await empleadosAPI.create({
          cedula: String(row.codigo_empleado),
          nombre: String(row.nombre),
          apellido: String(row.apellido),
          email: row.email ? String(row.email) : null,
          cargo: row.cargo ? String(row.cargo) : null,
          foto_perfil: row.foto_perfil ? String(row.foto_perfil) : null,
          departamento_id: foundDept ? Number(foundDept.id) : null,
          centro_costos_id: foundCC ? Number(foundCC.id) : null,
          activo: isActive
        });
        successCount++;
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Error desconocido';
        errors.push(`Fila ${i + 1} (${row.nombre} ${row.apellido}): ${msg}`);
      }
    }

    cargarDatos();
    return { successCount, errors };
  };

  if (loading && empleados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        <p className="text-sm text-gray-500 font-medium">Cargando nómina de colaboradores...</p>
      </div>
    );
  }

  return (
    <div className="font-sans space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Administración de Colaboradores</h1>
          <p className="text-xs text-gray-500 mt-1">Registro de empleados de la empresa y configuración de nómina</p>
        </div>
        <div className="flex items-center gap-2">
          <BotonRecargar onRefresh={cargarDatos} loading={loading} />
          <button
            type="button"
            onClick={() => setIsImportExportOpen(true)}
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-750 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            Importar / Exportar
          </button>
          <button
            onClick={handleCreateNewClick}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            Registrar Colaborador
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

      {/* Filtros y Buscador usando SearchAndFilterBar */}
      {(() => {
        const filtered = empleados
          .filter((emp) => {
            const query = searchTerm.toLowerCase().trim();
            if (query) {
              const matchQuery =
                emp.nombre.toLowerCase().includes(query) ||
                emp.apellido.toLowerCase().includes(query) ||
                emp.codigo_empleado.toLowerCase().includes(query) ||
                `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(query) ||
                (emp.cargo && emp.cargo.toLowerCase().includes(query));
              if (!matchQuery) return false;
            }

            if (filterDept !== 'ALL' && emp.departamento_id !== filterDept) return false;
            if (filterCC !== 'ALL' && emp.centro_costos_id !== filterCC) return false;
            if (filterEstado === 'activo' && !emp.activo) return false;
            if (filterEstado === 'inactivo' && emp.activo) return false;

            return true;
          })
          .sort((a, b) => {
            let valA = '';
            let valB = '';

            if (sortBy === 'nombre') {
              valA = `${a.nombre} ${a.apellido}`.toLowerCase();
              valB = `${b.nombre} ${b.apellido}`.toLowerCase();
            } else if (sortBy === 'codigo') {
              valA = a.codigo_empleado.toLowerCase();
              valB = b.codigo_empleado.toLowerCase();
            } else if (sortBy === 'departamento') {
              valA = (a.departamento || '').toLowerCase();
              valB = (b.departamento || '').toLowerCase();
            } else if (sortBy === 'cargo') {
              valA = (a.cargo || '').toLowerCase();
              valB = (b.cargo || '').toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedList = filtered.slice(startIndex, endIndex);

        return (
          <>
            <SearchAndFilterBar
              searchPlaceholder="Buscar por nombre, cédula, cargo..."
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              totalResults={filtered.length}
              totalCount={empleados.length}
              resultsLabel="colaboradores"
              selectFilters={[
                {
                  id: 'departamento',
                  placeholder: 'Todos los Departamentos',
                  value: filterDept,
                  onChange: (val) => setFilterDept(val === 'ALL' ? 'ALL' : Number(val)),
                  options: departamentos.map((d) => ({ label: d.nombre, value: d.id }))
                },
                {
                  id: 'centro_costos',
                  placeholder: 'Todos los CC',
                  value: filterCC,
                  onChange: (val) => setFilterCC(val === 'ALL' ? 'ALL' : Number(val)),
                  options: centrosCostos.map((cc) => ({ label: cc.nombre, value: cc.id }))
                },
                {
                  id: 'estado',
                  placeholder: 'Todos los Estados',
                  value: filterEstado,
                  onChange: (val) => setFilterEstado(val as any),
                  options: [
                    { label: 'Activos', value: 'activo' },
                    { label: 'Inactivos', value: 'inactivo' }
                  ]
                }
              ]}
              sortOptions={[
                { label: 'Ordenar por: Nombre', value: 'nombre' },
                { label: 'Ordenar por: Cédula', value: 'codigo' },
                { label: 'Ordenar por: Departamento', value: 'departamento' },
                { label: 'Ordenar por: Cargo', value: 'cargo' }
              ]}
              sortValue={sortBy}
              onSortValueChange={(val) => setSortBy(val as any)}
              sortOrder={sortOrder}
              onSortOrderChange={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            />

            {/* LISTADO */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                      <th className="px-5 py-3.5">Detalle</th>
                      <th className="px-5 py-3.5">Cédula</th>
                      <th className="px-5 py-3.5">Cargo / Dpto</th>
                      <th className="px-5 py-3.5">Estado</th>
                      <th className="px-5 py-3.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-gray-400 font-medium">
                          No se encontraron colaboradores que coincidan con los filtros.
                        </td>
                      </tr>
                    ) : (
                      paginatedList.map((emp) => (
                        <tr key={emp.id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={emp.foto_perfil}
                                alt={`${emp.nombre} ${emp.apellido}`}
                                className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                              />
                              <div>
                                <span className="font-semibold text-gray-800 block">
                                  {emp.nombre} {emp.apellido}
                                </span>
                                <span className="text-[10px] text-gray-400 block">{emp.email || 'Sin correo asignado'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-gray-700">{emp.codigo_empleado}</td>
                          <td className="px-5 py-4">
                            <span className="font-medium text-gray-800 block">{emp.cargo || 'Colaborador'}</span>
                            <span className="text-[10px] text-gray-400 block">
                              {emp.departamento || 'Sin Dpto'} {emp.centro_costos ? `• ${emp.centro_costos}` : ''}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                emp.activo
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  : 'bg-red-50 text-red-650 border-red-100'
                              }`}
                            >
                              {emp.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <BotonAccion
                                tipo="editar"
                                onClick={() => handleEditClick(emp)}
                              />
                              <BotonAccion
                                tipo={emp.activo ? 'desactivar' : 'activar'}
                                onClick={() => handleToggleActivo(emp)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Componente Reutilizable de Paginación */}
              <Paginacion
                currentPage={currentPage}
                totalItems={filtered.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />

            </div>
          </>
        );
      })()}

      <ModalImportExport
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        title="Colaboradores"
        columns={columnsConfig}
        data={empleados}
        onImport={handleImportColaboradores}
      />

      <ModalFormulario
        isOpen={isModalAbierto}
        onClose={() => setIsModalAbierto(false)}
        titulo={editingEmpleado ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}
        campos={camposColaborador}
        valoresIniciales={valoresInicialesColaborador(editingEmpleado)}
        onGuardar={handleGuardarColaborador}
        botonGuardarLabel="Guardar Colaborador"
      />
    </div>
  );
};
