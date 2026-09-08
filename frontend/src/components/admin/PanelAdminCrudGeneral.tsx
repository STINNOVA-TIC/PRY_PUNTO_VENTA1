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
import { BsShieldCheck, BsKey, BsCheck2Circle, BsXCircle, BsDatabaseDown, BsDatabaseFillGear, BsServer, BsTrash3, BsDownload, BsPlusCircle, BsClockHistory, BsArrowClockwise } from 'react-icons/bs';

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
  },
  {
    table: 'rol_permiso',
    label: 'Asignación Roles y Permisos',
    fields: [
      { key: 'rol_id', label: 'Rol', type: 'select', refTable: 'rol', refIdKey: 'rol_id', refLabelKey: 'rol_nombre', required: true },
      { key: 'permiso_id', label: 'Permiso', type: 'select', refTable: 'permiso', refIdKey: 'permiso_id', refLabelKey: 'permiso_nombre', required: true }
    ]
  }
];

export const PanelAdminCrudGeneral: React.FC = () => {
  const { showConfirm } = useModal();
  const { user, hasPermission } = useAuth();
  
  const allowedSchemas = SCHEMAS.filter(s => {
    if (user?.rol.nombre === 'admin') return true;
    
    // Si tiene permiso para gestionar roles y permisos
    if (['rol', 'modulo', 'permiso', 'rol_permiso'].includes(s.table) && (hasPermission('roles.ver') || hasPermission('roles.crear'))) {
      return true;
    }

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

  // Funciones de validación de permisos para las tablas maestras
  const canCreateInTable = (table: string) => {
    if (user?.rol?.nombre === 'admin') return true;
    if (table === 'rol') return hasPermission('roles.crear');
    if (['modulo', 'permiso', 'rol_permiso'].includes(table)) return hasPermission('roles.crear');
    if (table === 'producto') return hasPermission('productos.crear');
    if (table === 'proveedor') return hasPermission('proveedores.crear' as any);
    if (table === 'categoria') return hasPermission('categorias.crear' as any);
    return false;
  };

  const canEditInTable = (table: string) => {
    if (user?.rol?.nombre === 'admin') return true;
    if (table === 'rol') return hasPermission('roles.editar');
    if (['modulo', 'permiso', 'rol_permiso'].includes(table)) return hasPermission('roles.editar') || hasPermission('roles.crear');
    if (table === 'producto') return hasPermission('productos.editar');
    if (table === 'proveedor') return hasPermission('proveedores.editar' as any);
    if (table === 'categoria') return hasPermission('categorias.editar' as any);
    return false;
  };

  const canToggleActiveInTable = (table: string, isActivo: boolean) => {
    if (user?.rol?.nombre === 'admin') return true;
    if (table === 'rol') return hasPermission('roles.eliminar');
    if (['modulo', 'permiso', 'rol_permiso'].includes(table)) return hasPermission('roles.eliminar');
    if (table === 'producto') return isActivo ? hasPermission('productos.desactivar') : hasPermission('productos.activar');
    if (table === 'proveedor') return hasPermission('proveedores.editar' as any);
    if (table === 'categoria') return hasPermission('categorias.editar' as any);
    return false;
  };

  const canManageRolePermissions = () => {
    if (user?.rol?.nombre === 'admin') return true;
    return hasPermission('roles.editar') || hasPermission('roles.crear');
  };

  // Formulario
  const [isModalAbierto, setIsModalAbierto] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);

  // Modal Matriz de Permisos para Roles
  const [isRolePermModalOpen, setIsRolePermModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [loadingRolePerms, setLoadingRolePerms] = useState(false);
  const [savingRolePerms, setSavingRolePerms] = useState(false);
  const [rolePermFilterModulo, setRolePermFilterModulo] = useState<string>('TODOS');
  const [rolePermSearch, setRolePermSearch] = useState<string>('');

  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Modal de Copia de Seguridad de la Base de Datos
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [loadingDbStats, setLoadingDbStats] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [backupList, setBackupList] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);

  const cargarBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await adminAPI.listDatabaseBackups();
      setBackupList(res.data || []);
    } catch (err) {
      console.error('Error al obtener lista de backups:', err);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleOpenBackupModal = async () => {
    setIsBackupModalOpen(true);
    setLoadingDbStats(true);
    try {
      const [statsRes] = await Promise.all([
        adminAPI.getDatabaseStats(),
        cargarBackups()
      ]);
      setDbStats(statsRes.data);
    } catch (err) {
      console.error('Error al inicializar modal de backups:', err);
    } finally {
      setLoadingDbStats(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      setDownloadingBackup(true);
      await adminAPI.downloadDatabaseBackup();
      setMensaje('Copia de seguridad descargada exitosamente.');
    } catch (err) {
      console.error('Error al descargar backup:', err);
      setError('Error al generar la copia de seguridad.');
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleCreateServerBackup = async () => {
    try {
      setCreatingBackup(true);
      const res = await adminAPI.createDatabaseBackup();
      if (res.success) {
        setMensaje('Nueva copia de seguridad almacenada en el servidor.');
        await cargarBackups();
      }
    } catch (err: any) {
      console.error('Error al crear copia en servidor:', err);
      setError(err.response?.data?.message || 'Error al generar la copia en el servidor.');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadSingleBackup = async (filename: string) => {
    try {
      await adminAPI.downloadBackupFile(filename);
      setMensaje(`Descarga de ${filename} iniciada.`);
    } catch (err) {
      console.error('Error al descargar archivo:', err);
      setError('Error al descargar el archivo de respaldo.');
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    const confirmed = await showConfirm({
      title: '¿Eliminar copia de seguridad?',
      message: `Esta acción borrará permanentemente el archivo "${filename}" del servidor. ¿Deseas continuar?`,
      type: 'danger',
      confirmLabel: 'Eliminar'
    });

    if (confirmed) {
      try {
        await adminAPI.deleteDatabaseBackup(filename);
        setMensaje('Archivo de respaldo eliminado correctamente.');
        await cargarBackups();
      } catch (err: any) {
        console.error('Error al eliminar backup:', err);
        setError(err.response?.data?.message || 'Error al eliminar la copia de seguridad.');
      }
    }
  };

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

  const handleOpenRolePermissions = async (role: any) => {
    setSelectedRole(role);
    setIsRolePermModalOpen(true);
    setLoadingRolePerms(true);
    setRolePermFilterModulo('TODOS');
    setRolePermSearch('');

    try {
      const res = await adminAPI.getRolePermissions(role.rol_id);
      setRolePermissions(res.data);
    } catch (err) {
      console.error('Error al cargar permisos del rol:', err);
      setError('No se pudieron obtener los permisos del rol');
    } finally {
      setLoadingRolePerms(false);
    }
  };

  const toggleRolePermiso = (permId: number) => {
    setRolePermissions(prev => prev.map(p => {
      if (p.id === permId) {
        return { ...p, asignado: !p.asignado };
      }
      return p;
    }));
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    try {
      setSavingRolePerms(true);
      const assignedIds = rolePermissions.filter(p => p.asignado).map(p => p.id);
      await adminAPI.saveRolePermissions(selectedRole.rol_id, assignedIds);
      setMensaje(`Permisos del rol "${selectedRole.rol_nombre}" actualizados correctamente.`);
      setIsRolePermModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar permisos del rol');
    } finally {
      setSavingRolePerms(false);
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
            {user?.rol?.nombre === 'admin' && (
              <button
                type="button"
                onClick={handleOpenBackupModal}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                title="Descargar script SQL o respaldo de la base de datos"
              >
                <BsDatabaseDown className="h-4 w-4 text-blue-600" />
                <span>Copia de Seguridad</span>
              </button>
            )}
            {activeSchema.table === 'centro_costos' && (
              <button
                type="button"
                onClick={() => setIsImportExportOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-755 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Importar / Exportar
              </button>
            )}
            {canCreateInTable(activeSchema.table) && (
              <button
                onClick={handleCreateNewClick}
                className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Registrar nuevo
              </button>
            )}
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
                        <div className="flex gap-2 justify-end items-center">
                          {activeSchema.table === 'rol' && (
                            <button
                              onClick={() => handleOpenRolePermissions(row)}
                              title={canManageRolePermissions() ? "Configurar permisos de este rol" : "Ver permisos de este rol"}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition"
                            >
                              <BsKey className="h-3.5 w-3.5" />
                              Permisos
                            </button>
                          )}
                          {canEditInTable(activeSchema.table) && (
                            <BotonAccion
                              tipo="editar"
                              onClick={() => handleEditClick(row)}
                            />
                          )}
                          {canToggleActiveInTable(activeSchema.table, isActivo) && (
                            <BotonAccion
                              tipo={isActivo ? 'desactivar' : 'activar'}
                              onClick={() => handleToggleActive(row)}
                            />
                          )}
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

      {/* MODAL MATRIZ DE PERMISOS POR ROL */}
      {isRolePermModalOpen && (
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
                    Matriz de Permisos del Rol: {selectedRole?.rol_nombre?.toUpperCase()}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedRole?.rol_descripcion || 'Configura la plantilla de accesos base para este rol.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRolePermModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Filtros dentro del modal */}
            <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-center justify-between bg-white">
              <div className="flex gap-1 overflow-x-auto py-1">
                <button
                  onClick={() => setRolePermFilterModulo('TODOS')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    rolePermFilterModulo === 'TODOS'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos los Módulos
                </button>
                {Array.from(new Set(rolePermissions.map((p: any) => p.modulo_nombre))).map((mod: any) => (
                  <button
                    key={mod}
                    onClick={() => setRolePermFilterModulo(mod)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      rolePermFilterModulo === mod
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
                value={rolePermSearch}
                onChange={e => setRolePermSearch(e.target.value)}
                className="px-3 py-1 text-xs border border-gray-200 rounded-lg w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Lista de permisos interactiva */}
            <div className="p-6 overflow-y-auto flex-1 space-y-2">
              {loadingRolePerms ? (
                <div className="py-12 text-center text-xs text-gray-400 font-medium">
                  Cargando permisos del rol...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {rolePermissions
                    .filter((p: any) => {
                      if (rolePermFilterModulo !== 'TODOS' && p.modulo_nombre !== rolePermFilterModulo) return false;
                      if (rolePermSearch) {
                        const q = rolePermSearch.toLowerCase();
                        return p.nombre.toLowerCase().includes(q) || p.clave.toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .map((perm: any) => (
                      <div
                        key={perm.id}
                        onClick={() => canManageRolePermissions() && toggleRolePermiso(perm.id)}
                        className={`p-3 rounded-xl border transition flex items-start justify-between gap-2 select-none ${
                          canManageRolePermissions() ? 'cursor-pointer' : 'cursor-default'
                        } ${
                          perm.asignado
                            ? 'bg-emerald-50/40 border-emerald-200' + (canManageRolePermissions() ? ' hover:bg-emerald-50/70' : '')
                            : 'bg-gray-50/60 border-gray-200 opacity-65' + (canManageRolePermissions() ? ' hover:opacity-90' : '')
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
                        </div>
                        <div className="pt-0.5">
                          {perm.asignado ? (
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

            {/* Pie del modal */}
            <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                Permisos asignados: <strong className="text-gray-800">{rolePermissions.filter((p: any) => p.asignado).length}</strong> de {rolePermissions.length}
                {!canManageRolePermissions() && (
                  <span className="ml-2 text-amber-600 font-medium">(Solo lectura)</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRolePermModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold transition"
                >
                  {canManageRolePermissions() ? 'Cancelar' : 'Cerrar'}
                </button>
                {canManageRolePermissions() && (
                  <button
                    type="button"
                    onClick={handleSaveRolePermissions}
                    disabled={savingRolePerms}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {savingRolePerms ? 'Guardando...' : 'Guardar Permisos'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL COPIA DE SEGURIDAD Y GESTIÓN DE HISTORIAL DE BACKUPS */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 animate-scale-up flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <BsDatabaseFillGear className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Centro de Copias de Seguridad</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Historial y respaldos automáticos / manuales de PostgreSQL</p>
                </div>
              </div>
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {loadingDbStats && !dbStats ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-2">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
                  <p className="text-xs text-gray-500">Consultando estado de la base de datos...</p>
                </div>
              ) : (
                <>
                  {/* Resumen de la Base de Datos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 bg-gray-50 border border-gray-200/80 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Base de Datos</span>
                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                        <BsServer className="text-blue-600 h-3 w-3" />
                        {dbStats?.database_name || 'pointofsale'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-gray-50 border border-gray-200/80 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Peso Total</span>
                      <p className="text-xs font-bold text-emerald-700 font-mono">
                        {dbStats?.total_size || 'N/A'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-gray-50 border border-gray-200/80 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tablas Maestras</span>
                      <p className="text-xs font-bold text-gray-800">
                        {dbStats?.total_tables ?? 0} tablas
                      </p>
                    </div>

                    <div className="p-2.5 bg-gray-50 border border-gray-200/80 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Registros</span>
                      <p className="text-[11px] font-semibold text-gray-700 truncate" title={`${dbStats?.total_usuarios ?? 0} usuarios · ${dbStats?.total_empleados ?? 0} colab. · ${dbStats?.total_productos ?? 0} prod.`}>
                        {dbStats?.total_usuarios ?? 0}u / {dbStats?.total_empleados ?? 0}c / {dbStats?.total_productos ?? 0}p
                      </p>
                    </div>
                  </div>

                  {/* Acciones principales de Respaldo */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl">
                    <div className="text-xs text-blue-950">
                      <p className="font-semibold text-[12px]">Crear nuevo punto de restauración</p>
                      <p className="text-[11px] text-blue-800/80">Guarda una captura completa e íntegra en el almacenamiento persistente del servidor.</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleCreateServerBackup}
                        disabled={creatingBackup}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                      >
                        <BsPlusCircle className="h-3.5 w-3.5" />
                        <span>{creatingBackup ? 'Creando en Servidor...' : 'Crear en Servidor'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadBackup}
                        disabled={downloadingBackup}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                        title="Descargar directamente al navegador como archivo .sql"
                      >
                        <BsDatabaseDown className="h-3.5 w-3.5" />
                        <span>{downloadingBackup ? 'Descargando...' : 'Descargar Directo'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Historial de Copias en Servidor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <BsClockHistory className="h-3.5 w-3.5 text-gray-500" />
                        <span>Historial de Copias en Servidor ({backupList.length})</span>
                      </div>
                      <button
                        type="button"
                        onClick={cargarBackups}
                        disabled={loadingBackups}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 hover:underline disabled:opacity-50"
                      >
                        <BsArrowClockwise className={`h-3 w-3 ${loadingBackups ? 'animate-spin' : ''}`} />
                        <span>Refrescar</span>
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm max-h-60 overflow-y-auto">
                      {loadingBackups && backupList.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-1.5"></div>
                          Cargando historial...
                        </div>
                      ) : backupList.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-400">
                          No hay copias de seguridad almacenadas en el servidor aún.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold text-[11px]">
                            <tr>
                              <th className="px-3 py-2">Archivo / Origen</th>
                              <th className="px-3 py-2">Fecha</th>
                              <th className="px-3 py-2">Tamaño</th>
                              <th className="px-3 py-2 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {backupList.map((item) => (
                              <tr key={item.filename} className="hover:bg-gray-50/60 transition">
                                <td className="px-3 py-2">
                                  <div className="font-semibold text-gray-800 font-mono text-[11px] truncate max-w-[200px]" title={item.filename}>
                                    {item.filename}
                                  </div>
                                  <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                    item.tipo.includes('Automática')
                                      ? 'bg-purple-100 text-purple-700'
                                      : item.tipo.includes('Imágenes')
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {item.tipo}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-[11px]">
                                  {new Date(item.created_at).toLocaleString('es-EC', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="px-3 py-2 text-emerald-700 font-mono text-[11px] whitespace-nowrap">
                                  {item.size}
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadSingleBackup(item.filename)}
                                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                                      title="Descargar este archivo"
                                    >
                                      <BsDownload className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBackup(item.filename)}
                                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                      title="Eliminar este respaldo del servidor"
                                    >
                                      <BsTrash3 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
