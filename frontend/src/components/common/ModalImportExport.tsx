import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useModal } from '../../context/ModalContext';

interface ColumnConfig {
  key: string;
  label: string;
}

interface ModalImportExportProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  columns: ColumnConfig[];
  data: any[];
  onImport: (importedRows: any[]) => Promise<{ successCount: number; errors: string[] }>;
}

export const ModalImportExport: React.FC<ModalImportExportProps> = ({
  isOpen,
  onClose,
  title,
  columns,
  data,
  onImport,
}) => {
  const { showAlert } = useModal();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map((c) => c.key));
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  
  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; errors: string[] } | null>(null);
  const [importError, setImportError] = useState('');

  if (!isOpen) return null;

  const handleSelectAll = () => {
    setSelectedColumns(columns.map((c) => c.key));
  };

  const handleSelectNone = () => {
    setSelectedColumns([]);
  };

  const handleCheckboxChange = (key: string) => {
    if (selectedColumns.includes(key)) {
      setSelectedColumns(selectedColumns.filter((c) => c !== key));
    } else {
      setSelectedColumns([...selectedColumns, key]);
    }
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      await showAlert({
        title: 'Selección Requerida',
        message: 'Debes seleccionar al menos una columna para exportar.',
        type: 'warning'
      });
      return;
    }

    // Filtrar y renombrar claves de datos según columnas seleccionadas
    const exportData = data.map((row) => {
      const filteredRow: any = {};
      columns.forEach((col) => {
        if (selectedColumns.includes(col.key)) {
          filteredRow[col.label] = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
        }
      });
      return filteredRow;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_export_${Date.now()}`;

    if (exportFormat === 'xlsx') {
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
      XLSX.writeFile(wb, `${fileName}.csv`, { bookType: 'csv' });
    }
  };

  const handleDownloadTemplate = () => {
    // Generar fila de cabecera con nombres descriptivos de columnas (labels)
    const headers: any = {};
    columns.forEach((col) => {
      headers[col.label] = '';
    });

    const ws = XLSX.utils.json_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');

    const fileName = `plantilla_${title.toLowerCase().replace(/\s+/g, '_')}`;
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setImportResult(null);
      setImportError('');
    }
  };

  const handleImport = () => {
    if (!importFile) {
      setImportError('Por favor selecciona un archivo para importar.');
      return;
    }

    setImporting(true);
    setImportError('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Obtener filas en formato JSON (como arreglos de objetos)
        const rawRows = XLSX.utils.sheet_to_json<any>(ws);

        if (rawRows.length === 0) {
          setImportError('El archivo subido está vacío o no tiene registros válidos.');
          setImporting(false);
          return;
        }

        // Mapear cabeceras traducidas (labels) de vuelta a las propiedades internas del sistema (keys)
        const mappedRows = rawRows.map((rawRow) => {
          const systemRow: any = {};
          columns.forEach((col) => {
            if (rawRow[col.label] !== undefined) {
              systemRow[col.key] = rawRow[col.label];
            }
          });
          return systemRow;
        });

        // Ejecutar callback para guardar los registros
        const result = await onImport(mappedRows);
        setImportResult(result);
      } catch (err: any) {
        console.error(err);
        setImportError('Error al procesar el archivo. Asegúrate de que el formato sea válido.');
      } finally {
        setImporting(false);
      }
    };

    reader.onerror = () => {
      setImportError('Error en la lectura del archivo.');
      setImporting(false);
    };

    reader.readAsBinaryString(importFile);
  };

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera */}
        <div className="bg-gray-50 border-b border-gray-150 px-5 py-4 flex justify-between items-center">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
            Importar / Exportar - {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-lg transition font-bold"
          >
            ✕
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-gray-150 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('export'); setImportResult(null); setImportError(''); }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'export'
                ? 'border-gray-800 text-gray-800 bg-gray-50/40'
                : 'border-transparent text-gray-450 hover:text-gray-700'
            }`}
          >
            📥 Exportar Datos
          </button>
          <button
            onClick={() => { setActiveTab('import'); setImportResult(null); setImportError(''); }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'import'
                ? 'border-gray-800 text-gray-800 bg-gray-50/40'
                : 'border-transparent text-gray-450 hover:text-gray-700'
            }`}
          >
            📤 Importar Datos
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 max-h-[350px] overflow-y-auto space-y-4">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="block text-xs font-bold text-gray-650 uppercase">1. Seleccionar columnas a incluir:</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-[10px] font-bold text-gray-600 hover:underline"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={handleSelectNone}
                    className="text-[10px] font-bold text-gray-600 hover:underline"
                  >
                    Desmarcar Todos
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {columns.map((col) => {
                    const isChecked = selectedColumns.includes(col.key);
                    return (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 text-xs text-gray-750 font-medium select-none cursor-pointer hover:text-gray-900"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(col.key)}
                          className="rounded text-gray-800 focus:ring-0 focus:ring-offset-0"
                        />
                        {col.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-3">
                <span className="block text-xs font-bold text-gray-650 uppercase">2. Formato de salida:</span>
                <div className="flex gap-4 text-xs font-semibold text-gray-750">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'xlsx'}
                      onChange={() => setExportFormat('xlsx')}
                      className="text-gray-800"
                    />
                    Excel (.xlsx)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                      className="text-gray-800"
                    />
                    Delimitado por comas (.csv)
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="bg-gray-50 border border-gray-155 p-3 rounded-lg space-y-1 text-[11px] text-gray-500">
                <p className="font-bold text-gray-650 uppercase text-[9px] tracking-wider mb-1 text-blue-600">Requerimientos de Importación:</p>
                <p>• Los encabezados de las columnas deben coincidir exactamente con los nombres de la plantilla.</p>
                <p>• Los campos obligatorios de la tabla deben estar llenos.</p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="mt-2 text-[10px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  📥 Descargar Plantilla Muestra (.xlsx)
                </button>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-bold text-gray-650 uppercase">Seleccionar archivo (.xlsx o .csv):</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-150 file:text-gray-700 hover:file:bg-gray-200"
                />
              </div>

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
                  {importError}
                </div>
              )}

              {importResult && (
                <div className={`p-3 border rounded-lg space-y-1.5 ${
                  importResult.errors.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <p className="font-bold text-[13px] text-gray-850">Resumen de importación:</p>
                  <p className="text-emerald-700 font-semibold">✓ {importResult.successCount} registros importados correctamente.</p>
                  {importResult.errors.length > 0 && (
                    <div className="pt-1.5 border-t border-gray-200/50 space-y-1 max-h-[100px] overflow-y-auto">
                      <p className="text-amber-800 font-bold uppercase text-[9px]">Errores de inserción ({importResult.errors.length}):</p>
                      {importResult.errors.map((err, i) => (
                        <p key={i} className="text-amber-700 text-[10px] font-medium">• {err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="bg-gray-50 border-t border-gray-155 px-5 py-3.5 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-200 text-gray-750 font-semibold rounded-lg text-xs transition"
          >
            Cerrar
          </button>
          
          {activeTab === 'export' ? (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg text-xs transition active:scale-95 shadow-sm"
            >
              Exportar y Descargar
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={importing || !importFile}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg text-xs transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
            >
              {importing ? 'Importando...' : 'Iniciar Importación'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
