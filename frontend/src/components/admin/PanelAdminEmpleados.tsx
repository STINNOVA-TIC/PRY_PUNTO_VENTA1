import React, { useState, useEffect } from 'react';
import { empleadosAPI } from '../../api/empleados.api';
import { adminAPI } from '../../api/admin.api';
import { Empleado } from '../../types';

export const PanelAdminEmpleados: React.FC = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [departamentos, setDepartamentos] = useState<{ id: number; nombre: string }[]>([]);
  const [centrosCostos, setCentrosCostos] = useState<{ id: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Formulario Empleado
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState('');
  const [selectedDept, setSelectedDept] = useState<number | ''>('');
  const [selectedCC, setSelectedCC] = useState<number | ''>('');
  const [activo, setActivo] = useState(true);

  // Estados de subida de fotos
  const [urlOption, setUrlOption] = useState<'url' | 'file'>('url');
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setSubiendoFoto(true);
        const res = await adminAPI.uploadPhoto(file, 'empleado');
        setFotoPerfil(res.url);
      } catch (err) {
        console.error('Error al subir foto:', err);
      } finally {
        setSubiendoFoto(false);
      }
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

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
    setEditingId(emp.id);
    setCedula(emp.codigo_empleado);
    setNombre(emp.nombre);
    setApellido(emp.apellido);
    setEmail(emp.email || '');
    setCargo(emp.cargo || '');
    setFotoPerfil(emp.foto_perfil.startsWith('https://ui-avatars') ? '' : emp.foto_perfil);
    setSelectedDept(emp.departamento_id || '');
    setSelectedCC(emp.centro_costos_id || '');
    setActivo(emp.activo);
    setShowForm(true);
  };

  const handleCreateNewClick = () => {
    setEditingId(null);
    setCedula('');
    setNombre('');
    setApellido('');
    setEmail('');
    setCargo('');
    setFotoPerfil('');
    setSelectedDept(departamentos.length > 0 ? departamentos[0].id : '');
    setSelectedCC(centrosCostos.length > 0 ? centrosCostos[0].id : '');
    setActivo(true);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!cedula || !nombre || !apellido) {
      setError('Cédula, Nombre y Apellido son requeridos.');
      return;
    }

    const payload = {
      cedula,
      nombre,
      apellido,
      email: email || null,
      cargo: cargo || null,
      foto_perfil: fotoPerfil || null,
      departamento_id: selectedDept ? Number(selectedDept) : null,
      centro_costos_id: selectedCC ? Number(selectedCC) : null,
      activo
    };

    try {
      if (editingId) {
        await empleadosAPI.update(editingId, payload);
        setMensaje('Colaborador actualizado exitosamente.');
      } else {
        await empleadosAPI.create(payload);
        setMensaje('Colaborador creado exitosamente.');
      }
      setShowForm(false);
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar los datos del colaborador');
    }
  };

  const handleToggleActivo = async (emp: Empleado) => {
    const accion = emp.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de ${accion} a este colaborador?`)) return;

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
        {!showForm && (
          <button
            onClick={handleCreateNewClick}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            Registrar Colaborador
          </button>
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
            {editingId ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cédula / Documento</label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej. 1723456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Correo Electrónico (Email)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@empresa.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombres"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Apellidos"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cargo / Puesto</label>
              <input
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ej. Vendedor"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Departamento</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none"
              >
                <option value="">Selecciona Departamento...</option>
                {departamentos.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Centro de Costos</label>
              <select
                value={selectedCC}
                onChange={(e) => setSelectedCC(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none"
              >
                <option value="">Selecciona Centro...</option>
                {centrosCostos.map(cc => (
                  <option key={cc.id} value={cc.id}>{cc.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-500">Foto de Perfil del Colaborador</label>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 font-medium text-gray-650">
                <input
                  type="radio"
                  name="photoOptionEmp"
                  checked={urlOption === 'url'}
                  onChange={() => setUrlOption('url')}
                />
                Dirección URL (Imagen Web)
              </label>
              <label className="flex items-center gap-1.5 font-medium text-gray-650">
                <input
                  type="radio"
                  name="photoOptionEmp"
                  checked={urlOption === 'file'}
                  onChange={() => setUrlOption('file')}
                />
                Subir o Tomar Foto (Cámara)
              </label>
            </div>

            {urlOption === 'url' ? (
              <input
                type="text"
                value={fotoPerfil}
                onChange={(e) => setFotoPerfil(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none"
              />
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoUpload}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            )}
            {subiendoFoto && <p className="text-[10px] text-gray-400 animate-pulse font-medium">Subiendo foto de perfil...</p>}
            {fotoPerfil && (
              <div className="pt-1">
                <p className="text-[10px] text-emerald-700 font-semibold mb-1">Vista previa:</p>
                <img src={fotoPerfil} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="colaborador_activo"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="rounded text-gray-800"
            />
            <label htmlFor="colaborador_activo" className="text-xs text-gray-600 font-semibold select-none">
              Colaborador Activo
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold transition"
            >
              Guardar Datos
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
                <th className="px-5 py-3.5">Detalle</th>
                <th className="px-5 py-3.5">Cédula</th>
                <th className="px-5 py-3.5">Cargo / Dpto</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {empleados.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.foto_perfil}
                        alt={`${emp.nombre} ${emp.apellido}`}
                        className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                      />
                      <div>
                        <span className="font-bold text-gray-800 block">{emp.nombre} {emp.apellido}</span>
                        <span className="text-[10px] text-gray-400 block">{emp.email || 'Sin correo'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-gray-400">{emp.codigo_empleado}</td>
                  <td className="px-5 py-4">
                    <span className="text-gray-700 font-medium block">{emp.cargo}</span>
                    <span className="text-[10px] text-gray-400 block">{emp.departamento}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                      emp.activo
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {emp.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleEditClick(emp)}
                        className="px-2.5 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg font-semibold text-[10px] transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActivo(emp)}
                        className={`px-2.5 py-1.5 border rounded-lg font-semibold text-[10px] transition ${
                          emp.activo
                            ? 'border-red-200 hover:bg-red-50 text-red-600'
                            : 'border-emerald-200 hover:bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {emp.activo ? 'Desactivar' : 'Activar'}
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
