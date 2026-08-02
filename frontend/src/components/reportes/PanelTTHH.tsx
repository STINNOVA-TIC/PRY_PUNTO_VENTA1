import React, { useState, useEffect, useMemo } from 'react';
import { devolucionesAPI } from '../../api/devoluciones.api';
import { reportesAPI } from '../../api/reportes.api';
import { autoconsumoAPI } from '../../api/autoconsumo.api';
import { Autoconsumo } from '../../types';
import { useSocket } from '../../context/SocketContext';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BotonRecargar } from '../common/BotonRecargar';
import { BotonDescargar } from '../common/BotonDescargar';
import { Paginacion } from '../common/Paginacion';
import { BotonAccion } from '../common/BotonAccion';
import { ModalDetalle } from '../common/ModalDetalle';
import { useModal } from '../../context/ModalContext';

export const PanelTTHH: React.FC = () => {
  const { showAlert } = useModal();
  const [devoluciones, setDevoluciones] = useState<any[]>([]);
  const [reporteConsumo, setReporteConsumo] = useState<any[]>([]);
  const [transacciones, setTransacciones] = useState<any[]>([]);
  const { socket } = useSocket();
  const [showRechazoModal, setShowRechazoModal] = useState(false);
  const [selectedDevId, setSelectedDevId] = useState<number | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [moduloActivo, setModuloActivo] = useState<'reportes' | 'devoluciones' | 'autoconsumos'>('reportes');
  
  // Estados de Autoconsumo
  const [autoconsumos, setAutoconsumos] = useState<Autoconsumo[]>([]);
  const [autoconsumoObservacion, setAutoconsumoObservacion] = useState('');
  const [showRechazoAutoModal, setShowRechazoAutoModal] = useState(false);
  const [selectedAutoId, setSelectedAutoId] = useState<number | null>(null);
  const [motivoRechazoAuto, setMotivoRechazoAuto] = useState('');

  // Estados de rango de fechas (calendario)
  const getTodayStr = () => new Date().toISOString().slice(0, 10);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('todos');

  // Pestanias
  const [activeTab, setActiveTab] = useState<'resumen' | 'detalle' | 'autoconsumos_reporte'>('resumen');

  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Filtros avanzados del reporte detallado (Transacciones)
  const [searchEmpleado, setSearchEmpleado] = useState('');
  const [searchProducto, setSearchProducto] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCC, setSelectedCC] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'empleado' | 'producto' | 'categoria' | 'centro_costos' | 'departamento'>('none');
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});

  // Paginación de pestañas de reportes
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Paginación de historiales (devoluciones procesadas y autoconsumos procesados)
  const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
  const [itemsPerPageHistorial, setItemsPerPageHistorial] = useState(10);

  // Paginación de solicitudes pendientes (devoluciones y autoconsumos)
  const [currentPagePendientes, setCurrentPagePendientes] = useState(1);
  const [itemsPerPagePendientes, setItemsPerPagePendientes] = useState(10);

  // Detalle de registros en historiales
  const [detalleDevolucion, setDetalleDevolucion] = useState<any>(null);
  const [detalleAutoconsumo, setDetalleAutoconsumo] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    if (socket) {
      socket.on('devolucion-actualizada', () => {
        console.log('[WS] Devolucion/Cancelacion actualizada en TTHH. Recargando...');
        cargarDatos();
      });

      socket.on('entrega-pendiente', () => {
        console.log('[WS] Nueva entrega en TTHH. Recargando...');
        cargarDatos();
      });

      socket.on('entrega-realizada', () => {
        console.log('[WS] Entrega confirmada. Recargando...');
        cargarDatos();
      });

      socket.on('autoconsumo-pendiente', () => {
        console.log('[WS] Nuevo autoconsumo pendiente. Recargando...');
        cargarDatos();
      });

      socket.on('autoconsumo-actualizado', () => {
        console.log('[WS] Autoconsumo actualizado. Recargando...');
        cargarDatos();
      });
    }

    return () => {
      if (socket) {
        socket.off('devolucion-actualizada');
        socket.off('entrega-pendiente');
        socket.off('entrega-realizada');
        socket.off('autoconsumo-pendiente');
        socket.off('autoconsumo-actualizado');
      }
    };
  }, [socket, fechaInicio, fechaFin]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setMensaje('');
      setError('');

      const devRes = await devolucionesAPI.getAll();
      setDevoluciones(devRes.data);

      const repRes = await reportesAPI.getConsumoEmpleados(
        fechaInicio || undefined,
        fechaFin || undefined
      );
      setReporteConsumo(repRes.data);

      const transRes = await reportesAPI.getTransaccionesDetalladas(
        fechaInicio || undefined,
        fechaFin || undefined
      );
      setTransacciones(transRes.data);

      try {
        const autoRes = await autoconsumoAPI.getAll();
        setAutoconsumos(autoRes.data);
      } catch (err) {
        console.error('Error al cargar autoconsumos:', err);
      }
    } catch (err: any) {
      console.error('Error al cargar datos de Talento Humano:', err);
      setError('No se pudieron cargar los datos de Talento Humano.');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltroRapido = (tipo: string) => {
    setFilterType(tipo);
    const today = new Date();

    if (tipo === 'hoy') {
      const todayStr = today.toISOString().slice(0, 10);
      setFechaInicio(todayStr);
      setFechaFin(todayStr);
    } else if (tipo === 'semana') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      setFechaInicio(monday.toISOString().slice(0, 10));
      setFechaFin(getTodayStr());
    } else if (tipo === 'mes') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFechaInicio(firstDay.toISOString().slice(0, 10));
      setFechaFin(getTodayStr());
    } else if (tipo === 'anio') {
      const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
      setFechaInicio(firstDayOfYear.toISOString().slice(0, 10));
      setFechaFin(getTodayStr());
    } else if (tipo === 'todos') {
      setFechaInicio('');
      setFechaFin('');
    }
  };

  const handleAprobar = async (id: number) => {
    try {
      await devolucionesAPI.aprobar(id);
      setMensaje('Devolucion aprobada con exito. El entregador ya puede proceder.');
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al aprobar devolucion');
    }
  };

  const openRechazoModal = (id: number) => {
    setSelectedDevId(id);
    setShowRechazoModal(true);
    setMotivoRechazo('');
  };

  const handleRechazarSubmit = async () => {
    if (!selectedDevId || !motivoRechazo.trim()) return;

    try {
      await devolucionesAPI.rechazar(selectedDevId, motivoRechazo.trim());
      setMensaje('Devolucion rechazada con exito.');
      setShowRechazoModal(false);
      setSelectedDevId(null);
      setMotivoRechazo('');
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al rechazar devolucion');
    }
  };

  const handleAprobarAutoconsumo = async (id: number) => {
    try {
      await autoconsumoAPI.aprobar(id, autoconsumoObservacion || 'Aprobado por Talento Humano');
      setMensaje('Solicitud de autoconsumo aprobada con éxito. El guardia/despachador ya puede realizar la entrega.');
      setAutoconsumoObservacion('');
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al aprobar el autoconsumo');
    }
  };

  const openRechazoAutoModal = (id: number) => {
    setSelectedAutoId(id);
    setShowRechazoAutoModal(true);
    setMotivoRechazoAuto('');
  };

  const handleRechazarAutoSubmit = async () => {
    if (!selectedAutoId || !motivoRechazoAuto.trim()) return;

    try {
      await autoconsumoAPI.cancelar(selectedAutoId, { observacion: motivoRechazoAuto.trim(), esRechazo: true });
      setMensaje('Solicitud de autoconsumo rechazada.');
      setShowRechazoAutoModal(false);
      setSelectedAutoId(null);
      setMotivoRechazoAuto('');
      cargarDatos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al rechazar autoconsumo');
    }
  };

  // Filtrado de transacciones
  const transaccionesFiltradas = useMemo(() => {
    return transacciones.filter(t => {
      const matchEmpleado = t.empleado_nombre.toLowerCase().includes(searchEmpleado.toLowerCase()) ||
        t.empleado_cedula.includes(searchEmpleado);
      const matchProducto = t.producto_nombre.toLowerCase().includes(searchProducto.toLowerCase()) ||
        t.producto_codigo.toLowerCase().includes(searchProducto.toLowerCase());
      const matchDept = selectedDept ? t.departamento === selectedDept : true;
      const matchCC = selectedCC ? t.centro_costos === selectedCC : true;
      const matchCat = selectedCat ? t.categoria === selectedCat : true;

      return matchEmpleado && matchProducto && matchDept && matchCC && matchCat;
    });
  }, [transacciones, searchEmpleado, searchProducto, selectedDept, selectedCC, selectedCat]);

  // Filtrado de autoconsumos para reportes
  const autoconsumosFiltrados = useMemo(() => {
    return autoconsumos.filter(a => {
      if (!a) return false;
      const matchEmpleado = searchEmpleado ? (
        a.empleado.nombre.toLowerCase().includes(searchEmpleado.toLowerCase()) ||
        a.empleado.cedula.includes(searchEmpleado)
      ) : true;

      const matchDept = selectedDept ? a.departamento.nombre === selectedDept : true;

      const date = new Date(a.fecha_solicitud);
      if (fechaInicio) {
        const start = new Date(fechaInicio);
        start.setHours(0,0,0,0);
        if (date < start) return false;
      }
      if (fechaFin) {
        const end = new Date(fechaFin);
        end.setHours(23,59,59,999);
        if (date > end) return false;
      }

      return matchEmpleado && matchDept;
    });
  }, [autoconsumos, searchEmpleado, selectedDept, fechaInicio, fechaFin]);

  // Filtrado de consumo acumulado (resumen nomina)
  const reporteConsumoFiltrado = useMemo(() => {
    return reporteConsumo.filter(row => {
      const matchEmpleado = searchEmpleado ? (
        row.empleado.toLowerCase().includes(searchEmpleado.toLowerCase()) ||
        row.codigo.includes(searchEmpleado)
      ) : true;
      const matchDept = selectedDept ? row.departamento === selectedDept : true;
      return matchEmpleado && matchDept;
    });
  }, [reporteConsumo, searchEmpleado, selectedDept]);

  // Consumo acumulado agrupado
  const resumenAgrupado = useMemo(() => {
    if (groupBy === 'none') return [];
    
    const groups: { [key: string]: { items: any[]; total: number; compras: number } } = {};
    
    reporteConsumoFiltrado.forEach(row => {
      let key = 'General';
      if (groupBy === 'departamento') key = row.departamento;
      if (groupBy === 'empleado') key = row.empleado;
      
      if (!groups[key]) {
        groups[key] = { items: [], total: 0, compras: 0 };
      }
      groups[key].items.push(row);
      groups[key].total += row.total_gastado;
      groups[key].compras += row.total_compras;
    });
    
    return Object.keys(groups).map(key => ({
      name: key,
      items: groups[key].items,
      total: groups[key].total,
      compras: groups[key].compras
    }));
  }, [reporteConsumoFiltrado, groupBy]);

  // Autoconsumos agrupados
  const autoconsumosAgrupados = useMemo(() => {
    if (groupBy === 'none') return [];
    
    const groups: { [key: string]: { items: any[]; total: number; count: number } } = {};
    
    autoconsumosFiltrados.forEach((a: any) => {
      let key = 'General';
      if (groupBy === 'departamento') key = a.departamento.nombre;
      if (groupBy === 'empleado') key = a.empleado.nombre;
      if (groupBy === 'centro_costos') key = a.centro_costos?.nombre || 'Sin Centro de Costos';
      
      if (!groups[key]) {
        groups[key] = { items: [], total: 0, count: 0 };
      }
      const total = a.detalles?.reduce((sum: number, d: any) => sum + d.subtotal, 0) || 0;
      groups[key].items.push(a);
      groups[key].total += total;
      groups[key].count += 1;
    });
    
    return Object.keys(groups).map(key => ({
      name: key,
      items: groups[key].items,
      total: groups[key].total,
      count: groups[key].count
    }));
  }, [autoconsumosFiltrados, groupBy]);

  // Filtros dinamicos extraidos de transacciones activas
  const departamentosUnicos = useMemo(() => Array.from(new Set(transacciones.map(t => t.departamento).filter(Boolean))), [transacciones]);
  const centrosCostosUnicos = useMemo(() => Array.from(new Set(transacciones.map(t => t.centro_costos).filter(Boolean))), [transacciones]);
  const categoriasUnicas = useMemo(() => Array.from(new Set(transacciones.map(t => t.categoria).filter(Boolean))), [transacciones]);

  // Agrupamiento
  const getGroupKey = (t: any) => {
    if (groupBy === 'empleado') return t.empleado_nombre;
    if (groupBy === 'producto') return t.producto_nombre;
    if (groupBy === 'categoria') return t.categoria;
    if (groupBy === 'centro_costos') return t.centro_costos;
    if (groupBy === 'departamento') return t.departamento;
    return 'General';
  };

  const transaccionesAgrupadas = useMemo(() => {
    if (groupBy === 'none') return [];

    const groups: { [key: string]: { items: any[]; total: number; cantidad: number } } = {};

    transaccionesFiltradas.forEach(t => {
      const key = getGroupKey(t);
      if (!groups[key]) {
        groups[key] = { items: [], total: 0, cantidad: 0 };
      }
      groups[key].items.push(t);
      groups[key].total += t.total;
      groups[key].cantidad += t.cantidad;
    });

    return Object.entries(groups).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.total - a.total);
  }, [transaccionesFiltradas, groupBy]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Reiniciar a la primera página cuando cambian filtros, pestañas o tamaño de página
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, groupBy, searchEmpleado, searchProducto, selectedDept, selectedCC, selectedCat, fechaInicio, fechaFin, itemsPerPage]);

  // Reiniciar página del historial al cambiar de módulo
  useEffect(() => {
    setCurrentPageHistorial(1);
    setCurrentPagePendientes(1);
  }, [moduloActivo]);

  // Slices paginados por pestaña
  const reporteConsumoPaginado = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return reporteConsumoFiltrado.slice(start, start + itemsPerPage);
  }, [reporteConsumoFiltrado, currentPage, itemsPerPage]);

  const transaccionesPaginadas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return transaccionesFiltradas.slice(start, start + itemsPerPage);
  }, [transaccionesFiltradas, currentPage, itemsPerPage]);

  const autoconsumosPaginados = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return autoconsumosFiltrados.slice(start, start + itemsPerPage);
  }, [autoconsumosFiltrados, currentPage, itemsPerPage]);

  // Exportar Consumo Acumulado (Resumen) a CSV
  const exportarResumenCSV = async () => {
    const listado = reporteConsumoFiltrado;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay consumos filtrados para exportar.',
        type: 'warning'
      });
      return;
    }

    const headers = ['Colaborador', 'Cedula', 'Departamento', 'No. Compras', 'Total a Descontar'];
    const rows = listado.map(row => [
      row.empleado,
      row.codigo,
      row.departamento,
      row.total_compras,
      row.total_gastado.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const fInicio = fechaInicio || 'INICIO';
    const fFin = fechaFin || 'FIN';

    link.setAttribute('href', url);
    link.setAttribute('download', `Nomina_Consumo_Acumulado_${fInicio}_a_${fFin}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar Consumo Acumulado (Resumen) a XLSX
  const exportarResumenXLSX = async () => {
    const listado = reporteConsumoFiltrado;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay consumos filtrados para exportar.',
        type: 'warning'
      });
      return;
    }

    const rows = listado.map(row => ({
      'Colaborador': row.empleado,
      'Cédula': row.codigo,
      'Departamento': row.departamento,
      'No. Compras': row.total_compras,
      'Total a Descontar': row.total_gastado
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen_Nomina');

    const fInicio = fechaInicio || 'INICIO';
    const fFin = fechaFin || 'FIN';
    XLSX.writeFile(workbook, `Nomina_Consumo_Acumulado_${fInicio}_a_${fFin}.xlsx`);
  };

  // Exportar Consumo Acumulado (Resumen) a PDF
  const exportarResumenPDF = async () => {
    const listado = reporteConsumoFiltrado;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay consumos filtrados para exportar.',
        type: 'warning'
      });
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFontSize(16);
    doc.text('Resumen de Consumo Acumulado para Nómina', 14, 15);
    doc.setFontSize(10);
    
    const fInicio = fechaInicio || 'INICIO';
    const fFin = fechaFin || 'FIN';
    doc.text(`Rango de Fechas: ${fInicio} a ${fFin}`, 14, 22);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 14, 27);

    const headers = [['Colaborador', 'Cédula', 'Departamento', 'No. Compras', 'Total a Descontar']];
    const rows = listado.map(row => [
      row.empleado,
      row.codigo,
      row.departamento,
      row.total_compras,
      `$${row.total_gastado.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 32,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] }, // Slate-800
      styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(`Nomina_Consumo_Acumulado_${fInicio}_a_${fFin}.pdf`);
  };

  // Exportar Autoconsumos a CSV
  const exportarAutoconsumosCSV = async () => {
    const listado = autoconsumosFiltrados;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay autoconsumos filtrados para exportar.',
        type: 'warning'
      });
      return;
    }

    const headers = ['Codigo', 'Fecha Solicitud', 'Empleado', 'Cedula', 'Departamento', 'Centro de Costos', 'Justificacion', 'Productos', 'Estado', 'Aprobador', 'Despachador', 'Total'];

    const rows = listado.map(a => {
      const total = a.detalles?.reduce((sum: number, d: any) => sum + d.subtotal, 0) || 0;
      const productsText = a.detalles?.map((d: any) => `${d.producto_nombre} (x${d.cantidad})`).join(' | ') || '-';
      return [
        a.codigo,
        new Date(a.fecha_solicitud).toLocaleString(),
        a.empleado.nombre,
        a.empleado.cedula,
        a.departamento.nombre,
        a.centro_costos?.nombre || '-',
        a.justificacion,
        productsText,
        a.estado,
        a.aprobador || '-',
        a.despachador || '-',
        total.toFixed(2)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const fInicio = fechaInicio || 'INICIO';
    const fFin = fechaFin || 'FIN';

    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Autoconsumos_${fInicio}_a_${fFin}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar Autoconsumos a Excel (XLSX)
  const exportarAutoconsumosXLSX = async () => {
    const listado = autoconsumosFiltrados;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay autoconsumos filtrados para exportar.',
        type: 'warning'
      });
      return;
    }

    const rows = listado.map(a => {
      const total = a.detalles?.reduce((sum: number, d: any) => sum + d.subtotal, 0) || 0;
      const productsText = a.detalles?.map((d: any) => `${d.producto_nombre} (x${d.cantidad})`).join(', ') || '-';
      return {
        'Código': a.codigo,
        'Fecha Solicitud': new Date(a.fecha_solicitud).toLocaleString(),
        'Empleado': a.empleado.nombre,
        'Cédula': a.empleado.cedula,
        'Departamento': a.departamento.nombre,
        'Centro de Costos': a.centro_costos?.nombre || '-',
        'Justificación': a.justificacion,
        'Productos': productsText,
        'Estado': a.estado,
        'Aprobador': a.aprobador || '-',
        'Despachador': a.despachador || '-',
        'Total': total
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Autoconsumos');

    const fInicio = fechaInicio || 'INICIO';
    const fFin = fechaFin || 'FIN';
    XLSX.writeFile(workbook, `Reporte_Autoconsumos_${fInicio}_a_${fFin}.xlsx`);
  };

  // Exportar Autoconsumos a PDF
  const exportarAutoconsumosPDF = async () => {
    const listado = autoconsumosFiltrados;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay autoconsumos filtrados para exportar.',
        type: 'warning'
      });
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFontSize(16);
    doc.text('Reporte de Autoconsumos - Talento Humano', 14, 15);
    doc.setFontSize(10);
    
    const fInicio = fechaInicio || 'INICIO';
    const fFin = fechaFin || 'FIN';
    doc.text(`Rango de Fechas: ${fInicio} a ${fFin}`, 14, 22);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 14, 27);

    const headers = [['Código', 'Fecha Solicitud', 'Empleado', 'Cédula', 'Departamento', 'Centro de Costos', 'Justificación', 'Productos', 'Estado', 'Total']];

    const rows = listado.map(a => {
      const total = a.detalles?.reduce((sum: number, d: any) => sum + d.subtotal, 0) || 0;
      const productsText = a.detalles?.map((d: any) => `${d.producto_nombre} (x${d.cantidad})`).join('\n') || '-';
      return [
        a.codigo,
        new Date(a.fecha_solicitud).toLocaleString(),
        a.empleado.nombre,
        a.empleado.cedula,
        a.departamento.nombre,
        a.centro_costos?.nombre || '-',
        a.justificacion.length > 25 ? a.justificacion.substring(0, 23) + '..' : a.justificacion,
        productsText,
        a.estado.toUpperCase(),
        `$${total.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 32,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    doc.save(`Reporte_Autoconsumos_${fInicio}_a_${fFin}.pdf`);
  };

  // Exportar a CSV (Registro Detallado)
  const exportarCSV = async () => {
    const listado = transaccionesFiltradas;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay transacciones filtradas para exportar.',
        type: 'warning'
      });
      return;
    }

    const headers = ['ID Venta', 'Fecha/Hora', 'Empleado', 'Cedula/ID', 'Departamento', 'Centro de Costos', 'Producto', 'Categoria', 'Codigo Producto', 'Cantidad', 'Precio Unitario', 'Total'];

    const rows = listado.map(t => [
      t.id,
      new Date(t.fecha).toLocaleString(),
      t.empleado_nombre,
      t.empleado_cedula,
      t.departamento,
      t.centro_costos,
      t.producto_nombre,
      t.categoria,
      t.producto_codigo,
      t.cantidad,
      t.precio_unitario.toFixed(2),
      t.total.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const fInicio = fechaInicio || 'INICIO';
    const fFin = fechaFin || 'FIN';

    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Detallado_Consumos_${fInicio}_a_${fFin}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar a Excel (XLSX)
  const exportarXLSX = async () => {
    const listado = transaccionesFiltradas;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay transacciones filtradas para exportar.',
        type: 'warning'
      });
      return;
    }

    const rows = listado.map(t => ({
      'ID Venta': t.id,
      'Fecha/Hora': new Date(t.fecha).toLocaleString(),
      'Empleado': t.empleado_nombre,
      'Cédula/ID': t.empleado_cedula,
      'Departamento': t.departamento,
      'Centro de Costos': t.centro_costos,
      'Producto': t.producto_nombre,
      'Categoría': t.categoria,
      'Código Producto': t.producto_codigo,
      'Cantidad': t.cantidad,
      'Precio Unitario': t.precio_unitario,
      'Total': t.total
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Consumos');

    const fInicio = fechaInicio || 'INICIO';
    const fFin = fechaFin || 'FIN';
    XLSX.writeFile(workbook, `Reporte_Detallado_Consumos_${fInicio}_a_${fFin}.xlsx`);
  };

  // Exportar a PDF (Landscape A4 con autoTable)
  const exportarPDF = async () => {
    const listado = transaccionesFiltradas;
    if (listado.length === 0) {
      await showAlert({
        title: 'Exportar Reporte',
        message: 'No hay transacciones filtradas para exportar.',
        type: 'warning'
      });
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Agregar título y metadatos
    doc.setFontSize(16);
    doc.text('Reporte de Consumos Acumulados - Talento Humano', 14, 15);
    doc.setFontSize(10);
    
    const fInicio = fechaInicio || 'INICIO';
    const fFin = fechaFin || 'FIN';
    doc.text(`Rango de Fechas: ${fInicio} a ${fFin}`, 14, 22);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 14, 27);

    const headers = [['ID', 'Fecha/Hora', 'Empleado', 'Cédula', 'Dpto', 'C. Costos', 'Producto', 'Categoría', 'Cant.', 'P. Unit', 'Total']];

    const rows = listado.map(t => [
      t.id,
      new Date(t.fecha).toLocaleString(),
      t.empleado_nombre,
      t.empleado_cedula,
      t.departamento,
      t.centro_costos,
      t.producto_nombre,
      t.categoria,
      t.cantidad,
      `$${t.precio_unitario.toFixed(2)}`,
      `$${t.total.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 32,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] }, // Slate-800
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 32 },
        2: { cellWidth: 35 },
        3: { cellWidth: 22 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 35 },
        7: { cellWidth: 22 },
        8: { cellWidth: 12 },
        9: { cellWidth: 16 },
        10: { cellWidth: 18 }
      }
    });

    doc.save(`Reporte_Detallado_Consumos_${fInicio}_a_${fFin}.pdf`);
  };

  if (loading && reporteConsumo.length === 0 && transacciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        <p className="text-sm text-gray-500 font-medium">Cargando módulo de Reportes...</p>
      </div>
    );
  }

  const pendientes = devoluciones.filter(d => d.estado === 'pendiente');
  const historico = devoluciones.filter(d => d.estado !== 'pendiente');

  return (
    <div className="font-sans space-y-8">

      <div>
        <h1 className="text-xl font-bold text-gray-800">Panel de Reportes</h1>
        <p className="text-xs text-gray-500 mt-1">Control de consumos acumulados, nómina y aprobación de devoluciones</p>
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

      {/* Selector de Modulos (Tabs) */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setModuloActivo('reportes')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
            moduloActivo === 'reportes'
              ? 'border-gray-800 text-gray-800'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Reportes y Consumos
        </button>
        <button
          onClick={() => setModuloActivo('devoluciones')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            moduloActivo === 'devoluciones'
              ? 'border-gray-800 text-gray-800'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Solicitudes de Devolucion
          {pendientes.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {pendientes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setModuloActivo('autoconsumos')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            moduloActivo === 'autoconsumos'
              ? 'border-gray-800 text-gray-800'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Solicitudes de Autoconsumos
          {autoconsumos.filter(a => a.estado === 'pendiente').length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {autoconsumos.filter(a => a.estado === 'pendiente').length}
            </span>
          )}
        </button>
      </div>

      {/* MODULO 1: SISTEMA DE REPORTES */}
      {moduloActivo === 'reportes' && (
        <div className="space-y-6">
          {/* FILTRO DE CALENDARIO */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtrar consumos por fecha</h3>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => aplicarFiltroRapido('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filterType === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                Todo el Historial
              </button>
              <button
                onClick={() => aplicarFiltroRapido('hoy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filterType === 'hoy' ? 'bg-gray-800 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => aplicarFiltroRapido('semana')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filterType === 'semana' ? 'bg-gray-800 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                Esta Semana
              </button>
              <button
                onClick={() => aplicarFiltroRapido('mes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filterType === 'mes' ? 'bg-gray-800 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                Este Mes
              </button>
              <button
                onClick={() => aplicarFiltroRapido('anio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filterType === 'anio' ? 'bg-gray-800 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                Este Anio
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end pt-2 border-t border-gray-50">
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => {
                    setFechaInicio(e.target.value);
                    setFilterType('personalizado');
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Fecha Fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => {
                    setFechaFin(e.target.value);
                    setFilterType('personalizado');
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* FILTROS AVANZADOS GENERALES */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Buscar Colaborador</label>
              <input
                type="text"
                placeholder="Nombre o Cedula..."
                value={searchEmpleado}
                onChange={(e) => setSearchEmpleado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Buscar Producto</label>
              <input
                type="text"
                placeholder="Nombre o Codigo..."
                value={searchProducto}
                onChange={(e) => setSearchProducto(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Departamento</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none bg-white text-gray-700"
              >
                <option value="">Todos</option>
                {departamentosUnicos.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Centro Costos</label>
              <select
                value={selectedCC}
                onChange={(e) => setSelectedCC(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none bg-white text-gray-700"
              >
                <option value="">Todos</option>
                {centrosCostosUnicos.map(cc => (
                  <option key={cc} value={cc}>{cc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Categoria</label>
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none bg-white text-gray-700"
              >
                <option value="">Todos</option>
                {categoriasUnicas.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-500 mb-1 font-semibold">Agrupar por</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none bg-white text-gray-700 font-semibold"
              >
                <option value="none">Sin agrupar (Individual)</option>
                <option value="empleado">Colaborador / Empleado</option>
                <option value="producto">Producto (Solo Detalle)</option>
                <option value="categoria">Categoría (Solo Detalle)</option>
                <option value="centro_costos">Centro de Costos</option>
                <option value="departamento">Departamento</option>
              </select>
            </div>
          </div>

          {/* PESTANIAS DE REPORTES */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('resumen')}
                  className={`pb-3 text-sm font-semibold transition border-b-2 ${
                    activeTab === 'resumen'
                      ? 'border-gray-800 text-gray-800'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Consumo Acumulado (Nomina)
                </button>
                <button
                  onClick={() => setActiveTab('detalle')}
                  className={`pb-3 text-sm font-semibold transition border-b-2 ${
                    activeTab === 'detalle'
                      ? 'border-gray-800 text-gray-800'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Registro Detallado (Transacciones)
                </button>
                <button
                  onClick={() => setActiveTab('autoconsumos_reporte')}
                  className={`pb-3 text-sm font-semibold transition border-b-2 ${
                    activeTab === 'autoconsumos_reporte'
                      ? 'border-gray-800 text-gray-800'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Autoconsumos (Consumo Interno)
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pb-2 sm:pb-0">
                {activeTab === 'detalle' ? (
                  <BotonDescargar
                    onExportCSV={exportarCSV}
                    onExportXLSX={exportarXLSX}
                    onExportPDF={exportarPDF}
                  />
                ) : activeTab === 'autoconsumos_reporte' ? (
                  <BotonDescargar
                    onExportCSV={exportarAutoconsumosCSV}
                    onExportXLSX={exportarAutoconsumosXLSX}
                    onExportPDF={exportarAutoconsumosPDF}
                  />
                ) : (
                  <BotonDescargar
                    onExportCSV={exportarResumenCSV}
                    onExportXLSX={exportarResumenXLSX}
                    onExportPDF={exportarResumenPDF}
                  />
                )}
                <BotonRecargar
                  onRefresh={cargarDatos}
                  loading={loading}
                />
              </div>
            </div>

            {/* CONTENIDO DE PESTANIA: RESUMEN */}
            {activeTab === 'resumen' && (
              groupBy === 'none' ? (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-xs font-semibold text-gray-500 uppercase">
                    <span>Resumen general de descuentos</span>
                    <span>Filtrado: {fechaInicio || 'Todo'} - {fechaFin || 'Todo'}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                          <th className="px-5 py-3.5">Colaborador</th>
                          <th className="px-5 py-3.5">Cedula</th>
                          <th className="px-5 py-3.5">Departamento</th>
                          <th className="px-5 py-3.5 text-center">No. Compras</th>
                          <th className="px-5 py-3.5 text-right">Total a Descontar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reporteConsumoPaginado.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-5 py-4 font-bold text-gray-800">{row.empleado}</td>
                            <td className="px-5 py-4 font-mono text-gray-400">{row.codigo}</td>
                            <td className="px-5 py-4 text-gray-500">{row.departamento}</td>
                            <td className="px-5 py-4 text-center text-gray-600 font-medium">{row.total_compras}</td>
                            <td className="px-5 py-4 text-right font-black text-gray-800 text-sm">
                              ${row.total_gastado.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {reporteConsumoFiltrado.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-400">
                              No hay consumos que coincidan con los filtros y periodo seleccionados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <Paginacion
                    currentPage={currentPage}
                    totalItems={reporteConsumoFiltrado.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {resumenAgrupado.map(group => (
                    <div key={group.name} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div
                        onClick={() => toggleGroup(group.name)}
                        className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer select-none text-xs font-semibold border-b border-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{expandedGroups[group.name] ? 'v' : '>'}</span>
                          <span className="text-gray-800 font-bold">{group.name}</span>
                        </div>
                        <div className="flex items-center gap-6 text-gray-600 font-mono">
                          <span>No. Compras: {group.compras}</span>
                          <span className="text-gray-800 font-black">Total: ${group.total.toFixed(2)}</span>
                        </div>
                      </div>

                      {expandedGroups[group.name] && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-105 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                                <th className="px-5 py-2.5">Colaborador</th>
                                <th className="px-5 py-2.5">Cedula</th>
                                <th className="px-5 py-2.5">Departamento</th>
                                <th className="px-5 py-2.5 text-center">No. Compras</th>
                                <th className="px-5 py-2.5 text-right">Total a Descontar</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {group.items.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/30">
                                  <td className="px-5 py-3 font-bold text-gray-800">{row.empleado}</td>
                                  <td className="px-5 py-3 font-mono text-gray-400">{row.codigo}</td>
                                  <td className="px-5 py-3 text-gray-500">{row.departamento}</td>
                                  <td className="px-5 py-3 text-center text-gray-600 font-medium">{row.total_compras}</td>
                                  <td className="px-5 py-3 text-right font-semibold text-gray-850">
                                    ${row.total_gastado.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                  {resumenAgrupado.length === 0 && (
                    <div className="text-center py-8 bg-white border border-gray-200 rounded-xl text-gray-400 text-xs">
                      No hay consumos agrupados con los filtros actuales.
                    </div>
                  )}
                </div>
              )
            )}

            {/* CONTENIDO DE PESTANIA: DETALLE (Transacciones) */}
            {activeTab === 'detalle' && (
              <div className="space-y-4">

                {/* RENDER AGRUPADO O INDIVIDUAL */}
                {groupBy === 'none' ? (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                            <th className="px-5 py-3.5">Fecha</th>
                            <th className="px-5 py-3.5">Colaborador</th>
                            <th className="px-5 py-3.5">Cedula</th>
                            <th className="px-5 py-3.5">Dpto</th>
                            <th className="px-5 py-3.5">Centro Costos</th>
                            <th className="px-5 py-3.5">Producto</th>
                            <th className="px-5 py-3.5">Categoria</th>
                            <th className="px-5 py-3.5">Codigo Art.</th>
                            <th className="px-5 py-3.5 text-center">Cant.</th>
                            <th className="px-5 py-3.5 text-right">P. Unitario</th>
                            <th className="px-5 py-3.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-mono text-gray-700">
                          {transaccionesPaginadas.map((t, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                                {new Date(t.fecha).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="px-5 py-3 font-bold text-gray-800 font-sans">{t.empleado_nombre}</td>
                              <td className="px-5 py-3 text-gray-400">{t.empleado_cedula}</td>
                              <td className="px-5 py-3 text-gray-500 font-sans">{t.departamento}</td>
                              <td className="px-5 py-3 text-gray-500 font-sans">{t.centro_costos}</td>
                              <td className="px-5 py-3 font-semibold text-gray-800 font-sans">{t.producto_nombre}</td>
                              <td className="px-5 py-3 text-gray-500 font-sans">{t.categoria}</td>
                              <td className="px-5 py-3 text-gray-400">{t.producto_codigo}</td>
                              <td className="px-5 py-3 text-center font-bold text-gray-800">{t.cantidad}</td>
                              <td className="px-5 py-3 text-right">${t.precio_unitario.toFixed(2)}</td>
                              <td className="px-5 py-3 text-right font-bold text-gray-800">${t.total.toFixed(2)}</td>
                            </tr>
                          ))}
                          {transaccionesFiltradas.length === 0 && (
                            <tr>
                              <td colSpan={11} className="text-center py-8 text-gray-400 font-sans text-xs">
                                No se encontraron transacciones con los filtros seleccionados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <Paginacion
                      currentPage={currentPage}
                      totalItems={transaccionesFiltradas.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={setItemsPerPage}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transaccionesAgrupadas.map(group => (
                      <div key={group.name} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div
                          onClick={() => toggleGroup(group.name)}
                          className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer select-none text-xs font-semibold border-b border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{expandedGroups[group.name] ? 'v' : '>'}</span>
                            <span className="text-gray-800 font-bold">{group.name}</span>
                          </div>
                          <div className="flex items-center gap-6 text-gray-600 font-mono">
                            <span>Items: {group.cantidad}</span>
                            <span className="text-gray-800 font-black">Total: ${group.total.toFixed(2)}</span>
                          </div>
                        </div>

                        {expandedGroups[group.name] && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px] border-collapse">
                              <thead>
                                <tr className="bg-gray-100 border-b border-gray-200 text-gray-400 font-bold uppercase">
                                  <th className="px-5 py-2.5">Fecha</th>
                                  <th className="px-5 py-2.5">Colaborador</th>
                                  <th className="px-5 py-2.5">Dpto</th>
                                  <th className="px-5 py-2.5">Producto</th>
                                  <th className="px-5 py-2.5">Art. Codigo</th>
                                  <th className="px-5 py-2.5 text-center">Cant</th>
                                  <th className="px-5 py-2.5 text-right">P. Unitario</th>
                                  <th className="px-5 py-2.5 text-right">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-mono text-gray-600">
                                {group.items.map((item, subIdx) => (
                                  <tr key={subIdx} className="hover:bg-gray-50/30">
                                    <td className="px-5 py-3 text-gray-400">
                                      {new Date(item.fecha).toLocaleString()}
                                    </td>
                                    <td className="px-5 py-3 font-sans font-medium text-gray-800">{item.empleado_nombre}</td>
                                    <td className="px-5 py-3 font-sans">{item.departamento}</td>
                                    <td className="px-5 py-3 font-sans font-semibold text-gray-800">{item.producto_nombre}</td>
                                    <td className="px-5 py-3">{item.producto_codigo}</td>
                                    <td className="px-5 py-3 text-center font-bold text-gray-800">{item.cantidad}</td>
                                    <td className="px-5 py-3 text-right">${item.precio_unitario.toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right font-bold text-gray-800">${item.total.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONTENIDO DE PESTANIA: AUTOCONSUMOS */}
            {activeTab === 'autoconsumos_reporte' && (
              groupBy === 'none' ? (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-xs font-semibold text-gray-500 uppercase">
                    <span>Listado de consumos internos (asumidos por la empresa)</span>
                    <span>Filtrado: {fechaInicio || 'Todo'} - {fechaFin || 'Todo'}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 uppercase tracking-wider text-[9px] font-bold border-b border-gray-200">
                          <th className="px-5 py-3">Código</th>
                          <th className="px-5 py-3">Fecha</th>
                          <th className="px-5 py-3">Empleado</th>
                          <th className="px-5 py-3">Departamento</th>
                          <th className="px-5 py-3">Centro de Costos</th>
                          <th className="px-5 py-3">Justificación</th>
                          <th className="px-5 py-3">Productos</th>
                          <th className="px-5 py-3">Estado</th>
                          <th className="px-5 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {autoconsumosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-5 py-8 text-center text-gray-400">
                              No hay autoconsumos registrados en este rango de fechas o filtros.
                            </td>
                          </tr>
                        ) : (
                          autoconsumosPaginados.map((a) => {
                            const total = a.detalles?.reduce((sum, d) => sum + d.subtotal, 0) || 0;
                            return (
                              <tr key={a.id} className="hover:bg-gray-50/50">
                                <td className="px-5 py-4 font-mono font-bold text-[10px] text-gray-700">{a.codigo}</td>
                                <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{new Date(a.fecha_solicitud).toLocaleDateString()}</td>
                                <td className="px-5 py-4">
                                  <span className="font-bold text-gray-800">{a.empleado.nombre}</span>
                                  <span className="block text-[9px] text-gray-400">{a.empleado.cedula}</span>
                                </td>
                                <td className="px-5 py-4 text-gray-650">{a.departamento.nombre}</td>
                                <td className="px-5 py-4 text-gray-650">{a.centro_costos?.nombre || '-'}</td>
                                <td className="px-5 py-4 text-gray-500 max-w-[150px] truncate" title={a.justificacion}>
                                  {a.justificacion}
                                </td>
                                <td className="px-5 py-4">
                                  <div className="space-y-0.5 text-[10px] text-gray-600 font-mono min-w-[150px]">
                                    {a.detalles?.map((d: any) => (
                                      <div key={d.id} className="flex justify-between gap-2">
                                        <span>• {d.producto_nombre}</span>
                                        <span className="font-bold text-gray-750">x{d.cantidad}</span>
                                      </div>
                                    )) || '-'}
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                                    a.estado === 'entregado'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                      : a.estado === 'pendiente'
                                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                                      : 'bg-gray-50 text-gray-600 border-gray-200'
                                  }`}>
                                    {a.estado}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right font-bold text-gray-800">${total.toFixed(2)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <Paginacion
                    currentPage={currentPage}
                    totalItems={autoconsumosFiltrados.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {autoconsumosAgrupados.map(group => (
                    <div key={group.name} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div
                        onClick={() => toggleGroup(group.name)}
                        className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer select-none text-xs font-semibold border-b border-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{expandedGroups[group.name] ? 'v' : '>'}</span>
                          <span className="text-gray-800 font-bold">{group.name}</span>
                        </div>
                        <div className="flex items-center gap-6 text-gray-600 font-mono">
                          <span>Solicitudes: {group.count}</span>
                          <span className="text-gray-800 font-black">Total: ${group.total.toFixed(2)}</span>
                        </div>
                      </div>

                      {expandedGroups[group.name] && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-100 border-b border-gray-200 text-gray-650 uppercase tracking-wider text-[9px] font-bold">
                                <th className="px-5 py-2.5">Código</th>
                                <th className="px-5 py-2.5">Fecha</th>
                                <th className="px-5 py-2.5">Empleado</th>
                                <th className="px-5 py-2.5">Departamento</th>
                                <th className="px-5 py-2.5">Centro de Costos</th>
                                <th className="px-5 py-2.5">Justificación</th>
                                <th className="px-5 py-2.5">Estado</th>
                                <th className="px-5 py-2.5 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {group.items.map((a: any) => {
                                const total = a.detalles?.reduce((sum: number, d: any) => sum + d.subtotal, 0) || 0;
                                return (
                                  <tr key={a.id} className="hover:bg-gray-50/30">
                                    <td className="px-5 py-3 font-mono font-bold text-[10px] text-gray-700">{a.codigo}</td>
                                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(a.fecha_solicitud).toLocaleDateString()}</td>
                                    <td className="px-5 py-3">
                                      <span className="font-bold text-gray-800">{a.empleado.nombre}</span>
                                      <span className="block text-[9px] text-gray-400">{a.empleado.cedula}</span>
                                    </td>
                                    <td className="px-5 py-3 text-gray-500">{a.departamento.nombre}</td>
                                    <td className="px-5 py-3 text-gray-500">{a.centro_costos?.nombre || '-'}</td>
                                    <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate" title={a.justificacion}>
                                      {a.justificacion}
                                    </td>
                                    <td className="px-5 py-3">
                                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                                        a.estado === 'entregado'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                          : a.estado === 'pendiente'
                                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                                          : 'bg-gray-50 text-gray-600 border-gray-200'
                                      }`}>
                                        {a.estado}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3 text-right font-bold text-gray-800">${total.toFixed(2)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                  {autoconsumosAgrupados.length === 0 && (
                    <div className="text-center py-8 bg-white border border-gray-200 rounded-xl text-gray-400 text-xs">
                      No hay autoconsumos agrupados con los filtros actuales.
                    </div>
                  )}
                </div>
              )
            )}

          </div>
        </div>
      )}

      {/* MODULO 2: SOLICITUDES DE DEVOLUCION */}
      {moduloActivo === 'devoluciones' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              Solicitudes de Devolucion por Aprobar
              {pendientes.length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {pendientes.length}
                </span>
              )}
            </h2>

            {pendientes.length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
                <p className="text-gray-500 font-semibold">No hay solicitudes de devolucion pendientes</p>
                <p className="text-gray-400 text-xs mt-1">Todos los pedidos cancelados han sido procesados.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {pendientes
                    .slice((currentPagePendientes - 1) * itemsPerPagePendientes, currentPagePendientes * itemsPerPagePendientes)
                    .map((d) => (
                      <div key={d.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-[10px] text-gray-400 block">Codigo: {d.codigo_entrega}</span>
                          <h4 className="font-bold text-gray-800 text-sm">{d.empleado_nombre}</h4>
                          <div className="text-gray-600 mt-1 truncate">
                            <span className="font-semibold text-gray-500">Motivo de Cancelación:</span> {d.motivo}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <BotonAccion
                            tipo="ver_detalle"
                            onClick={() => setDetalleDevolucion(d)}
                          />
                          <button
                            onClick={() => handleAprobar(d.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition active:scale-95 shadow-sm"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => openRechazoModal(d.id)}
                            className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 rounded-lg text-xs font-semibold transition"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                <Paginacion
                  currentPage={currentPagePendientes}
                  totalItems={pendientes.length}
                  itemsPerPage={itemsPerPagePendientes}
                  onPageChange={setCurrentPagePendientes}
                  onItemsPerPageChange={setItemsPerPagePendientes}
                />
              </>
            )}
          </div>

          {/* HISTORIAL DE DEVOLUCIONES */}
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <h2 className="text-base font-bold text-gray-800">Historial de Devoluciones Procesadas</h2>

            {historico.length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-400 text-xs font-semibold">
                No hay registro de devoluciones procesadas historicas.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {historico
                    .slice((currentPageHistorial - 1) * itemsPerPageHistorial, currentPageHistorial * itemsPerPageHistorial)
                    .map((d) => (
                      <div key={d.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-gray-400">{d.codigo_entrega}</span>
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                              d.estado === 'aprobado' || d.estado === 'ejecutado'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                              {d.estado}
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-800 mt-1">{d.empleado_nombre}</h4>
                          <div className="text-gray-500 mt-0.5 truncate">
                            <span className="font-semibold">Motivo:</span> {d.motivo}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <BotonAccion
                            tipo="ver_detalle"
                            onClick={() => setDetalleDevolucion(d)}
                          />
                        </div>
                      </div>
                    ))}
                </div>

                <Paginacion
                  currentPage={currentPageHistorial}
                  totalItems={historico.length}
                  itemsPerPage={itemsPerPageHistorial}
                  onPageChange={setCurrentPageHistorial}
                  onItemsPerPageChange={setItemsPerPageHistorial}
                />
              </>
            )}
          </div>
        </div>
      )}

      {moduloActivo === 'autoconsumos' && (
        <div className="space-y-6">
          {/* SECCIÓN DE SOLICITUDES PENDIENTES */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800">Solicitudes de Autoconsumo Pendientes</h2>

            {autoconsumos.filter((a) => a.estado === 'pendiente').length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-400 text-xs font-semibold">
                No hay solicitudes de autoconsumo pendientes de aprobación.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {autoconsumos
                    .filter((a) => a.estado === 'pendiente')
                    .slice((currentPagePendientes - 1) * itemsPerPagePendientes, currentPagePendientes * itemsPerPagePendientes)
                    .map((a) => (
                      <div key={a.id} className="bg-white border border-gray-250/70 rounded-xl px-5 py-4 shadow-xs flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-bold">
                              {a.codigo}
                            </span>
                            <span className="text-gray-400 text-[10px] font-medium">
                              {new Date(a.fecha_solicitud).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-800 mt-1.5 text-sm">{a.empleado.nombre}</h4>
                          <span className="text-[10px] text-gray-400 block font-mono">C.I. {a.empleado.cedula}</span>
                          <div className="text-gray-600 mt-1 truncate">
                            <span className="font-semibold text-gray-500">Justificación:</span> {a.justificacion}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <BotonAccion
                            tipo="ver_detalle"
                            onClick={() => setDetalleAutoconsumo(a)}
                          />
                          <button
                            onClick={() => openRechazoAutoModal(a.id)}
                            className="px-3.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-650 rounded-lg text-xs font-semibold transition"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => handleAprobarAutoconsumo(a.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                          >
                            Aprobar Solicitud
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                <Paginacion
                  currentPage={currentPagePendientes}
                  totalItems={autoconsumos.filter((a) => a.estado === 'pendiente').length}
                  itemsPerPage={itemsPerPagePendientes}
                  onPageChange={setCurrentPagePendientes}
                  onItemsPerPageChange={setItemsPerPagePendientes}
                />
              </>
            )}
          </div>

          {/* HISTORIAL DE AUTOCONSUMOS */}
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <h2 className="text-base font-bold text-gray-800">Historial de Autoconsumos Procesados</h2>

            {autoconsumos.filter((a) => a.estado !== 'pendiente').length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-400 text-xs font-semibold">
                No hay registros históricos de autoconsumo.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {autoconsumos
                    .filter((a) => a.estado !== 'pendiente')
                    .slice((currentPageHistorial - 1) * itemsPerPageHistorial, currentPageHistorial * itemsPerPageHistorial)
                    .map((a) => (
                      <div key={a.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[9px] text-gray-400">{a.codigo}</span>
                            <span
                              className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                                a.estado === 'entregado'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : a.estado === 'aprobado'
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : 'bg-red-50 text-red-700 border-red-100'
                              }`}
                            >
                              {a.estado}
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-800 mt-1">{a.empleado.nombre}</h4>
                          <div className="text-gray-500 mt-0.5 truncate">
                            <span className="font-semibold text-gray-400">Dpto / CC:</span> {a.departamento.nombre} •{' '}
                            {a.centro_costos.nombre}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <BotonAccion
                            tipo="ver_detalle"
                            onClick={() => setDetalleAutoconsumo(a)}
                          />
                        </div>
                      </div>
                    ))}
                </div>

                <Paginacion
                  currentPage={currentPageHistorial}
                  totalItems={autoconsumos.filter((a) => a.estado !== 'pendiente').length}
                  itemsPerPage={itemsPerPageHistorial}
                  onPageChange={setCurrentPageHistorial}
                  onItemsPerPageChange={setItemsPerPageHistorial}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE RECHAZO DE DEVOLUCION */}
      {showRechazoModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Rechazar Solicitud de Devolucion</h3>
              <button
                onClick={() => { setShowRechazoModal(false); setMotivoRechazo(''); setSelectedDevId(null); }}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                x
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Ingresa la justificacion o razon por la cual rechazas esta solicitud de devolucion. El empleado y el entregador podran ver esta observacion.
            </p>

            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Escribe la justificacion del rechazo aqui..."
              className="w-full h-24 border border-gray-300 rounded-xl p-3 text-xs focus:ring-1 focus:ring-gray-400 focus:outline-none resize-none font-sans"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowRechazoModal(false); setMotivoRechazo(''); setSelectedDevId(null); }}
                className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-xs font-semibold transition"
              >
                Cerrar
              </button>
              <button
                onClick={handleRechazarSubmit}
                disabled={!motivoRechazo.trim()}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                Rechazar Devolucion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RECHAZO DE AUTOCONSUMO */}
      {showRechazoAutoModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Rechazar Solicitud de Autoconsumo</h3>
              <button
                onClick={() => { setShowRechazoAutoModal(false); setMotivoRechazoAuto(''); setSelectedAutoId(null); }}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                x
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Ingresa la justificación o razón por la cual rechazas esta solicitud de autoconsumo. El empleado podrá ver esta observación.
            </p>

            <textarea
              value={motivoRechazoAuto}
              onChange={(e) => setMotivoRechazoAuto(e.target.value)}
              placeholder="Escribe la justificación del rechazo aquí..."
              className="w-full h-24 border border-gray-300 rounded-xl p-3 text-xs focus:ring-1 focus:ring-gray-400 focus:outline-none resize-none font-sans"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowRechazoAutoModal(false); setMotivoRechazoAuto(''); setSelectedAutoId(null); }}
                className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-xs font-semibold transition"
              >
                Cerrar
              </button>
              <button
                onClick={handleRechazarAutoSubmit}
                disabled={!motivoRechazoAuto.trim()}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                Rechazar Autoconsumo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE DE DEVOLUCION */}
      <ModalDetalle
        isOpen={!!detalleDevolucion}
        onClose={() => setDetalleDevolucion(null)}
        title="Detalle de Devolución"
        subtitle={detalleDevolucion?.codigo_entrega}
        badge={
          detalleDevolucion && (
            <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
              detalleDevolucion.estado === 'aprobado' || detalleDevolucion.estado === 'ejecutado'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              {detalleDevolucion.estado}
            </span>
          )
        }
        campos={[
          { label: 'Colaborador', value: detalleDevolucion?.empleado_nombre },
          { label: 'Cédula', value: detalleDevolucion?.empleado_cedula },
          { label: 'Motivo de Cancelación', value: detalleDevolucion?.motivo },
          { label: 'Fecha de Solicitud', value: detalleDevolucion?.fecha_solicitud ? new Date(detalleDevolucion.fecha_solicitud).toLocaleString() : '-' },
          { label: 'Fecha de Aprobación', value: detalleDevolucion?.fecha_aprobacion ? new Date(detalleDevolucion.fecha_aprobacion).toLocaleString() : '-' },
          { label: 'Solicitada por (Entrega)', value: detalleDevolucion?.entregador_nombre || '-' },
          { label: 'Revisada por (TTHH)', value: detalleDevolucion?.tthh_nombre || '-' },
          { label: 'Observación TTHH', value: detalleDevolucion?.observacion_tthh || '-' },
        ]}
      >
        {detalleDevolucion && detalleDevolucion.detalles && detalleDevolucion.detalles.length > 0 && (
          <div className="space-y-1.5">
            <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              Artículos Devueltos
            </span>
            <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-100 bg-gray-50">
              {detalleDevolucion.detalles.map((det: any) => (
                <div key={det.id} className="flex justify-between items-center px-3 py-2 text-[11px]">
                  <span className="font-semibold text-gray-800">{det.producto_nombre}</span>
                  <span className="font-mono text-gray-500">Cód: {det.producto_codigo} • x{det.cantidad}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ModalDetalle>

      {/* MODAL DE DETALLE DE AUTOCONSUMO */}
      <ModalDetalle
        isOpen={!!detalleAutoconsumo}
        onClose={() => setDetalleAutoconsumo(null)}
        title="Detalle de Autoconsumo"
        subtitle={detalleAutoconsumo?.codigo}
        badge={
          detalleAutoconsumo && (
            <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
              detalleAutoconsumo.estado === 'entregado'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : detalleAutoconsumo.estado === 'aprobado'
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              {detalleAutoconsumo.estado}
            </span>
          )
        }
        campos={[
          { label: 'Colaborador', value: detalleAutoconsumo?.empleado?.nombre },
          { label: 'Cédula', value: detalleAutoconsumo?.empleado?.cedula },
          { label: 'Departamento', value: detalleAutoconsumo?.departamento?.nombre },
          { label: 'Centro de Costos', value: detalleAutoconsumo?.centro_costos ? `${detalleAutoconsumo.centro_costos.codigo} - ${detalleAutoconsumo.centro_costos.nombre}` : '-' },
          { label: 'Justificación', value: detalleAutoconsumo?.justificacion },
          { label: 'Fecha de Solicitud', value: detalleAutoconsumo?.fecha_solicitud ? new Date(detalleAutoconsumo.fecha_solicitud).toLocaleString() : '-' },
          { label: 'Aprobado por', value: detalleAutoconsumo?.aprobador || '-' },
          { label: 'Despachado por', value: detalleAutoconsumo?.despachador || '-' },
          { label: 'Observación', value: detalleAutoconsumo?.observacion || '-' },
        ]}
      >
        {detalleAutoconsumo && (
          <>
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Productos Consumidos
              </span>
              <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-100 bg-gray-50">
                {detalleAutoconsumo.detalles?.map((det: any) => (
                  <div key={det.id} className="flex justify-between items-center px-3 py-2 text-[11px]">
                    <div>
                      <span className="font-semibold text-gray-800">{det.producto_nombre}</span>
                      <span className="block font-mono text-[10px] text-gray-400">Cód: {det.producto_codigo}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-700 block">x{det.cantidad}</span>
                      <span className="text-[10px] text-gray-400">${det.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center font-bold text-gray-800 text-xs border-t border-gray-100 pt-2">
                <span>Total asumido por la empresa:</span>
                <span className="text-emerald-700">
                  ${detalleAutoconsumo.detalles?.reduce((sum: number, d: any) => sum + d.subtotal, 0).toFixed(2)}
                </span>
              </div>
            </div>

            {detalleAutoconsumo.foto_entrega && (
              <div className="space-y-1">
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  Evidencia de Despacho
                </span>
                <img
                  src={detalleAutoconsumo.foto_entrega}
                  alt="Evidencia entrega"
                  className="w-full h-36 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}
          </>
        )}
      </ModalDetalle>
    </div>
  );
};
