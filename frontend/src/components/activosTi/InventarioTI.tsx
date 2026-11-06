import React, { useEffect, useMemo, useState } from 'react';
import { activosTiAPI, RegistroActivoTI } from '../../api/activosTi.api';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { SearchAndFilterBar } from '../common/SearchAndFilterBar';
import { Paginacion } from '../common/Paginacion';
import { BotonRecargar } from '../common/BotonRecargar';
import { BotonAccion } from '../common/BotonAccion';
import { ModalImportExport } from '../common/ModalImportExport';
import { ModalFormulario, CampoFormulario } from '../common/ModalFormulario';

// Encabezados EXACTOS del Excel actual: así los reconoce el importador
const COLUMNAS_EXCEL_ACTIVOS = [
  { key: 'acta_numero', label: 'No' },
  { key: 'responsable_nombre', label: 'Responsable' },
  { key: 'responsable_cedula', label: 'CI' },
  { key: 'material', label: 'Materiales/Herramietnas' },
  { key: 'area_responsable', label: 'RESPONSABLE' },
  { key: 'condicion', label: 'CONDICIONES DEL EQUIPO' },
  { key: 'existencia', label: 'EXISTENCIA DEL EQUIPO' },
  { key: 'equipo_tipo', label: 'Equipo Tecnologico' },
  { key: 'total', label: 'Total' },
  { key: 'ingresados', label: 'Ingresados' },
  { key: 'salidos', label: 'Salidos' },
  { key: 'descripcion', label: 'Descripcion' },
  { key: 'serial_marca', label: 'SERIAL - MARCA' },
  { key: 'fecha_acta', label: 'FECHA DE ENTREGA DEL ACTA' },
];

const CONDICIONES_BASE = ['NUEVO', 'BUENO', 'REGULAR', 'MALO'];

const VALORES_NUEVO_ACTIVO = {
  area_responsable: 'TICS',
  condicion: 'NUEVO',
  existencia: 'SI',
  total: 1,
  ingresados: 1,
  salidos: 0,
};

const formatearFecha = (fecha: string | null) =>
  fecha ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES') : '—';

const valoresUnicos = (lista: RegistroActivoTI[], campo: keyof RegistroActivoTI) =>
  Array.from(new Set(lista.map((r) => String(r[campo] ?? '').trim()).filter(Boolean))).sort();

