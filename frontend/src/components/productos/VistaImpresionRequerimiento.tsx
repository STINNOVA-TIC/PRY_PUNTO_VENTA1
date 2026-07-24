import React, { useState } from 'react';
import logoEmpresa from '../../assets/logo.png';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useModal } from '../../context/ModalContext';

interface VistaImpresionRequerimientoProps {
  orden: any;
  empresas: any[];
  onClose: () => void;
}

export const VistaImpresionRequerimiento: React.FC<VistaImpresionRequerimientoProps> = ({ orden, empresas, onClose }) => {
  const { showAlert } = useModal();
  const [downloading, setDownloading] = useState(false);


  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const element = document.getElementById('print-area');
      if (!element) {
        await showAlert({
          title: 'Error de Impresión',
          message: 'No se encontró el área de impresión.',
          type: 'danger'
        });
        return;
      }

      // Clonamos el requerimiento para renderizarlo de forma independiente en el body
      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = 'print-area-clone';
      
      // Aplicamos estilos para que se dibuje a tamaño completo en el body pero invisible para el usuario
      Object.assign(clone.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '297mm',
        height: 'auto',
        overflow: 'visible',
        zIndex: '-9999',
        transform: 'none',
        zoom: '1'
      });

      document.body.appendChild(clone);

      // Pequeña espera para que se monte en el DOM antes de renderizar el canvas
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Capturar canvas con alta definición del elemento completo expandido
      const canvas = await html2canvas(clone, {
        scale: 2, // Calidad nítida
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Removemos el clon del body de inmediato
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png');
      
      // Crear PDF con orientación landscape (horizontal) A4 (297mm x 210mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 297
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 210

      // Margen de 10mm en todos los lados
      const margin = 15; // increased margin for better whitespace
      const maxAvailableWidth = pdfWidth - margin * 2; // 277mm
      const maxAvailableHeight = pdfHeight - margin * 2; // 190mm

      // Proporción del canvas
      const canvasRatio = canvas.width / canvas.height;
      const targetRatio = maxAvailableWidth / maxAvailableHeight;

      let finalWidth = maxAvailableWidth;
      let finalHeight = maxAvailableHeight;

      // Si el canvas es más alto proporcionalmente, escalamos respecto al alto disponible
      if (canvasRatio < targetRatio) {
        finalHeight = maxAvailableHeight;
        finalWidth = maxAvailableHeight * canvasRatio;
      } else {
        // Si es más ancho, respecto al ancho disponible
        finalWidth = maxAvailableWidth;
        finalHeight = maxAvailableWidth / canvasRatio;
      }

      // Centrar el requerimiento en la hoja respetando los márgenes
      const xOffset = margin + (maxAvailableWidth - finalWidth) / 2;
      const yOffset = margin + (maxAvailableHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      pdf.save(`Requerimiento-${orden.orden_compra_codigo || '001'}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      await showAlert({
        title: 'Error de Generación',
        message: 'Hubo un error al generar el archivo PDF.',
        type: 'danger'
      });
    } finally {
      setDownloading(false);
    }
  };

  const getTipoArticuloValue = (tipo: string) => {
    const cleanTipo = (orden.orden_compra_tipo_articulo || '').replace('/', '').replace(/\s+/g, ' ').toUpperCase();
    const target = tipo.replace('/', '').replace(/\s+/g, ' ').toUpperCase();
    return cleanTipo === target;
  };

  const formatFecha = (fechaStr: string) => {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return fecha.toLocaleDateString('es-ES', opciones);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Estilos CSS específicos de impresión y previsualización */}
      <style>{`
        /* Escalar la vista previa en pantalla para que quepa en laptops y monitores normales */
        #print-area {
          zoom: 0.9;
        }
        @media (max-width: 1280px) {
          #print-area {
            zoom: 0.75;
          }
        }
        @media (max-width: 1024px) {
          #print-area {
            zoom: 0.65;
          }
        }
        @media (max-width: 768px) {
          #print-area {
            zoom: 0.5;
          }
        }

        @media print {
          @page {
            size: landscape;
            margin: 4mm;
          }
          body * {
            visibility: hidden !important;
          }
          #print-area, #print-area * {
            visibility: visible !important;
          }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 289mm !important; /* A4 landscape width minus margins */
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            font-size: 7px !important; // slightly smaller for more content fit
            zoom: 1 !important; /* Desactivar el zoom de pantalla al imprimir o exportar a PDF */
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Barra superior no imprimible */}
        <div className="no-print bg-gray-100 px-6 py-3 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-xs font-bold text-gray-800">Vista Previa de Requerimiento (Formato A4 Horizontal)</h2>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              {downloading ? '⏳ Generando PDF...' : '💾 Guardar / Descargar PDF'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-gray-55 border border-gray-300 text-gray-750 rounded-lg text-xs font-semibold transition"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Área de visualización/impresión */}
        <div className="p-4 md:p-6 overflow-auto flex-1 bg-gray-100 flex justify-center">
          <div
            id="print-area"
            className="bg-white p-5 border border-gray-400 text-[8px] text-gray-800 font-sans space-y-2 w-[297mm] shadow-none" // reduced base font size
          >
            
            {/* 1. CABECERA PRINCIPAL */}
            <table className="w-full border-collapse border border-gray-400">
              <tbody>
                <tr>
                  <td className="border border-gray-400 p-1.5 w-[20%] text-center">
                    <img src={logoEmpresa} alt="Logo" className="max-h-8 mx-auto object-contain" />
                  </td>
                  <td className="border border-gray-400 p-1 w-[60%] text-center font-bold">
                    <div className="text-[9px] text-gray-500 font-semibold uppercase">Sistema Integrado de Gestión</div>
                    <div className="text-[10.5px] uppercase mt-0.5 tracking-wide">Requerimiento de Bienes y/o Servicios</div>
                  </td>
                  <td className="border border-gray-400 p-1 w-[20%] text-center text-[7.5px] font-medium">
                    <div className="font-bold">STI-ADQ-RG-001</div>
                    <div className="mt-0.5">Versión 01</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2. METADATOS DEL REQUERIMIENTO */}
            <table className="w-full border-collapse border border-gray-400 text-[8px] text-left">
              <tbody>
                <tr className="border-b border-gray-400">
                  <td className="border-r border-gray-400 bg-gray-50 px-2 py-1 font-bold w-[18%]">Fecha:</td>
                  <td className="border-r border-gray-400 px-2 py-1 w-[32%]">
                    {formatFecha(orden.orden_compra_fecha_solicitud)}
                  </td>
                  <td className="border-r border-gray-400 bg-gray-50 px-2 py-1 font-bold w-[20%]">Secuencial del requerimiento:</td>
                  <td className="px-2 py-1 w-[30%] font-mono font-bold">
                    {orden.orden_compra_codigo}
                  </td>
                </tr>
                <tr className="border-b border-gray-400">
                  <td className="border-r border-gray-400 bg-gray-50 px-2 py-1 font-bold">Empresa:</td>
                  <td className="border-r border-gray-400 px-2 py-1">
                    <div className="flex gap-4 flex-wrap">
                      {empresas.map((emp: any) => {
                        const isSelected =
                          orden.empresa_id === emp.empresa_id ||
                          orden.empresa_nombre_comercial?.toUpperCase() === emp.empresa_nombre_comercial?.toUpperCase() ||
                          orden.empresa_nombre?.toUpperCase() === emp.empresa_nombre_comercial?.toUpperCase();

                        return (
                          <label key={emp.empresa_id} className="flex items-center gap-1.5 select-none">
                            <span className={`inline-block w-3 h-3 border border-gray-600 flex-shrink-0 flex items-center justify-center ${
                              isSelected ? 'bg-amber-500 font-extrabold text-[8px]' : 'bg-white'
                            }`}>
                              {isSelected ? 'X' : ''}
                            </span>
                            <span className="font-semibold text-gray-700 uppercase">{emp.empresa_nombre_comercial}</span>
                          </label>
                        );
                      })}
                    </div>
                  </td>
                  <td className="border-r border-gray-400 bg-gray-50 px-2 py-1 font-bold">Persona que solicita:</td>
                  <td className="px-2 py-1 font-semibold text-gray-800">
                    {orden.empleado_nombre || orden.empleado_nombre_completo || 'N/A'}
                  </td>
                </tr>
                <tr className="border-b border-gray-400">
                  <td className="border-r border-gray-400 bg-gray-50 px-2 py-1 font-bold">Departamento que solicita:</td>
                  <td className="border-r border-gray-400 px-2 py-1">
                    {orden.departamento_nombre || 'N/A'}
                  </td>
                  <td className="border-r border-gray-400 bg-gray-50 px-2 py-1 font-bold">Cargo del solicitante:</td>
                  <td className="px-2 py-1">
                    {orden.empleado_cargo || 'N/A'}
                  </td>
                </tr>
                <tr className="border-b border-gray-400">
                  <td className="border-r border-gray-400 bg-gray-50 px-2 py-1 font-bold">Centro de Costos:</td>
                  <td className="border-r border-gray-400 px-2 py-1 font-semibold text-gray-800">
                    {orden.centro_costos_codigo} - {orden.centro_costos_nombre}
                  </td>
                  <td className="border-r border-gray-400 bg-gray-50 px-2 py-1 font-bold">Otro:</td>
                  <td className="px-2 py-1">
                    N/A
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-gray-400 bg-gray-50 px-2 py-1 font-bold">Justificacion de Necesidad:</td>
                  <td className="px-2 py-1 font-medium text-gray-700" colSpan={3}>
                    {orden.orden_compra_justificacion}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 3. TIPO DE ARTÍCULO */}
            <div className="border border-gray-400 rounded overflow-hidden">
              <div className="bg-black text-white text-center py-0.5 font-bold uppercase tracking-wider text-[7.5px]">
                Tipo de Artículo
              </div>
              <table className="w-full border-collapse text-[7.5px] bg-white">
                <tbody>
                  <tr className="border-b border-gray-400">
                    <td className="px-3 py-1 w-[28%] text-left font-semibold">MATERIA PRIMA</td>
                    <td className="px-2 py-1 w-[5%] text-center border-r border-gray-400">
                      <span className={`inline-block w-3 h-3 border border-gray-600 flex items-center justify-center ${getTipoArticuloValue('MATERIA PRIMA') ? 'bg-amber-500 text-[7px] font-bold' : 'bg-white'}`}>
                        {getTipoArticuloValue('MATERIA PRIMA') ? 'X' : ''}
                      </span>
                    </td>
                    <td className="px-3 py-1 w-[28%] text-left font-semibold">HERRAMIENTA</td>
                    <td className="px-2 py-1 w-[5%] text-center border-r border-gray-400">
                      <span className={`inline-block w-3 h-3 border border-gray-600 flex items-center justify-center ${getTipoArticuloValue('HERRAMIENTA') ? 'bg-amber-500 text-[7px] font-bold' : 'bg-white'}`}>
                        {getTipoArticuloValue('HERRAMIENTA') ? 'X' : ''}
                      </span>
                    </td>
                    <td className="px-3 py-1 w-[28%] text-left font-semibold">SERVICIO</td>
                    <td className="px-2 py-1 w-[5%] text-center">
                      <span className={`inline-block w-3 h-3 border border-gray-600 flex items-center justify-center ${getTipoArticuloValue('SERVICIO') ? 'bg-amber-500 text-[7px] font-bold' : 'bg-white'}`}>
                        {getTipoArticuloValue('SERVICIO') ? 'X' : ''}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1 text-left font-semibold">MAQUINARIA O EQUIPO</td>
                    <td className="px-2 py-1 text-center border-r border-gray-400">
                      <span className={`inline-block w-3 h-3 border border-gray-600 flex items-center justify-center ${getTipoArticuloValue('MAQUINARIA O EQUIPO') ? 'bg-amber-500 text-[7px] font-bold' : 'bg-white'}`}>
                        {getTipoArticuloValue('MAQUINARIA O EQUIPO') ? 'X' : ''}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-left font-semibold">SUMINISTROS/ CONSUMIBLES</td>
                    <td className="px-2 py-1 text-center border-r border-gray-400">
                      <span className={`inline-block w-3 h-3 border border-gray-600 flex items-center justify-center ${getTipoArticuloValue('SUMINISTROS/ CONSUMIBLES') || getTipoArticuloValue('SUMINISTROS/CONSUMIBLES') ? 'bg-amber-500 text-[7px] font-bold' : 'bg-white'}`}>
                        {getTipoArticuloValue('SUMINISTROS/ CONSUMIBLES') || getTipoArticuloValue('SUMINISTROS/CONSUMIBLES') ? 'X' : ''}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-left font-semibold">OTROS</td>
                    <td className="px-2 py-1 text-center">
                      <span className={`inline-block w-3 h-3 border border-gray-600 flex items-center justify-center ${getTipoArticuloValue('OTROS') ? 'bg-amber-500 text-[7px] font-bold' : 'bg-white'}`}>
                        {getTipoArticuloValue('OTROS') ? 'X' : ''}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4. TABLA DE ARTÍCULOS */}
            <table className="w-full border-collapse border border-gray-400 text-center">
              <thead>
                <tr className="bg-gray-100 text-[7px] font-bold uppercase border-b border-gray-400">
                  <th className="border border-gray-400 px-1 py-1 w-[5%]">Cantidad</th>
                  <th className="border border-gray-400 px-1 py-1 w-[8%]">Und de Medida</th>
                  <th className="border border-gray-400 px-1.5 py-1 w-[22%]">Descripción del Servicio</th>
                  <th className="border border-gray-400 px-1 py-1 w-[15%]">Foto o Imagen</th>
                  <th className="border border-gray-400 px-1 py-1 w-[12%]">Proveedor Sugerido</th>
                  <th className="border border-gray-400 px-1 py-1 w-[8%]">Negociación Previa</th>
                  <th className="border border-gray-400 px-1 py-1 w-[8%]">Precio</th>
                  <th className="border border-gray-400 px-1 py-1 w-[8%]">Forma de Pago</th>
                  <th className="border border-gray-400 px-1 py-1 w-[8%]">Plazos de Pago</th>
                  <th className="border border-gray-400 px-1 py-1 w-[8%]">Tiempo de Entrega</th>
                  <th className="border border-gray-400 px-1 py-1 w-[10%]">Centro de Costos</th>
                  <th className="border border-gray-400 px-1 py-1 w-[15%]">Comentario</th>
                </tr>
              </thead>
              <tbody className="text-[7.5px]">
                {orden.detalles?.map((d: any) => (
                  <tr key={d.id}>
                    <td className="border border-gray-400 p-0.5 font-bold">{d.orden_compra_detalle_cantidad}</td>
                    <td className="border border-gray-400 p-0.5 uppercase">{d.orden_compra_detalle_unidad_medida}</td>
                    <td className="border border-gray-400 p-1 text-left">{d.orden_compra_detalle_descripcion}</td>
                    <td className="border border-gray-400 p-0.5">
                      {d.orden_compra_detalle_foto || d.producto_foto ? (
                        <img
                          src={d.orden_compra_detalle_foto || d.producto_foto}
                          alt="Img"
                          className="h-8 w-auto object-contain mx-auto border border-gray-200 rounded p-0.5"
                        />
                      ) : (
                        <span className="text-gray-300 italic text-[6.5px]">Sin imagen</span>
                      )}
                    </td>
                    <td className="border border-gray-400 p-0.5 uppercase">{orden.proveedor_nombre || 'N/A'}</td>
                    <td className="border border-gray-400 p-0.5 font-semibold">{d.orden_compra_detalle_negociacion_previa}</td>
                    <td className="border border-gray-400 p-0.5 font-mono font-semibold">
                      {Number(d.orden_compra_detalle_precio_unitario).toFixed(2)} + IVA
                    </td>
                    <td className="border border-gray-400 p-0.5 uppercase">{d.orden_compra_detalle_forma_pago || 'CONTADO'}</td>
                    <td className="border border-gray-400 p-0.5 uppercase">{d.orden_compra_detalle_plazo_pago || 'INMEDIATO'}</td>
                    <td className="border border-gray-400 p-0.5 uppercase">{d.orden_compra_detalle_tiempo_entrega || 'INMEDIATO'}</td>
                    <td className="border border-gray-400 p-0.5 font-mono font-semibold uppercase">{orden.centro_costos_codigo}</td>
                    <td className="border border-gray-400 p-1 text-left text-gray-500 italic">
                      {d.orden_compra_detalle_comentario || 'S/C'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 5. CARACTERÍSTICAS ESPECÍFICAS */}
            <table className="w-full border-collapse border border-gray-400">
              <tbody>
                <tr>
                  <td className="border border-gray-400 bg-gray-50 p-1.5 w-[22%] font-semibold uppercase tracking-wider text-[7.5px]">
                    Características Específicas del Producto o Servicio
                  </td>
                  <td className="border border-gray-400 p-1.5 text-left italic">
                    {orden.orden_compra_caracteristicas || 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 6. LUGAR DE ENTREGA & ADICIONALES */}
            <div className="flex gap-3 items-start">
              {/* Lugar de Entrega */}
              <div className="w-[45%]">
                <table className="w-full border-collapse border border-gray-400 text-center text-[7.5px]">
                  <thead>
                    <tr className="bg-gray-100 font-bold uppercase text-[7px]">
                      <th className="border border-gray-400 py-0.5" colSpan={2}>Lugar donde se debe recibir producto o servicio</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 p-0.5 text-left w-[75%] font-medium">Alangasi</td>
                      <td className="border border-gray-400 p-0.5 w-[25%] font-bold text-center">
                        {orden.orden_compra_lugar_recepcion?.toUpperCase() === 'ALANGASI' ? 'X' : ''}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 p-0.5 text-left font-medium">Tambillo</td>
                      <td className="border border-gray-400 p-0.5 font-bold text-center">
                        {orden.orden_compra_lugar_recepcion?.toUpperCase() === 'TAMBILLO' ? 'X' : ''}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 p-0.5 text-left font-medium">Otros</td>
                      <td className="border border-gray-400 p-0.5 font-bold text-center">
                        {(!orden.orden_compra_lugar_recepcion || (orden.orden_compra_lugar_recepcion?.toUpperCase() !== 'ALANGASI' && orden.orden_compra_lugar_recepcion?.toUpperCase() !== 'TAMBILLO')) ? 'X' : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Adicionales */}
              <div className="w-[55%]">
                <table className="w-full border-collapse border border-gray-400 text-[7.5px]">
                  <thead>
                    <tr className="bg-gray-100 font-bold uppercase text-[7px] text-center">
                      <th className="border border-gray-400 py-0.5 w-[60%]">Adicionales</th>
                      <th className="border border-gray-400 py-0.5 w-[20%]">Si</th>
                      <th className="border border-gray-400 py-0.5 w-[20%]">No</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 px-2 py-0.5">Requiere realizar contrato</td>
                      <td className="border border-gray-400 text-center font-bold">{orden.orden_compra_requiere_contrato ? 'x' : ''}</td>
                      <td className="border border-gray-400 text-center font-bold">{!orden.orden_compra_requiere_contrato ? 'x' : ''}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 px-2 py-0.5">Requiere contratacion de seguro</td>
                      <td className="border border-gray-400 text-center font-bold">{orden.orden_compra_requiere_seguro ? 'x' : ''}</td>
                      <td className="border border-gray-400 text-center font-bold">{!orden.orden_compra_requiere_seguro ? 'x' : ''}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 px-2 py-0.5">Requiere mantenimiento Preventivo</td>
                      <td className="border border-gray-400 text-center font-bold">{orden.orden_compra_requiere_mantenimiento ? 'x' : ''}</td>
                      <td className="border border-gray-400 text-center font-bold">{!orden.orden_compra_requiere_mantenimiento ? 'x' : ''}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 px-2 py-0.5">Sera asignado algun Trabajador</td>
                      <td className="border border-gray-400 text-center font-bold">{orden.orden_compra_asignado_trabajador ? 'x' : ''}</td>
                      <td className="border border-gray-400 text-center font-bold">{!orden.orden_compra_asignado_trabajador ? 'x' : ''}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 px-2 py-0.5 font-semibold">Nombre a quien sera asignado</td>
                      <td className="border border-gray-400 text-center font-mono italic" colSpan={2}>
                        {orden.orden_compra_trabajador_asignado || 'N/A'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 7. SECCIÓN DE FIRMAS Y RESPONSABLES */}
            <div className="grid grid-cols-3 gap-4 pt-1 text-center">
              <div className="border border-gray-400 p-1.5 h-11 flex flex-col justify-between rounded bg-white">
                <div className="font-bold text-[6.5px] uppercase text-gray-500 text-left">Elaborado por:</div>
                <div className="font-semibold text-gray-800 text-[7.5px]">{orden.orden_compra_elaborado_por || 'TIC: David Quishpe'}</div>
              </div>
              <div className="border border-gray-400 p-1.5 h-11 flex flex-col justify-between rounded bg-white">
                <div className="font-bold text-[6.5px] uppercase text-gray-500 text-left">Aprobado por:</div>
                <div className="font-semibold text-gray-800 text-[7.5px]">{orden.orden_compra_aprobado_por || 'Gerente Financiera: Dominique Veloz'}</div>
              </div>
              <div className="border border-gray-400 p-1.5 h-11 flex flex-col justify-between rounded bg-white">
                <div className="font-bold text-[6.5px] uppercase text-gray-500 text-left">Recibido por:</div>
                <div className="font-semibold text-gray-800 text-[7.5px]">{orden.orden_compra_recibido_por || 'Compras: Mishell Paucar'}</div>
              </div>
            </div>

            {/* 8. CONTROL DE CAMBIOS */}
            <div className="border border-gray-400 rounded overflow-hidden">
              <div className="bg-amber-500 text-black text-center py-0.5 font-bold uppercase text-[7px]">
                Control de Cambios
              </div>
              <table className="w-full border-collapse text-[6.5px] text-center">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-300 font-semibold uppercase">
                    <th className="border-r border-gray-300 py-0.5 w-[10%]">Versión</th>
                    <th className="border-r border-gray-300 py-0.5 w-[25%]">Fecha de creación / actualización</th>
                    <th className="border-r border-gray-300 py-0.5 w-[40%]">Motivo del cambio</th>
                    <th className="border-r border-gray-300 py-0.5 w-[15%]">Aprobado por</th>
                    <th className="py-0.5 w-[10%]">Fecha de aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-250">
                    <td className="border-r border-gray-300 p-0.5 font-semibold">00</td>
                    <td className="border-r border-gray-300 p-0.5">31/10/2024</td>
                    <td className="border-r border-gray-300 p-0.5 text-left">Versión inicial - Creación del documento</td>
                    <td className="border-r border-gray-300 p-0.5">Gerente de Operaciones</td>
                    <td className="p-0.5">31/10/2024</td>
                  </tr>
                  <tr>
                    <td className="border-r border-gray-300 p-0.5 font-semibold">01</td>
                    <td className="border-r border-gray-300 p-0.5">22/05/2025</td>
                    <td className="border-r border-gray-300 p-0.5 text-left">Estandarización del formato y se modifica al encargado de aprobar el documento conforme a la estructura</td>
                    <td className="border-r border-gray-300 p-0.5">Gerente de Operaciones</td>
                    <td className="p-0.5">26/05/2025</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 9. REFERENCIAS */}
            <div className="border border-gray-400 rounded overflow-hidden">
              <div className="bg-amber-500 text-black text-center py-0.5 font-bold uppercase text-[7px]">
                Referencias
              </div>
              <div className="grid grid-cols-3 text-[6.5px] text-center bg-gray-50 py-0.5 border-b border-gray-300">
                <div className="border-r border-gray-300">
                  <span className="font-bold">ISO 9001:2015</span> Sistema Gestión de Calidad
                </div>
                <div className="border-r border-gray-300">
                  <span className="font-bold">CAP 7</span> Apoyo
                </div>
                <div>
                  <span className="font-bold">7.1</span> Recursos <span className="font-bold">7.1.1</span> Generalidades
                </div>
              </div>
              <div className="grid grid-cols-3 text-[6.5px] text-center bg-white py-0.5">
                <div className="border-r border-gray-300">
                  <span className="font-semibold block text-[5px] text-gray-450 uppercase">Elaborado por:</span>
                  Ejecutivo de Compras Locales
                </div>
                <div className="border-r border-gray-300">
                  <span className="font-semibold block text-[5px] text-gray-450 uppercase">Revisado por:</span>
                  Gerente de Operaciones
                </div>
                <div>
                  <span className="font-semibold block text-[5px] text-gray-450 uppercase">Aprobado por:</span>
                  Gerente de Operaciones
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-between items-center text-[6px] text-gray-400 pt-0.5 border-t border-gray-150">
              <span>Una vez impreso el documento será considerado como COPIA NO CONTROLADA.</span>
              <span className="font-semibold">Página 1 de 1</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
