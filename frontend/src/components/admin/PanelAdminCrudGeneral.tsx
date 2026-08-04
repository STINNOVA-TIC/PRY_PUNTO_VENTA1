import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../api/admin.api';
import { useAuth } from '../../context/AuthContext';
import { ModalImportExport } from '../common/ModalImportExport';
import { ModalFormulario, CampoFormulario } from '../common/ModalFormulario';
import { BotonRecargar } from '../common/BotonRecargar';
import { BotonAccion } from '../common/BotonAccion';
import { Paginacion } from '../common/Paginacion';
import { SearchAndFilterBar } from '../common/SearchAndFilterBar';
import { useModal } from '../../context/ModalContext';

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'image';
  required?: boolean;
  refTable?: string; // Tabla de la cual cargar opciones
  refIdKey?: string;
  refLabelKey?: string;
}

interface TableSchema {
  table: string;
  label: string;
  fields: FieldConfig[];
}

const SCHEMAS: TableSchema[] = [
  {
    table: 'empresa',
    label: 'Empresas',
    fields: [
      { key: 'empresa_codigo', label: 'Código Empresa', type: 'text', required: true },
      { key: 'empresa_ruc', label: 'RUC', type: 'text', required: true },
      { key: 'empresa_razon_social', label: 'Razón Social', type: 'text', required: true },
      { key: 'empresa_nombre_comercial', label: 'Nombre Comercial', type: 'text', required: true },
      { key: 'empresa_telefono', label: 'Teléfono', type: 'text' },
      { key: 'empresa_email', label: 'Email', type: 'text' },
      { key: 'empresa_direccion', label: 'Dirección', type: 'text' },
      { key: 'empresa_logo', label: 'Logo URL', type: 'text' }
    ]
  },
  {
    table: 'sucursal',
    label: 'Sucursales',
    fields: [
      { key: 'empresa_id', label: 'Empresa', type: 'select', refTable: 'empresa', refIdKey: 'empresa_id', refLabelKey: 'empresa_nombre_comercial', required: true },
      { key: 'sucursal_nombre', label: 'Nombre Sucursal', type: 'text', required: true },
      { key: 'sucursal_direccion', label: 'Dirección', type: 'text' },
      { key: 'sucursal_telefono', label: 'Teléfono', type: 'text' }
    ]
  },
  {
    table: 'centro_costos',
    label: 'Centros de Costo',
    fields: [
      { key: 'centro_costos_codigo', label: 'Código Centro', type: 'text', required: true },
      { key: 'centro_costos_nombre', label: 'Nombre Centro', type: 'text', required: true },
      { key: 'centro_costos_descripcion', label: 'Descripción', type: 'text' }
    ]
  },
  {
    table: 'departamento',
    label: 'Departamentos',
    fields: [
      { key: 'departamento_codigo', label: 'Código Departamento', type: 'text', required: true },
      { key: 'departamento_nombre', label: 'Nombre Departamento', type: 'text', required: true },
      { key: 'departamento_descripcion', label: 'Descripción', type: 'text' },
      { key: 'sucursal_id', label: 'Sucursal', type: 'select', refTable: 'sucursal', refIdKey: 'sucursal_id', refLabelKey: 'sucursal_nombre', required: true },
      { key: 'centro_costos_id', label: 'Centro de Costos', type: 'select', refTable: 'centro_costos', refIdKey: 'centro_costos_id', refLabelKey: 'centro_costos_nombre', required: true }
    ]
  },
  {
    table: 'categoria',
    label: 'Categorías',
    fields: [
      { key: 'categoria_codigo', label: 'Código Categoría', type: 'text', required: true },
      { key: 'categoria_nombre', label: 'Nombre Categoría', type: 'text', required: true },
      { key: 'categoria_descripcion', label: 'Descripción', type: 'text' }
    ]
  },
  {
    table: 'proveedor',
    label: 'Proveedores',
    fields: [
      { key: 'proveedor_codigo', label: 'Código Proveedor', type: 'text', required: true },
      { key: 'proveedor_nombre', label: 'Nombre Proveedor', type: 'text', required: true },
      { key: 'proveedor_contacto', label: 'Contacto', type: 'text' },
      { key: 'proveedor_telefono', label: 'Teléfono', type: 'text' },
      { key: 'proveedor_email', label: 'Email', type: 'text' },
      { key: 'proveedor_direccion', label: 'Dirección', type: 'text' }
    ]
  },
  {
    table: 'producto',
    label: 'Productos (Heladería/Almacén)',
    fields: [
      { key: 'categoria_id', label: 'Categoría', type: 'select', refTable: 'categoria', refIdKey: 'categoria_id', refLabelKey: 'categoria_nombre', required: true },
      { key: 'proveedor_id', label: 'Proveedor', type: 'select', refTable: 'proveedor', refIdKey: 'proveedor_id', refLabelKey: 'proveedor_nombre', required: true },
      { key: 'producto_codigo', label: 'Código de producto', type: 'text', required: true },
      { key: 'producto_nombre', label: 'Nombre Producto', type: 'text', required: true },
      { key: 'producto_descripcion', label: 'Descripción', type: 'text' },
      { key: 'producto_precio', label: 'Precio Venta ($)', type: 'number', required: true },
      { key: 'producto_precio_compra', label: 'Precio Compra ($)', type: 'number', required: true },
      { key: 'producto_stock', label: 'Stock Inicial', type: 'number', required: true },
      { key: 'producto_foto', label: 'Foto de Producto', type: 'image' }
    ]
  },
  {
    table: 'rol',
    label: 'Roles del Sistema',
    fields: [
      { key: 'rol_nombre', label: 'Nombre del Rol', type: 'text', required: true },
      { key: 'rol_descripcion', label: 'Descripción', type: 'text' }
    ]
  },
  {
    table: 'modulo',
    label: 'Módulos de Sistema',
    fields: [
      { key: 'modulo_nombre', label: 'Nombre del Módulo', type: 'text', required: true },
      { key: 'modulo_descripcion', label: 'Descripción', type: 'text' },
      { key: 'modulo_icono', label: 'Icono (Class o Texto)', type: 'text' }
    ]
  },
  {
    table: 'permiso',
    label: 'Permisos del Sistema',
    fields: [
      { key: 'modulo_id', label: 'Módulo Relacionado', type: 'select', refTable: 'modulo', refIdKey: 'modulo_id', refLabelKey: 'modulo_nombre', required: true },
      { key: 'permiso_nombre', label: 'Nombre Permiso', type: 'text', required: true },
      { key: 'permiso_descripcion', label: 'Descripción', type: 'text' },
      { key: 'permiso_clave', label: 'Clave Permiso (Ej. empleados.crear)', type: 'text', required: true }
    ]
  }
];