export const InventarioTI: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showConfirm } = useModal();
  const puedeImportar = hasPermission('activos_ti.importar');
  const puedeGestionar = hasPermission('activos_ti.gestionar');

  const [registros, setRegistros] = useState<RegistroActivoTI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Formulario crear / editar
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editando, setEditando] = useState<RegistroActivoTI | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('ALL');
  const [filtroCondicion, setFiltroCondicion] = useState('ALL');
  const [filtroExistencia, setFiltroExistencia] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await activosTiAPI.getAll();
      setRegistros(res.data || []);
    } catch (err) {
      console.error('Error cargando inventario TI:', err);
      setError('No se pudo cargar el inventario de activos TI.');
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ---------- Importación ----------
  const handleImport = async (filas: any[]) => {
    try {
      const res = await activosTiAPI.importar(filas);
      const r = res.data;
      setMensaje(
        `Importación completada: ${r.insertados} registros cargados` +
        (r.sin_empleado ? `, ${r.sin_empleado} con CI no registrada como colaborador` : '') +
        (r.omitidas ? `, ${r.omitidas} filas vacías omitidas` : '') + '.'
      );
      await cargar();
      return { successCount: r.insertados, errors: r.advertencias || [] };
    } catch (err: any) {
      return { successCount: 0, errors: [err?.response?.data?.message || 'No se pudo importar el archivo.'] };
    }
  };

  // ---------- CRUD ----------
  const abrirNuevo = () => {
    setEditando(null);
    setIsFormOpen(true);
  };

  const abrirEdicion = (registro: RegistroActivoTI) => {
    setEditando(registro);
    setIsFormOpen(true);
  };

  const handleGuardar = async (valores: Record<string, any>) => {
    // Si falla, ModalFormulario muestra el mensaje del backend
    const res = editando
      ? await activosTiAPI.actualizar(editando.id, valores)
      : await activosTiAPI.crear(valores);
    setIsFormOpen(false);
    setEditando(null);
    setError('');
    setMensaje(res.message || 'Activo guardado.');
    await cargar();
  };

  const handleEliminar = async (registro: RegistroActivoTI) => {
    const confirmado = await showConfirm({
      title: 'Dar de baja activo',
      message: `¿Seguro que deseas dar de baja "${registro.material || registro.equipo_tipo || 'este activo'}"` +
        (registro.responsable_nombre ? ` de ${registro.responsable_nombre}` : '') + '?',
      confirmLabel: 'Dar de baja',
      type: 'danger',
    });
    if (!confirmado) return;

    try {
      const res = await activosTiAPI.eliminar(registro.id);
      setError('');
      setMensaje(res.message || 'Activo dado de baja.');
      await cargar();
    } catch (err: any) {
      setMensaje('');
      setError(err?.response?.data?.message || 'No se pudo dar de baja el activo.');
    }
  };

  // ---------- Datos derivados ----------
  const tipos = useMemo(() => valoresUnicos(registros, 'equipo_tipo'), [registros]);
  const condiciones = useMemo(() => valoresUnicos(registros, 'condicion'), [registros]);
  const totalColaboradores = useMemo(
    () => new Set(registros.map((r) => r.responsable_cedula).filter(Boolean)).size,
    [registros]
  );
  const sinRegistro = useMemo(
    () => registros.filter((r) => r.responsable_cedula && !r.empleado_id).length,
    [registros]
  );

  const camposActivo: CampoFormulario[] = [
    { name: 'acta_numero', label: 'No. de acta', tipo: 'numero', placeholder: 'Ej. 590' },
    { name: 'fecha_acta', label: 'Fecha de entrega del acta', tipo: 'fecha' },
    { name: 'responsable_cedula', label: 'CI del responsable', tipo: 'texto', placeholder: 'Ej. 1714985452' },
    { name: 'responsable_nombre', label: 'Responsable', tipo: 'texto', placeholder: 'Si se deja vacío, se toma del colaborador' },
    { name: 'equipo_tipo', label: 'Equipo tecnológico', tipo: 'texto', placeholder: 'Ej. MOUSE INALAMBRICO' },
    { name: 'area_responsable', label: 'Área responsable', tipo: 'texto', placeholder: 'Ej. TICS' },
    { name: 'material', label: 'Materiales / Herramientas', tipo: 'texto', colSpan: 2, placeholder: 'Ej. MOUSE INALAMBRICO GENIUS ERGO 8200S' },
    { name: 'serial_marca', label: 'Serial - Marca', tipo: 'texto', placeholder: 'Ej. 5CD232910S - HP' },
    {
      name: 'condicion',
      label: 'Condición del equipo',
      tipo: 'select',
      opciones: Array.from(new Set([...CONDICIONES_BASE, ...condiciones])).map((c) => ({ value: c, label: c })),
    },
    {
      name: 'existencia',
      label: 'Existencia del equipo',
      tipo: 'select',
      opciones: [{ value: 'SI', label: 'SI' }, { value: 'NO', label: 'NO' }],
    },
    { name: 'total', label: 'Total', tipo: 'numero' },
    { name: 'ingresados', label: 'Ingresados', tipo: 'numero' },
    { name: 'salidos', label: 'Salidos', tipo: 'numero' },
    { name: 'descripcion', label: 'Descripción', tipo: 'textarea', colSpan: 2, placeholder: 'Ej. Se entrega mouse ergonómico inalámbrico' },
  ];

  const valoresIniciales = editando
    ? {
        acta_numero: editando.acta_numero ?? '',
        fecha_acta: editando.fecha_acta ?? '',
        responsable_cedula: editando.responsable_cedula ?? '',
        responsable_nombre: editando.responsable_nombre ?? '',
        equipo_tipo: editando.equipo_tipo ?? '',
        area_responsable: editando.area_responsable ?? '',
        material: editando.material ?? '',
        serial_marca: editando.serial_marca ?? '',
        condicion: editando.condicion ?? '',
        existencia: editando.existencia ?? '',
        total: editando.total ?? '',
        ingresados: editando.ingresados ?? '',
        salidos: editando.salidos ?? '',
        descripcion: editando.descripcion ?? '',
      }
    : VALORES_NUEVO_ACTIVO;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return registros.filter((r) => {
      const textoFila = [
        r.acta_numero, r.responsable_nombre, r.responsable_cedula, r.material,
        r.equipo_tipo, r.serial_marca, r.descripcion,
      ].map((v) => String(v ?? '').toLowerCase()).join(' ');

      return (
        (!q || textoFila.includes(q)) &&
        (filtroTipo === 'ALL' || (r.equipo_tipo || '').trim() === filtroTipo) &&
        (filtroCondicion === 'ALL' || (r.condicion || '').trim() === filtroCondicion) &&
        (filtroExistencia === 'ALL' || (r.existencia || '').trim().toUpperCase() === filtroExistencia)
      );
    });
  }, [registros, busqueda, filtroTipo, filtroCondicion, filtroExistencia]);

  const paginados = filtrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalColumnas = puedeGestionar ? 9 : 8;

  return (
    <div className="font-sans space-y-6 max-w-7xl mx-auto">
      {/* CABECERA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Inventario TI</h1>
          <p className="text-sm text-gray-500 mt-1">Activos tecnológicos, materiales y herramientas asignados a colaboradores</p>
          {puedeImportar && (
            <p className="text-[11px] text-gray-400 mt-1">
              Cada importación reemplaza los registros que vinieron del Excel. Los creados manualmente se conservan.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <BotonRecargar onRefresh={cargar} loading={loading} />
          {puedeImportar && (
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold shadow-sm transition"
            >
              Importar / Exportar
            </button>
          )}
          {puedeGestionar && (
            <button
              type="button"
              onClick={abrirNuevo}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              Registrar Activo
            </button>
          )}
        </div>
      </div>

      {mensaje && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">{mensaje}</div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">{error}</div>
      )}

      {/* INDICADORES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Registros</p>
          <p className="text-2xl font-bold text-gray-800">{registros.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Colaboradores con activos</p>
          <p className="text-2xl font-bold text-gray-800">{totalColaboradores}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">CI no registradas</p>
          <p className={`text-2xl font-bold ${sinRegistro ? 'text-amber-600' : 'text-gray-800'}`}>{sinRegistro}</p>
        </div>
      </div>

      <SearchAndFilterBar
        searchPlaceholder="Buscar por responsable, CI, equipo, serial o No. de acta..."
        searchValue={busqueda}
        onSearchChange={(v) => { setBusqueda(v); setCurrentPage(1); }}
        totalResults={filtrados.length}
        totalCount={registros.length}
        resultsLabel="registros"
        selectFilters={[
          {
            id: 'tipo',
            placeholder: 'Todos los equipos',
            value: filtroTipo,
            onChange: (v) => { setFiltroTipo(v); setCurrentPage(1); },
            options: tipos.map((t) => ({ value: t, label: t })),
          },
          {
            id: 'condicion',
            placeholder: 'Todas las condiciones',
            value: filtroCondicion,
            onChange: (v) => { setFiltroCondicion(v); setCurrentPage(1); },
            options: condiciones.map((c) => ({ value: c, label: c })),
          },
          {
            id: 'existencia',
            placeholder: 'Existencia (todas)',
            value: filtroExistencia,
            onChange: (v) => { setFiltroExistencia(v); setCurrentPage(1); },
            options: [
              { value: 'SI', label: 'Existe' },
              { value: 'NO', label: 'No existe' },
            ],
          },
        ]}
      />

      {loading ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl text-gray-400 text-xs">Cargando...</div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                    <th className="px-4 py-3.5">Acta</th>
                    <th className="px-4 py-3.5">Responsable</th>
                    <th className="px-4 py-3.5">Equipo / Material</th>
                    <th className="px-4 py-3.5">Serial - Marca</th>
                    <th className="px-4 py-3.5">Condición</th>
                    <th className="px-4 py-3.5">Existencia</th>
                    <th className="px-4 py-3.5 text-center">Ing. / Sal.</th>
                    <th className="px-4 py-3.5">Fecha acta</th>
                    {puedeGestionar && <th className="px-4 py-3.5 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={totalColumnas} className="px-4 py-10 text-center text-gray-400 font-medium">
                        {registros.length === 0
                          ? 'Aún no hay activos. Usa "Registrar Activo" o "Importar / Exportar" para cargar el Excel.'
                          : 'No hay registros que coincidan con los filtros.'}
                      </td>
                    </tr>
                  ) : (
                    paginados.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 align-top">
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-gray-700 block">{r.acta_numero ?? '—'}</span>
                          {r.origen === 'MANUAL' && (
                            <span className="mt-1 inline-block text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-800 block">{r.responsable_nombre || '—'}</span>
                          <span className="text-[10px] text-gray-400 block">CI: {r.responsable_cedula || '—'}</span>
                          {r.responsable_cedula && !r.empleado_id && (
                            <span className="mt-1 inline-block text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                              CI no registrada
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <span className="font-medium text-gray-800 block">{r.material || r.equipo_tipo || '—'}</span>
                          {r.equipo_tipo && <span className="text-[10px] text-gray-500 block">{r.equipo_tipo}</span>}
                          {r.descripcion && (
                            <span className="text-[10px] text-gray-400 block truncate" title={r.descripcion}>{r.descripcion}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600">{r.serial_marca || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.condicion || '—'}</td>
                        <td className="px-4 py-3">
                          {r.existencia ? (
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                              r.existencia === 'SI'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                              {r.existencia}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{r.ingresados ?? 0} / {r.salidos ?? 0}</td>
                        <td className="px-4 py-3 text-gray-500">{formatearFecha(r.fecha_acta)}</td>
                        {puedeGestionar && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <BotonAccion tipo="editar" onClick={() => abrirEdicion(r)} />
                              <BotonAccion tipo="eliminar" label="Dar de baja" onClick={() => handleEliminar(r)} />
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {filtrados.length > 0 && (
            <Paginacion
              currentPage={currentPage}
              totalItems={filtrados.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </>
      )}

      <ModalImportExport
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Inventario TI"
        columns={COLUMNAS_EXCEL_ACTIVOS}
        data={registros}
        onImport={handleImport}
      />

      <ModalFormulario
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditando(null); }}
        titulo={editando ? 'Editar Activo TI' : 'Registrar Activo TI'}
        campos={camposActivo}
        valoresIniciales={valoresIniciales}
        onGuardar={handleGuardar}
        botonGuardarLabel={editando ? 'Guardar Cambios' : 'Registrar Activo'}
      />
    </div>
  );
};