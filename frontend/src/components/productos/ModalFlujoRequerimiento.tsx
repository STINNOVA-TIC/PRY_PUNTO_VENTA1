import React from 'react';
import { BsCheckCircleFill, BsClockHistory, BsHourglassSplit, BsX } from 'react-icons/bs';

interface ModalFlujoRequerimientoProps {
  orden: any;
  onClose: () => void;
}

export const ModalFlujoRequerimiento: React.FC<ModalFlujoRequerimientoProps> = ({ orden, onClose }) => {
  const formatFechaHora = (fechaStr: string) => {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`;
  };

  // Determinar estados de cada nodo
  // Nodo 1: Elaborado
  const nodoElaborado = {
    completado: true,
    activo: false,
    nombre: orden.orden_compra_elaborado_por || orden.empleado_nombre || 'Sistema',
    firma: orden.orden_compra_firma_elaborador,
    fecha: orden.orden_compra_fecha_firma_elaborador
  };

  // Nodo 2: Aprobado
  const tieneAprobacion = !!orden.orden_compra_firma_aprobador;
  const esAprobacionActiva = orden.estado === 'pendiente'; // espera firma de aprobador
  const nodoAprobador = {
    completado: tieneAprobacion,
    activo: esAprobacionActiva,
    nombre: orden.orden_compra_aprobado_por || 'Gerente Financiera: Dominique Veloz',
    firma: orden.orden_compra_firma_aprobador,
    fecha: orden.orden_compra_fecha_firma_aprobador
  };

  // Nodo 3: Recibido
  const tieneRecepcion = !!orden.orden_compra_firma_recibido;
  const esRecepcionActiva = orden.estado === 'aprobada'; // espera firma de receptor
  const nodoReceptor = {
    completado: tieneRecepcion,
    activo: esRecepcionActiva,
    nombre: orden.orden_compra_recibido_por || 'Compras: Mishell Paucar',
    firma: orden.orden_compra_firma_recibido,
    fecha: orden.orden_compra_fecha_firma_recibido
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 text-left animate-fade-in relative">
        
        {/* Encabezado */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-800">Trazabilidad de Firmas y Aprobaciones</h2>
            <p className="text-xs text-gray-400 mt-0.5">Código de Requerimiento: <span className="font-mono font-bold text-gray-700">{orden.codigo}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-xl transition"
          >
            <BsX className="h-5 w-5" />
          </button>
        </div>

        {/* Flujo Horizontal */}
        <div className="py-6 flex flex-col md:flex-row items-stretch justify-between gap-6 relative">
          
          {/* NODO 1: Elaborado */}
          <div className="flex-1 flex flex-col items-center">
            <div className={`w-full max-w-sm rounded-2xl border p-4 bg-white shadow-sm flex flex-col justify-between h-44 relative transition-all duration-300 ${
              nodoElaborado.completado ? 'border-emerald-200 bg-emerald-50/10' : 'border-gray-200'
            }`}>
              {/* Badge superior */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Elaborado por</span>
                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  <BsCheckCircleFill className="h-3 w-3" /> Firmado
                </span>
              </div>

              {/* Contenido / Firma */}
              <div className="flex-1 flex flex-col justify-center items-center py-2">
                {nodoElaborado.firma ? (
                  <img 
                    src={nodoElaborado.firma} 
                    alt="Firma Elaborador" 
                    className="h-14 object-contain filter drop-shadow"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="text-[11px] text-gray-400 italic font-medium">Firma automática</div>
                )}
              </div>

              {/* Footer del Nodo */}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="font-bold text-gray-700 text-xs truncate" title={nodoElaborado.nombre}>
                  {nodoElaborado.nombre}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 font-mono">
                  {nodoElaborado.fecha ? formatFechaHora(nodoElaborado.fecha) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Línea Conectora 1 */}
          <div className="hidden md:flex items-center justify-center shrink-0 w-8">
            <div className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
              nodoAprobador.completado ? 'bg-emerald-500' : nodoAprobador.activo ? 'bg-amber-400 animate-pulse' : 'bg-gray-200'
            }`} />
          </div>

          {/* NODO 2: Aprobado */}
          <div className="flex-1 flex flex-col items-center">
            <div className={`w-full max-w-sm rounded-2xl border p-4 bg-white shadow-sm flex flex-col justify-between h-44 relative transition-all duration-300 ${
              nodoAprobador.completado 
                ? 'border-emerald-200 bg-emerald-50/10' 
                : nodoAprobador.activo 
                ? 'border-amber-300 bg-amber-50/20 ring-2 ring-amber-300/30' 
                : 'border-gray-200 opacity-60'
            }`}>
              {/* Badge superior */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aprobado por</span>
                {nodoAprobador.completado ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    <BsCheckCircleFill className="h-3 w-3" /> Firmado
                  </span>
                ) : nodoAprobador.activo ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 animate-pulse">
                    <BsHourglassSplit className="h-3 w-3" /> Pendiente
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                    <BsClockHistory className="h-3 w-3" /> En espera
                  </span>
                )}
              </div>

              {/* Contenido / Firma */}
              <div className="flex-1 flex flex-col justify-center items-center py-2">
                {nodoAprobador.completado && nodoAprobador.firma ? (
                  <img 
                    src={nodoAprobador.firma} 
                    alt="Firma Aprobador" 
                    className="h-14 object-contain filter drop-shadow"
                    crossOrigin="anonymous"
                  />
                ) : nodoAprobador.activo ? (
                  <div className="text-[10px] text-amber-600 font-semibold uppercase text-center tracking-wide leading-relaxed">
                    Esperando Firma del<br />Aprobador
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-300 italic font-medium">Bloqueado</div>
                )}
              </div>

              {/* Footer del Nodo */}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="font-bold text-gray-700 text-xs truncate" title={nodoAprobador.nombre}>
                  {nodoAprobador.nombre}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 font-mono">
                  {nodoAprobador.completado && nodoAprobador.fecha ? formatFechaHora(nodoAprobador.fecha) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Línea Conectora 2 */}
          <div className="hidden md:flex items-center justify-center shrink-0 w-8">
            <div className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
              nodoReceptor.completado ? 'bg-emerald-500' : nodoReceptor.activo ? 'bg-amber-400 animate-pulse' : 'bg-gray-200'
            }`} />
          </div>

          {/* NODO 3: Recibido */}
          <div className="flex-1 flex flex-col items-center">
            <div className={`w-full max-w-sm rounded-2xl border p-4 bg-white shadow-sm flex flex-col justify-between h-44 relative transition-all duration-300 ${
              nodoReceptor.completado 
                ? 'border-emerald-200 bg-emerald-50/10' 
                : nodoReceptor.activo 
                ? 'border-amber-300 bg-amber-50/20 ring-2 ring-amber-300/30' 
                : 'border-gray-200 opacity-60'
            }`}>
              {/* Badge superior */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recibido por</span>
                {nodoReceptor.completado ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    <BsCheckCircleFill className="h-3 w-3" /> Firmado
                  </span>
                ) : nodoReceptor.activo ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 animate-pulse">
                    <BsHourglassSplit className="h-3 w-3" /> Pendiente
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                    <BsClockHistory className="h-3 w-3" /> En espera
                  </span>
                )}
              </div>

              {/* Contenido / Firma */}
              <div className="flex-1 flex flex-col justify-center items-center py-2">
                {nodoReceptor.completado && nodoReceptor.firma ? (
                  <img 
                    src={nodoReceptor.firma} 
                    alt="Firma Recibido" 
                    className="h-14 object-contain filter drop-shadow"
                    crossOrigin="anonymous"
                  />
                ) : nodoReceptor.activo ? (
                  <div className="text-[10px] text-amber-600 font-semibold uppercase text-center tracking-wide leading-relaxed">
                    Esperando Firma del<br />Receptor
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-300 italic font-medium">Bloqueado</div>
                )}
              </div>

              {/* Footer del Nodo */}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="font-bold text-gray-700 text-xs truncate" title={nodoReceptor.nombre}>
                  {nodoReceptor.nombre}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 font-mono">
                  {nodoReceptor.completado && nodoReceptor.fecha ? formatFechaHora(nodoReceptor.fecha) : '—'}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Leyenda y Notas */}
        <div className="text-[10.5px] text-gray-500 bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center font-sans">
          <span>* Una vez completadas las 3 firmas, el requerimiento se marcará como <strong>Recibido</strong> y estará listo para descarga oficial en PDF.</span>
          <span className="text-[9.5px] text-gray-400 font-mono">STI-ADQ-RG-001 v01</span>
        </div>
      </div>
    </div>
  );
};