export const PanelAdminCrudGeneral: React.FC = () => {
  const { showConfirm } = useModal();
  const { user } = useAuth();
  
  const allowedSchemas = SCHEMAS.filter(s => {
    if (user?.rol.nombre === 'admin') return true;
    if (user?.rol.nombre === 'inventario') {
      return ['producto', 'proveedor', 'categoria'].includes(s.table);
    }
    return false;
  });

  const [activeSchema, setActiveSchema] = useState<TableSchema>(SCHEMAS[0]);

  useEffect(() => {
    if (allowedSchemas.length > 0 && !allowedSchemas.some(s => s.table === activeSchema.table)) {
      setActiveSchema(allowedSchemas[0]);
    }
  }, [user]);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Paginación de tablas maestras
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<'ALL' | 'activo' | 'inactivo'>('ALL');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterEstado, activeSchema]);

  // Caché de tablas referenciales para selects (ej: empresas, categorías)
  const [refCache, setRefCache] = useState<{ [table: string]: any[] }>({});

  const rowsFiltrados = React.useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return rows.filter((row) => {
      if (filterEstado === 'activo' && row[`${activeSchema.table}_estado`] !== 'activo') return false;
      if (filterEstado === 'inactivo' && row[`${activeSchema.table}_estado`] === 'activo') return false;

      if (!query) return true;

      const pkVal = String(row[`${activeSchema.table}_id`] ?? '');
      const searchable = activeSchema.fields.map((f) => {
        let val = row[f.key];
        if (f.type === 'select' && f.refTable) {
          const matchedOpt = (refCache[f.refTable] || []).find((opt) => opt[f.refIdKey || ''] === val);
          if (matchedOpt) val = matchedOpt[f.refLabelKey || ''];
        }
        return val !== null && val !== undefined ? String(val) : '';
      });
      return `${pkVal} ${searchable.join(' ')}`.toLowerCase().includes(query);
    });
  }, [rows, activeSchema, refCache, searchQuery, filterEstado]);

  // Formulario
  const [isModalAbierto, setIsModalAbierto] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);

  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  const lastRequestTokenRef = useRef<number>(0);

  useEffect(() => {
    cargarDatos();
    setCurrentPage(1);
  }, [activeSchema]);

  const cargarDatos = async () => {
    const currentToken = ++lastRequestTokenRef.current;

    // Si la tabla activa no es parte de las permitidas para el rol, no intentar cargar
    const isAllowed = allowedSchemas.some(s => s.table === activeSchema.table);
    if (!isAllowed) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMensaje('');

      // Leer filas principales
      const mainRes = await adminAPI.read(activeSchema.table);
      if (currentToken !== lastRequestTokenRef.current) return;
      setRows(mainRes.data);

      // Cargar tablas referenciales requeridas por los campos select de este esquema
      const newCache = { ...refCache };
      for (const field of activeSchema.fields) {
        if (field.type === 'select' && field.refTable) {
          try {
            const refRes = await adminAPI.read(field.refTable);
            if (currentToken !== lastRequestTokenRef.current) return;
            newCache[field.refTable] = refRes.data.filter((r: any) => {
              const statusCol = `${field.refTable}_estado`;
              return r[statusCol] === 'activo';
            });
          } catch (err) {
            console.error(`Error cargando tabla de referencia ${field.refTable}:`, err);
          }
        }
      }
      if (currentToken !== lastRequestTokenRef.current) return;
      setRefCache(newCache);
    } catch (err) {
      if (currentToken !== lastRequestTokenRef.current) return;
      console.error('Error al cargar datos administrativos:', err);
      setError('Error al conectar con la base de datos de esta tabla.');
    } finally {
      if (currentToken === lastRequestTokenRef.current) {
        setLoading(false);
      }
    }
  };

  const columnsConfigCentroCostos = [
    { key: 'centro_costos_codigo', label: 'Código Centro' },
    { key: 'centro_costos_nombre', label: 'Nombre Centro' },
    { key: 'centro_costos_descripcion', label: 'Descripción' }
  ];

  const handleImportCentroCostos = async (importedRows: any[]) => {
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < importedRows.length; i++) {
      const row = importedRows[i];

      if (!row.centro_costos_codigo || !row.centro_costos_nombre) {
        errors.push(`Fila ${i + 1}: Código Centro y Nombre Centro son obligatorios.`);
        continue;
      }

      try {
        await adminAPI.create('centro_costos', {
          centro_costos_codigo: String(row.centro_costos_codigo),
          centro_costos_nombre: String(row.centro_costos_nombre),
          centro_costos_descripcion: row.centro_costos_descripcion ? String(row.centro_costos_descripcion) : ''
        });
        successCount++;
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Error desconocido';
        errors.push(`Fila ${i + 1} (${row.centro_costos_nombre}): ${msg}`);
      }
    }

    cargarDatos();
    return { successCount, errors };
  };

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = allowedSchemas.find(s => s.table === e.target.value);
    if (selected) {
      setActiveSchema(selected);
      setIsModalAbierto(false);
    }
  };

  const buildCamposMaestros = (schema: TableSchema): CampoFormulario[] => {
    return schema.fields.map(f => {
      if (f.type === 'image') {
        return {
          name: f.key,
          label: f.label,
          tipo: 'foto' as const,
          fotoCarpeta: schema.table === 'empleado' ? 'empleado' : 'producto',
          colSpan: 2,
          fotoAviso: 'Puedes ingresar una URL o subir/tomar una foto desde tu dispositivo.'
        };
      }
      if (f.type === 'select' && f.refTable) {
        const options = (refCache[f.refTable] || []).map((opt: any) => ({
          value: opt[f.refIdKey || ''],
          label: `${opt[f.refLabelKey || '']} (ID: ${opt[f.refIdKey || '']})`
        }));
        return {
          name: f.key,
          label: f.label,
          tipo: 'select' as const,
          required: f.required,
          placeholder: 'Seleccionar...',
          opciones: options
        };
      }
      if (f.type === 'number') {
        return {
          name: f.key,
          label: f.label,
          tipo: 'numero' as const,
          required: f.required
        };
      }
      if (f.type === 'checkbox') {
        return {
          name: f.key,
          label: f.label,
          tipo: 'checkbox' as const
        };
      }
      return {
        name: f.key,
        label: f.label,
        tipo: 'texto' as const,
        required: f.required
      };
    });
  };

  const buildValoresInicialesMaestros = (schema: TableSchema, row: any | null): Record<string, any> => {
    if (row) {
      const data: Record<string, any> = {};
      schema.fields.forEach(f => {
        data[f.key] = row[f.key] !== null && row[f.key] !== undefined ? row[f.key] : '';
      });
      return data;
    }

    const data: Record<string, any> = {};
    schema.fields.forEach(f => {
      if (f.type === 'number') data[f.key] = 0;
      else if (f.type === 'checkbox') data[f.key] = true;
      else if (f.type === 'select' && f.refTable && refCache[f.refTable]?.length > 0) {
        data[f.key] = refCache[f.refTable][0][f.refIdKey || ''];
      } else data[f.key] = '';
    });
    return data;
  };

  const handleCreateNewClick = () => {
    setEditingRow(null);
    setIsModalAbierto(true);
  };

  const handleEditClick = (row: any) => {
    setEditingRow(row);
    setIsModalAbierto(true);
  };

  const handleGuardarMaestro = async (valores: Record<string, any>) => {
    const pkKey = `${activeSchema.table}_id`;
    const editingId = editingRow ? editingRow[pkKey] : null;

    const payload: Record<string, any> = { ...valores };

    // Subida de imagen si corresponde
    const imageField = activeSchema.fields.find(f => f.type === 'image');
    if (imageField) {
      payload[imageField.key] = payload[imageField.key] || 'https://img.icons8.com/fluent/1200/fast-moving-consumer-goods.jpg';
    }

    // Validar tipos numéricos
    activeSchema.fields.forEach(f => {
      if (f.type === 'number') {
        payload[f.key] = Number(payload[f.key]);
      }
    });

    if (editingId) {
      await adminAPI.update(activeSchema.table, editingId, payload);
      setMensaje('Registro actualizado con éxito.');
    } else {
      await adminAPI.create(activeSchema.table, payload);
      setMensaje('Registro creado con éxito.');
    }
    setIsModalAbierto(false);
    cargarDatos();
  };

  const handleToggleActive = async (row: any) => {
    const pkKey = `${activeSchema.table}_id`;
    const statusKey = `${activeSchema.table}_estado`;
    const id = row[pkKey];
    const isActivo = row[statusKey] === 'activo';
    const accion = isActivo ? 'desactivar' : 'activar';

    const confirmed = await showConfirm({
      title: 'Confirmar Acción',
      message: `¿Estás seguro de ${accion} este registro por motivos de auditoría?`,
      confirmLabel: isActivo ? 'Desactivar' : 'Activar',
      type: isActivo ? 'danger' : 'warning'
    });
    if (!confirmed) return;

    try {
      await adminAPI.toggleStatus(activeSchema.table, id, !isActivo);
      setMensaje(`Registro ${isActivo ? 'desactivado' : 'activado'} correctamente.`);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const rowsPaginados = rowsFiltrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="font-sans space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Administrador de Tablas y Catálogos</h1>
          <p className="text-xs text-gray-500 mt-1">Configuración general de parámetros, sucursales, departamentos y heladería</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-600">Tabla activa:</label>
          <select
            value={activeSchema.table}
            onChange={handleTableChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white focus:outline-none"
          >
            {allowedSchemas.map(s => (
              <option key={s.table} value={s.table}>{s.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <BotonRecargar onRefresh={cargarDatos} loading={loading} />
            {activeSchema.table === 'centro_costos' && (
              <button
                type="button"
                onClick={() => setIsImportExportOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-755 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Importar / Exportar
              </button>
            )}
            <button
              onClick={handleCreateNewClick}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              Registrar nuevo
            </button>
          </div>
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
        searchPlaceholder={`Buscar en ${activeSchema.label.toLowerCase()}...`}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalResults={rowsFiltrados.length}
        totalCount={rows.length}
        resultsLabel="registros"
        selectFilters={[
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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800"></div>
              <p className="text-[10px] text-gray-400">Consultando registros...</p>
            </div>
          ) : rowsFiltrados.length === 0 ? (
            <p className="text-center py-12 text-xs text-gray-400 font-medium">No se encontraron registros en esta tabla.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                  <th className="px-5 py-3.5">ID</th>
                  {activeSchema.fields.slice(0, 4).map(f => (
                    <th key={f.key} className="px-5 py-3.5">{f.label}</th>
                  ))}
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rowsPaginados.map((row) => {
                  const pkVal = row[`${activeSchema.table}_id`];
                  const stateVal = row[`${activeSchema.table}_estado`];
                  const isActivo = stateVal === 'activo';
                  return (
                    <tr key={pkVal} className="hover:bg-gray-50/50">
                      <td className="px-5 py-4 font-mono font-bold text-gray-400">#{pkVal}</td>
                      {activeSchema.fields.slice(0, 4).map(f => {
                        let cellVal = row[f.key];
                        
                        // Si es select, buscar la etiqueta del caché
                        if (f.type === 'select' && f.refTable) {
                          const refOptions = refCache[f.refTable] || [];
                          const matchedOpt = refOptions.find(opt => opt[f.refIdKey || ''] === cellVal);
                          if (matchedOpt) {
                            cellVal = matchedOpt[f.refLabelKey || ''];
                          }
                        }

                        // Formatear si es imagen o null
                        if (f.type === 'image') {
                          return (
                            <td key={f.key} className="px-5 py-4">
                              <img src={cellVal} alt="Foto" className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                            </td>
                          );
                        }

                        return (
                          <td key={f.key} className="px-5 py-4 text-gray-700 max-w-[200px] truncate">
                            {cellVal !== null ? String(cellVal) : '-'}
                          </td>
                        );
                      })}
                      <td className="px-5 py-4">
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                          isActivo
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {stateVal}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <BotonAccion
                            tipo="editar"
                            onClick={() => handleEditClick(row)}
                          />
                          <BotonAccion
                            tipo={isActivo ? 'desactivar' : 'activar'}
                            onClick={() => handleToggleActive(row)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && rowsFiltrados.length > 0 && (
          <Paginacion
            currentPage={currentPage}
            totalItems={rowsFiltrados.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </div>

      <ModalImportExport
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        title="Centros de Costo"
        columns={columnsConfigCentroCostos}
        data={rows}
        onImport={handleImportCentroCostos}
      />

      <ModalFormulario
        isOpen={isModalAbierto}
        onClose={() => setIsModalAbierto(false)}
        titulo={editingRow ? `Editar en ${activeSchema.label}` : `Insertar en ${activeSchema.label}`}
        campos={buildCamposMaestros(activeSchema)}
        valoresIniciales={buildValoresInicialesMaestros(activeSchema, editingRow)}
        onGuardar={handleGuardarMaestro}
        botonGuardarLabel="Guardar Datos"
      />
    </div>
  );
};
