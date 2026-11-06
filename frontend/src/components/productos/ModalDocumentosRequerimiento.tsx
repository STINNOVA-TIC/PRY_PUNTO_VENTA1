import React, { useEffect, useRef, useState } from 'react';
import { BsX, BsUpload, BsEye, BsDownload, BsTrash3, BsFileEarmarkPdf } from 'react-icons/bs';
import {
  ordenesAPI,
  DocumentoOrden,
//   TIPOS_DOCUMENTO_ORDEN,
  MAX_DOCUMENTOS_ORDEN,
  MAX_TAMANO_DOCUMENTO_MB,
} from '../../api/ordenes.api';
import { useModal } from '../../context/ModalContext';

interface ModalDocumentosRequerimientoProps {
  orden: { id: number; codigo: string } | null;
  puedeGestionar: boolean;
  onClose: () => void;
  onCambio: (ordenId: number, total: number) => void;
}


const formatearTamano = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// const etiquetaTipo = (valor: string) =>
//   TIPOS_DOCUMENTO_ORDEN.find((t) => t.value === valor)?.label || valor;

export const ModalDocumentosRequerimiento: React.FC<ModalDocumentosRequerimientoProps> = ({
  orden,
  puedeGestionar,
  onClose,
  onCambio,
}) => {
  const { showConfirm } = useModal();
  const inputRef = useRef<HTMLInputElement>(null);
    
  const [documentos, setDocumentos] = useState<DocumentoOrden[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo] = useState('FACTURA');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);

  const cargar = async (ordenId: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await ordenesAPI.getDocumentos(ordenId);
      const lista = res.data || [];
      setDocumentos(lista);
      onCambio(ordenId, lista.length);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudieron cargar los documentos.');
      setDocumentos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orden) return;
    setArchivos([]);
    setMensaje('');
    setError('');
    setTipo('FACTURA');
    cargar(orden.id);
  }, [orden?.id]);

  if (!orden) return null;

  const restantes = MAX_DOCUMENTOS_ORDEN - documentos.length;

  const handleSeleccion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seleccion = Array.from(e.target.files || []);
    e.target.value = ''; // permite volver a elegir el mismo archivo
    setError('');
    setMensaje('');

    const rechazados: string[] = [];
    let validos = seleccion.filter((f) => {
      if (!f.name.toLowerCase().endsWith('.pdf') || (f.type && f.type !== 'application/pdf')) {
        rechazados.push(`${f.name}: no es un PDF`);
        return false;
      }
      if (f.size > MAX_TAMANO_DOCUMENTO_MB * 1024 * 1024) {
        rechazados.push(`${f.name}: supera ${MAX_TAMANO_DOCUMENTO_MB} MB`);
        return false;
      }
      return true;
    });

    if (validos.length > restantes) {
      rechazados.push(`Solo se pueden adjuntar ${restantes} documento(s) más (máximo ${MAX_DOCUMENTOS_ORDEN}).`);
      validos = validos.slice(0, restantes);
    }

    setArchivos(validos);
    if (rechazados.length) setError(rechazados.join(' · '));
  };

  const handleSubir = async () => {
    if (archivos.length === 0) return;
    setSubiendo(true);
    setError('');
    setMensaje('');

    let subidos = 0;
    const fallidos: string[] = [];
    for (const archivo of archivos) {
      try {
        await ordenesAPI.subirDocumento(orden.id, archivo, tipo); // uno por uno
        subidos++;
      } catch (err: any) {
        fallidos.push(`${archivo.name}: ${err?.response?.data?.message || 'error al subir'}`);
      }
    }

    setArchivos([]);
    if (subidos) setMensaje(`${subidos} documento(s) adjuntado(s).`);
    if (fallidos.length) setError(fallidos.join(' · '));
    setSubiendo(false);
    await cargar(orden.id);
  };

  const abrirDocumento = async (doc: DocumentoOrden, descargar: boolean) => {
    // La pestaña se abre antes de la descarga para que el navegador no la bloquee
    const ventana = descargar ? null : window.open('', '_blank');
    try {
      const blob = await ordenesAPI.verDocumento(orden.id, doc.id);
      const url = URL.createObjectURL(blob);
      if (descargar) {
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = doc.nombre_original;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
      } else if (ventana) {
        ventana.location.href = url;
      } else {
        window.open(url, '_blank');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      ventana?.close();
      setError('No se pudo abrir el documento.');
    }
  };

  const handleEliminar = async (doc: DocumentoOrden) => {
    const confirmado = await showConfirm({
      title: 'Quitar documento',
      message: `¿Quitar "${doc.nombre_original}" del requerimiento ${orden.codigo}?`,
      confirmLabel: 'Quitar',
      type: 'danger',
    });
    if (!confirmado) return;

    try {
      const res = await ordenesAPI.eliminarDocumento(orden.id, doc.id);
      setMensaje(res.message || 'Documento quitado.');
      await cargar(orden.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo quitar el documento.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-xl overflow-hidden flex flex-col">
        {/* Cabecera */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-start">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Documentos adjuntos</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="font-mono font-bold">{orden.codigo}</span> · {documentos.length} de {MAX_DOCUMENTOS_ORDEN} documentos
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 transition" aria-label="Cerrar">
            <BsX className="text-2xl" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {mensaje && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">{mensaje}</div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-medium">{error}</div>
          )}

          {/* Subida */}
          {puedeGestionar && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {/* <div className="sm:w-56">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Tipo de documento</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    disabled={subiendo}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    {TIPOS_DOCUMENTO_ORDEN.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div> */}

                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={handleSeleccion}
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={subiendo || restantes <= 0}
                  className="h-10 px-4 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                >
                  <BsFileEarmarkPdf /> Seleccionar PDFs
                </button>
                <button
                  type="button"
                  onClick={handleSubir}
                  disabled={subiendo || archivos.length === 0}
                  className="h-10 px-4 rounded-lg bg-gray-900 text-xs font-bold text-white hover:bg-gray-800 disabled:bg-gray-400 transition flex items-center justify-center gap-1.5"
                >
                  <BsUpload /> {subiendo ? 'Subiendo...' : `Subir ${archivos.length || ''} documento(s)`}
                </button>
              </div>

              <p className="text-[10px] text-gray-400">
                Solo PDF · máximo {MAX_TAMANO_DOCUMENTO_MB} MB por archivo · máximo {MAX_DOCUMENTOS_ORDEN} documentos por requerimiento
                {restantes > 0 ? ` · puedes adjuntar ${restantes} más` : ' · límite alcanzado'}
              </p>
                
              {archivos.length > 0 && (
                <ul className="space-y-1">
                  {archivos.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs">
                      <span className="truncate text-gray-700">{f.name} <span className="text-gray-400">({formatearTamano(f.size)})</span></span>
                      <button
                        type="button"
                        onClick={() => setArchivos((prev) => prev.filter((_, idx) => idx !== i))}
                        disabled={subiendo}
                        className="text-gray-400 hover:text-red-600"
                        aria-label="Quitar de la selección"
                      >
                        <BsX className="text-lg" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <p className="text-center py-8 text-xs text-gray-400">Cargando documentos...</p>
          ) : documentos.length === 0 ? (
            <p className="text-center py-8 text-xs text-gray-400">Este requerimiento aún no tiene documentos adjuntos.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
              {documentos.map((doc) => (
                <li key={doc.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <BsFileEarmarkPdf className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-gray-800" title={doc.nombre_original}>{doc.nombre_original}</p>
                      <p className="text-[10px] text-gray-400">
                        {/* <span className="mr-1 rounded bg-gray-100 px-1.5 py-0.5 font-bold uppercase text-gray-600">{etiquetaTipo(doc.tipo)}</span> */}
                        {formatearTamano(doc.tamano_bytes)} · {doc.fecha}{doc.usuario_nombre ? ` · ${doc.usuario_nombre}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => abrirDocumento(doc, false)}
                      className="px-2.5 py-1 rounded-lg border border-gray-300 text-[10px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                    >
                      <BsEye /> Ver
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirDocumento(doc, true)}
                      className="px-2.5 py-1 rounded-lg border border-gray-300 text-[10px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                    >
                      <BsDownload /> Descargar
                    </button>
                    {puedeGestionar && (
                      <button
                        type="button"
                        onClick={() => handleEliminar(doc)}
                        className="px-2.5 py-1 rounded-lg border border-red-200 text-[10px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-1"
                      >
                        <BsTrash3 /> Quitar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};