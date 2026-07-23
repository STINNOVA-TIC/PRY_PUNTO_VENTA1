import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../api/admin.api';
import { useAuth } from '../../context/AuthContext';

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

  // Caché de tablas referenciales para selects (ej: empresas, categorías)
  const [refCache, setRefCache] = useState<{ [table: string]: any[] }>({});

  // Formulario
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  
  // Para subida de fotos
  const [uploadingImage, setUploadingImage] = useState(false);

  const [urlOption, setUrlOption] = useState<'url' | 'file'>('url');
  const [photoUrlInput, setPhotoUrlInput] = useState('');

  const lastRequestTokenRef = useRef<number>(0);

  useEffect(() => {
    cargarDatos();
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

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = allowedSchemas.find(s => s.table === e.target.value);
    if (selected) {
      setActiveSchema(selected);
      setShowForm(false);
    }
  };

  const handleCreateNewClick = () => {
    setEditingId(null);
    const initialData: { [key: string]: any } = {};
    activeSchema.fields.forEach(f => {
      if (f.type === 'number') initialData[f.key] = 0;
      else if (f.type === 'checkbox') initialData[f.key] = true;
      else if (f.type === 'select' && f.refTable && refCache[f.refTable]?.length > 0) {
        initialData[f.key] = refCache[f.refTable][0][f.refIdKey || ''];
      } else initialData[f.key] = '';
    });
    setFormData(initialData);

    setPhotoUrlInput('');
    setUrlOption('url');
    setShowForm(true);
  };

  const handleEditClick = (row: any) => {
    const pkKey = `${activeSchema.table}_id`;
    setEditingId(row[pkKey]);
    
    const editData: { [key: string]: any } = {};
    activeSchema.fields.forEach(f => {
      editData[f.key] = row[f.key] !== null ? row[f.key] : '';
    });
    
    setFormData(editData);

    if (editData[`${activeSchema.table}_foto`]) {
      setPhotoUrlInput(editData[`${activeSchema.table}_foto`]);
    } else {
      setPhotoUrlInput('');
    }
    setUrlOption('url');
    setShowForm(true);
  };

  const handleToggleActive = async (row: any) => {
    const pkKey = `${activeSchema.table}_id`;
    const statusKey = `${activeSchema.table}_estado`;
    const id = row[pkKey];
    const isActivo = row[statusKey] === 'activo';
    const accion = isActivo ? 'desactivar' : 'activar';

    if (!confirm(`¿Estás seguro de ${accion} este registro por motivos de auditoría?`)) return;

    try {
      await adminAPI.toggleStatus(activeSchema.table, id, !isActivo);
      setMensaje(`Registro ${isActivo ? 'desactivado' : 'activado'} correctamente.`);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      try {
        setUploadingImage(true);
        const type = activeSchema.table === 'empleado' ? 'empleado' : 'producto';
        const uploadRes = await adminAPI.uploadPhoto(file, type);
        setPhotoUrlInput(uploadRes.url);
      } catch (err) {
        console.error('Error al subir imagen:', err);
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    const payload = { ...formData };

    try {
      // Subida de imagen si corresponde
      const imageField = activeSchema.fields.find(f => f.type === 'image');
      if (imageField) {
        payload[imageField.key] = photoUrlInput || 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=300&auto=format&fit=crop';
      }

      // Validar tipos
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
      setShowForm(false);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el registro en la base de datos.');
    } finally {
      setUploadingImage(false);
    }
  };

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

          {!showForm && (
            <button
              onClick={handleCreateNewClick}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              Registrar nuevo
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

      {/* FORMULARIO */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-2xl space-y-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
            {editingId ? `Editar en ${activeSchema.label}` : `Insertar en ${activeSchema.label}`}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeSchema.fields.map(field => {
              if (field.type === 'image') {
                return (
                  <div key={field.key} className="col-span-2 space-y-2 border-t border-gray-100 pt-3">
                    <label className="block text-xs font-semibold text-gray-600">{field.label}</label>
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 font-medium text-gray-655">
                        <input
                          type="radio"
                          name="photoOption"
                          checked={urlOption === 'url'}
                          onChange={() => setUrlOption('url')}
                        />
                        Dirección URL (Imagen Web)
                      </label>
                      <label className="flex items-center gap-1.5 font-medium text-gray-655">
                        <input
                          type="radio"
                          name="photoOption"
                          checked={urlOption === 'file'}
                          onChange={() => setUrlOption('file')}
                        />
                        Subir o Tomar Foto (Cámara)
                      </label>
                    </div>

                    {urlOption === 'url' ? (
                      <input
                        type="text"
                        value={photoUrlInput}
                        onChange={(e) => setPhotoUrlInput(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                      />
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                      />
                    )}
                    {uploadingImage && <p className="text-[10px] text-gray-400 animate-pulse font-medium">Subiendo imagen...</p>}
                    {photoUrlInput && (
                      <div className="pt-1">
                        <p className="text-[10px] text-emerald-700 font-semibold mb-1">Vista previa:</p>
                        <img src={photoUrlInput} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      </div>
                    )}
                  </div>
                );
              }

              if (field.type === 'select') {
                const options = refCache[field.refTable || ''] || [];
                return (
                  <div key={field.key}>
                    <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                    <select
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none"
                      required={field.required}
                    >
                      <option value="">Seleccionar...</option>
                      {options.map((opt: any) => {
                        const optId = opt[field.refIdKey || ''];
                        const optLabel = opt[field.refLabelKey || ''];
                        return (
                          <option key={optId} value={optId}>{optLabel} (ID: {optId})</option>
                        );
                      })}
                    </select>
                  </div>
                );
              }

              return (
                <div key={field.key}>
                  <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    step={field.type === 'number' ? 'any' : undefined}
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                    required={field.required}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="submit"
              disabled={uploadingImage}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              {uploadingImage ? 'Guardando...' : 'Guardar Datos'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* LISTADO */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800"></div>
              <p className="text-[10px] text-gray-400">Consultando registros...</p>
            </div>
          ) : rows.length === 0 ? (
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
                {rows.map((row) => {
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
                          <button
                            onClick={() => handleEditClick(row)}
                            className="px-2.5 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg font-semibold text-[10px] transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggleActive(row)}
                            className={`px-2.5 py-1.5 border rounded-lg font-semibold text-[10px] transition ${
                              isActivo
                                ? 'border-red-200 hover:bg-red-50 text-red-600'
                                : 'border-emerald-200 hover:bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {isActivo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};
