import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { entregasAPI } from '../../api/entregas.api';
import { autoconsumoAPI } from '../../api/autoconsumo.api';
import { productosAPI } from '../../api/productos.api';
import { empleadosAPI } from '../../api/empleados.api';
import { reportesAPI } from '../../api/reportes.api';
import { devolucionesAPI } from '../../api/devoluciones.api';
import { useSocket } from '../../context/SocketContext';
import {
  BsBoxSeam,
  BsCartCheck,
  BsBoxes,
  BsBarChart,
  BsPeople,
  BsExclamationTriangle,
  BsCheckCircle,
  BsClockHistory
} from 'react-icons/bs';

import {
  MetricaDef,
  AccesoRapidoItem,
  TopProductoItem,
  ConsumoDeptoItem,
  ConsumoTemporalItem,
  EventoActividad
} from './types';
import { DashboardHeader } from './DashboardHeader';
import { DashboardMetricsGrid } from './DashboardMetricsGrid';
import { ChartTopProductos } from './ChartTopProductos';
import { ChartConsumoDepto } from './ChartConsumoDepto';
import { ChartTendenciaTemporal } from './ChartTendenciaTemporal';
import { DashboardAccesosRapidos } from './DashboardAccesosRapidos';
import { LiveActivityFeed } from './LiveActivityFeed';
import { ModalPersonalizarMetricas } from './ModalPersonalizarMetricas';

export const DashboardHome: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { socket, connected: socketConectado } = useSocket();
  const rol = user?.rol?.nombre || '';

  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<number>(0);
  const [autoconsumosPendientes, setAutoconsumosPendientes] = useState<number>(0);
  const [autoconsumosPorDespachar, setAutoconsumosPorDespachar] = useState<number>(0);
  const [stockCriticoCount, setStockCriticoCount] = useState<number>(0);
  const [totalProductos, setTotalProductos] = useState<number>(0);
  const [totalEmpleados, setTotalEmpleados] = useState<number>(0);
  const [consumoMes, setConsumoMes] = useState<number>(0);

  // Datos para Gráficos
  const [topProductos, setTopProductos] = useState<TopProductoItem[]>([]);
  const [consumoPorDepto, setConsumoPorDepto] = useState<ConsumoDeptoItem[]>([]);
  const [modoTemporal, setModoTemporal] = useState<'semanal' | 'mensual'>('semanal');
  const [consumoSemanal, setConsumoSemanal] = useState<ConsumoTemporalItem[]>([]);
  const [consumoMensual, setConsumoMensual] = useState<ConsumoTemporalItem[]>([]);

  // Feed de Actividad Reciente en Vivo con persistencia local para eventos en tiempo real
  const [eventosActividad, setEventosActividad] = useState<EventoActividad[]>(() => {
    try {
      const guardados = localStorage.getItem('dashboard_live_events');
      return guardados ? JSON.parse(guardados) : [];
    } catch {
      return [];
    }
  });

  // Función auxiliar de tiempo relativo
  const getTiempoRelativo = (fechaStr: string) => {
    try {
      const fecha = new Date(fechaStr);
      if (isNaN(fecha.getTime())) return 'reciente';
      const diffMs = Date.now() - fecha.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'hace un momento';
      if (mins === 1) return 'hace 1 min';
      if (mins < 60) return `hace ${mins} mins`;
      const horas = Math.floor(mins / 60);
      if (horas === 1) return 'hace 1 hora';
      if (horas < 24) return `hace ${horas} horas`;
      const dias = Math.floor(horas / 24);
      return `hace ${dias} día${dias > 1 ? 's' : ''}`;
    } catch {
      return 'reciente';
    }
  };

  // Cargar histórico de actividad reciente
  const cargarActividadReciente = async () => {
    try {
      const listaEventos: EventoActividad[] = [];

      // 1. Entregas y Solicitudes
      // 1. Entregas y Solicitudes
      try {
        const resEntregas = await entregasAPI.getAll();
        const entregas = (resEntregas.data || []).slice(0, 15);
        entregas.forEach((e: any) => {
          // Extraer nombre del colaborador de forma segura evitando [object Object]
          const emp = typeof e.empleado === 'object' && e.empleado !== null
            ? (e.empleado.nombre || e.empleado.empleado_nombre || 'Colaborador')
            : (e.empleado_nombre || (typeof e.empleado === 'string' ? e.empleado : 'Colaborador'));

          const codigo = e.codigo_entrega ? `#${e.codigo_entrega}` : `#ENT-${e.id}`;
          const fIso = e.fecha_entrega || e.fecha_solicitud || e.created_at || new Date().toISOString();

          // Calcular total si viene en detalles o campo total
          let totalPedido = Number(e.total) || 0;
          if (!totalPedido && Array.isArray(e.detalles)) {
            totalPedido = e.detalles.reduce((acc: number, d: any) => acc + ((Number(d.cantidad) || 0) * (Number(d.precio_unitario) || 0)), 0);
          }

          if (e.estado === 'entregado') {
            listaEventos.push({
              id: `entrega-${e.id}`,
              tipo: 'entrega',
              titulo: `${emp} retiró su pedido ${codigo}`,
              descripcion: `Entrega confirmada y despachada exitosamente.${totalPedido > 0 ? ` Total: $${totalPedido.toFixed(2)}` : ''}`,
              fechaISO: fIso,
              tiempo: getTiempoRelativo(fIso),
              badge: 'Despachado'
            });
          } else if (e.estado === 'pendiente') {
            listaEventos.push({
              id: `solicitud-${e.id}`,
              tipo: 'alerta',
              titulo: `Nuevo pedido pendiente ${codigo}`,
              descripcion: `${emp} tiene un pedido listo para retirar en cafetería.`,
              fechaISO: fIso,
              tiempo: getTiempoRelativo(fIso),
              badge: 'Pendiente'
            });
          }
        });
      } catch {
        // Ignorar si no hay acceso
      }

      // 2. Autoconsumos
      try {
        const resAuto = await autoconsumoAPI.getAll();
        const autos = (resAuto.data || []).slice(0, 15);
        autos.forEach((a: any) => {
          const depto = typeof a.departamento === 'object' && a.departamento !== null
            ? (a.departamento.nombre || 'Departamento')
            : (a.departamento_nombre || (typeof a.departamento === 'string' ? a.departamento : 'Departamento'));

          const solicitante = typeof a.empleado === 'object' && a.empleado !== null
            ? (a.empleado.nombre || 'Personal')
            : (a.solicitante_nombre || a.empleado_nombre || 'Personal');

          const codigo = a.codigo ? `#${a.codigo}` : `#AUT-${a.id}`;
          const fIso = a.fecha_solicitud || a.created_at || new Date().toISOString();

          if (a.estado === 'pendiente_aprobacion') {
            listaEventos.push({
              id: `auto-${a.id}`,
              tipo: 'autoconsumo',
              titulo: `Autoconsumo solicitado por ${depto}`,
              descripcion: `${solicitante} registró la solicitud ${codigo} para uso interno.`,
              fechaISO: fIso,
              tiempo: getTiempoRelativo(fIso),
              badge: 'Por Aprobar'
            });
          } else if (a.estado === 'aprobado') {
            listaEventos.push({
              id: `auto-aprob-${a.id}`,
              tipo: 'autoconsumo',
              titulo: `Autoconsumo aprobado para ${depto}`,
              descripcion: `Orden ${codigo} aprobada por jefatura, lista para despacho en bodega.`,
              fechaISO: fIso,
              tiempo: getTiempoRelativo(fIso),
              badge: 'Aprobado'
            });
          } else if (a.estado === 'entregado') {
            listaEventos.push({
              id: `auto-entreg-${a.id}`,
              tipo: 'entrega',
              titulo: `Autoconsumo despachado a ${depto}`,
              descripcion: `Insumos entregados y firmados para el área de ${depto}.`,
              fechaISO: fIso,
              tiempo: getTiempoRelativo(fIso),
              badge: 'Entregado'
            });
          }
        });
      } catch {
        // Ignorar si no hay acceso
      }

      // 3. Devoluciones
      try {
        const resDev = await devolucionesAPI.getAll();
        const devs = (resDev.data || []).slice(0, 10);
        devs.forEach((d: any) => {
          const emp = typeof d.empleado === 'object' && d.empleado !== null
            ? (d.empleado.nombre || 'Colaborador')
            : (d.empleado_nombre || (typeof d.empleado === 'string' ? d.empleado : 'Colaborador'));

          const fIso = d.fecha_solicitud || d.created_at || new Date().toISOString();
          const estadoDev = d.estado || 'pendiente';

          if (estadoDev === 'aprobada') {
            listaEventos.push({
              id: `dev-${d.id}`,
              tipo: 'devolucion',
              titulo: `Devolución aprobada para ${emp}`,
              descripcion: `Motivo: ${d.motivo || 'Reintegro de saldo al colaborador.'}`,
              fechaISO: fIso,
              tiempo: getTiempoRelativo(fIso),
              badge: 'Reintegrado'
            });
          } else if (estadoDev === 'pendiente') {
            listaEventos.push({
              id: `dev-pend-${d.id}`,
              tipo: 'devolucion',
              titulo: `Solicitud de devolución registrada`,
              descripcion: `${emp} reportó incidencia: "${d.motivo || 'En revisión'}".`,
              fechaISO: fIso,
              tiempo: getTiempoRelativo(fIso),
              badge: 'Revisión'
            });
          }
        });
      } catch {
        // Ignorar si no hay acceso
      }

      // Ordenar por fecha descendente y limitar a los 10 más recientes
      setEventosActividad(prev => {
        // Preservar eventos en vivo inmediatos (como ajustes de stock) que no vengan aún de una tabla histórica
        const eventosEnVivoInmediatos = prev.filter(p => p.id.startsWith('live-stock-'));
        const todos = [...eventosEnVivoInmediatos, ...listaEventos];
        // Quitar duplicados por id
        const uniqueMap = new Map();
        todos.forEach(item => uniqueMap.set(item.id, item));
        return Array.from(uniqueMap.values())
          .sort((a, b) => new Date(b.fechaISO).getTime() - new Date(a.fechaISO).getTime())
          .slice(0, 15);
      });
    } catch {
      // Fallback
    }
  };

  // Modal de configuración de métricas visibles
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Clave de almacenamiento local para métricas personalizadas
  const storageKey = `dashboard_kpis_${user?.id || user?.rol?.nombre || 'default'}`;
  const [metricasOcultas, setMetricasOcultas] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleMetricaVisibilidad = (id: string) => {
    setMetricasOcultas(prev => {
      const updated = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Cargar datos según permisos
  const cargarDatos = async () => {
    setRefreshing(true);
    cargarActividadReciente();
    try {
      // 1. Entregas (si tiene permisos de entregas o guardia/admin)
      if (hasPermission('entregas.ver') || hasPermission('entregas.ver_pendientes') || rol === 'guardia' || rol === 'admin') {
        try {
          const res = await entregasAPI.getPendientes();
          const items = res.data || [];
          setSolicitudesPendientes(items.filter((s: any) => s.estado === 'pendiente').length);
        } catch {
          // Ignorar si no tiene acceso
        }
      }

      // 2. Autoconsumos (Aprobaciones y Despachos)
      if (hasPermission('autoconsumo.aprobar') || hasPermission('autoconsumo.entregar') || rol === 'admin' || rol === 'tthh' || rol === 'guardia') {
        try {
          const res = await autoconsumoAPI.getAll();
          const items = res.data || [];
          setAutoconsumosPendientes(items.filter((a: any) => a.estado === 'pendiente_aprobacion').length);
          setAutoconsumosPorDespachar(items.filter((a: any) => a.estado === 'aprobado').length);
        } catch {
          // Ignorar si no tiene acceso
        }
      }

      // 3. Inventario y Stock Crítico
      if (hasPermission('inventario.ver') || hasPermission('inventario.ver_movimientos') || rol === 'inventario' || rol === 'admin') {
        try {
          const resProds = await productosAPI.getAll();
          const prods = resProds.data || [];
          setTotalProductos(prods.length);

          const criticos = prods.filter((p: any) => Number(p.stock_actual) <= Number(p.stock_minimo || 0));
          setStockCriticoCount(criticos.length);
        } catch {
          // Ignorar si no tiene acceso
        }
      }

      // 4. Colaboradores / Nómina
      if (hasPermission('empleados.ver') || rol === 'admin' || rol === 'tthh') {
        try {
          const resEmps = await empleadosAPI.getAll();
          setTotalEmpleados((resEmps.data || []).length);
        } catch {
          // Ignorar si no tiene acceso
        }
      }

      // 5. Consumos acumulados y Gráficos (Talento Humano / Admin / Guardia / Inventario)
      if (hasPermission('reportes.ver') || hasPermission('reportes.ver_consumo_empleados') || rol === 'tthh' || rol === 'admin' || rol === 'inventario') {
        try {
          const now = new Date();
          const hoy = now.toISOString().slice(0, 10);
          const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
          const hace6Meses = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);

          // Traer consumos agregados para el KPI de Nómina
          const resConsumo = await reportesAPI.getConsumoEmpleados(primerDiaMes, hoy);
          const total = (resConsumo.data || []).reduce((acc: number, item: any) => acc + (Number(item.total_gastado) || 0), 0);
          setConsumoMes(total);

          // Traer transacciones detalladas de los últimos 6 meses
          const resTrans = await reportesAPI.getTransaccionesDetalladas(hace6Meses, hoy);
          const todasTransacciones = resTrans.data || [];

          // Filtrar transacciones del mes actual para Top Productos y Departamentos
          const transaccionesMesActual = todasTransacciones.filter((t: any) => {
            const f = (t.fecha_hora || t.fecha || '').slice(0, 10);
            return f >= primerDiaMes && f <= hoy;
          });

          // Top 5 Productos más consumidos (del mes)
          const prodMap: { [key: string]: { nombre: string; cantidad: number; total: number } } = {};
          transaccionesMesActual.forEach((t: any) => {
            const key = t.producto_nombre || 'Artículo';
            if (!prodMap[key]) {
              prodMap[key] = { nombre: key, cantidad: 0, total: 0 };
            }
            prodMap[key].cantidad += Number(t.cantidad) || 0;
            prodMap[key].total += Number(t.total) || 0;
          });

          const sortedProds = Object.values(prodMap)
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 5);
          setTopProductos(sortedProds);

          // Consumo por Departamento (del mes)
          const deptoMap: { [key: string]: number } = {};
          let totalGastoDepto = 0;
          transaccionesMesActual.forEach((t: any) => {
            const dep = t.departamento || 'Sin Departamento';
            const gasto = Number(t.total) || 0;
            deptoMap[dep] = (deptoMap[dep] || 0) + gasto;
            totalGastoDepto += gasto;
          });

          const sortedDeptos = Object.entries(deptoMap)
            .map(([depto, gasto]) => ({
              depto,
              total: gasto,
              porcentaje: totalGastoDepto > 0 ? Math.round((gasto / totalGastoDepto) * 100) : 0
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
          setConsumoPorDepto(sortedDeptos);

          // Consumo Semanal (Últimos 7 días)
          const diasSemana: ConsumoTemporalItem[] = [];
          const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const fechaStr = d.toISOString().slice(0, 10);
            const nombreDia = `${nombresDias[d.getDay()]} ${d.getDate()}`;
            diasSemana.push({ label: nombreDia, fecha: fechaStr, total: 0 });
          }

          todasTransacciones.forEach((t: any) => {
            const fechaT = (t.fecha_hora || t.fecha || '').slice(0, 10);
            const matchDia = diasSemana.find(d => d.fecha === fechaT);
            if (matchDia) {
              matchDia.total += Number(t.total) || 0;
            }
          });
          setConsumoSemanal(diasSemana);

          // Consumo Mensual (Últimos 6 meses)
          const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const mesesHistorico: { label: string; yearMonth: string; total: number }[] = [];
          for (let i = 5; i >= 0; i--) {
            const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const ym = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
            const label = `${nombresMeses[m.getMonth()]} ${m.getFullYear() === now.getFullYear() ? '' : m.getFullYear()}`.trim();
            mesesHistorico.push({ label, yearMonth: ym, total: 0 });
          }

          todasTransacciones.forEach((t: any) => {
            const fechaT = (t.fecha_hora || t.fecha || '').slice(0, 7);
            const matchMes = mesesHistorico.find(m => m.yearMonth === fechaT);
            if (matchMes) {
              matchMes.total += Number(t.total) || 0;
            }
          });
          setConsumoMensual(mesesHistorico.map(m => ({ label: m.label, total: m.total })));

        } catch {
          // Ignorar si no tiene acceso
        }
      }
    } catch {
      // Manejo general
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [user]);

  // Escuchar eventos en vivo mediante WebSockets
  useEffect(() => {
    if (!socket) return;

    const handleActualizacion = () => {
      cargarActividadReciente();
    };

    socket.on('entrega-pendiente', handleActualizacion);
    socket.on('entrega-realizada', handleActualizacion);
    socket.on('autoconsumo-pendiente', handleActualizacion);
    socket.on('autoconsumo-actualizado', handleActualizacion);
    socket.on('devolucion-actualizada', handleActualizacion);

    // Evento en vivo de inventario / stock
    const handleStock = (data: any) => {
      if (data && data.producto_nombre) {
        const fIso = new Date().toISOString();
        const nuevoEvento: EventoActividad = {
          id: `live-stock-${Date.now()}-${data.producto_id || Math.random()}`,
          tipo: 'inventario',
          titulo: `Inventario ajustó el stock de ${data.producto_nombre}`,
          descripcion: `Nuevo stock en bodega: ${data.stock_nuevo ?? 'Actualizado'} unidades. Modificado por: ${data.usuario_nombre || 'Inventario'}.`,
          fechaISO: fIso,
          tiempo: 'hace un momento',
          badge: 'Stock Ajustado'
        };
        setEventosActividad(prev => {
          const actualizados = [nuevoEvento, ...prev.filter(p => p.id !== nuevoEvento.id)].slice(0, 20);
          try {
            localStorage.setItem('dashboard_live_events', JSON.stringify(actualizados.filter(e => e.id.startsWith('live-stock-'))));
          } catch {}
          return actualizados;
        });
      }
    };

    socket.on('stock-actualizado', handleStock);

    return () => {
      socket.off('entrega-pendiente', handleActualizacion);
      socket.off('entrega-realizada', handleActualizacion);
      socket.off('autoconsumo-pendiente', handleActualizacion);
      socket.off('autoconsumo-actualizado', handleActualizacion);
      socket.off('devolucion-actualizada', handleActualizacion);
      socket.off('stock-actualizado', handleStock);
    };
  }, [socket]);

  // Lista global de métricas disponibles con sus respectivos permisos
  const todasLasMetricas: MetricaDef[] = useMemo(() => [
    {
      id: 'pedidos_pendientes',
      titulo: 'Pedidos por Entregar',
      valor: solicitudesPendientes,
      subtitulo: 'Entregas regulares pendientes de despacho',
      icono: <BsBoxSeam className="text-xl" />,
      color: 'text-amber-600',
      bgLight: 'bg-amber-50',
      borderColor: 'border-amber-200',
      ruta: '/entregas',
      permisosRequeridos: ['entregas.ver', 'entregas.ver_pendientes'],
      rolesPermitidos: ['guardia', 'admin']
    },
    {
      id: 'autoconsumos_por_despachar',
      titulo: 'Autoconsumos por Entregar',
      valor: autoconsumosPorDespachar,
      subtitulo: 'Listos para firma y entrega física',
      icono: <BsCheckCircle className="text-xl" />,
      color: 'text-emerald-600',
      bgLight: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      ruta: '/entregas',
      permisosRequeridos: ['autoconsumo.entregar', 'entregas.ver'],
      rolesPermitidos: ['guardia', 'admin']
    },
    {
      id: 'autoconsumos_pendientes_aprobacion',
      titulo: 'Autoconsumos por Aprobar',
      valor: autoconsumosPendientes,
      subtitulo: 'Pendientes de validación por jefatura / TTHH',
      icono: <BsClockHistory className="text-xl" />,
      color: 'text-blue-600',
      bgLight: 'bg-blue-50',
      borderColor: 'border-blue-200',
      ruta: '/tthh',
      permisosRequeridos: ['autoconsumo.aprobar', 'reportes.ver'],
      rolesPermitidos: ['tthh', 'admin']
    },
    {
      id: 'stock_critico',
      titulo: 'Alertas de Stock Crítico',
      valor: stockCriticoCount,
      subtitulo: 'Productos que llegaron a su punto mínimo',
      icono: <BsExclamationTriangle className="text-xl" />,
      color: 'text-red-600',
      bgLight: 'bg-red-50',
      borderColor: 'border-red-200',
      ruta: '/inventario',
      permisosRequeridos: ['inventario.ver', 'inventario.ver_movimientos'],
      rolesPermitidos: ['inventario', 'admin']
    },
    {
      id: 'total_articulos',
      titulo: 'Catálogo de Artículos',
      valor: totalProductos,
      subtitulo: 'Total de ítems activos en inventario',
      icono: <BsBoxes className="text-xl" />,
      color: 'text-indigo-600',
      bgLight: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      ruta: '/inventario',
      permisosRequeridos: ['inventario.ver'],
      rolesPermitidos: ['inventario', 'admin']
    },
    {
      id: 'consumo_mes',
      titulo: 'Consumo del Mes',
      valor: `$${consumoMes.toFixed(2)}`,
      subtitulo: 'Gasto total acumulado por colaboradores',
      icono: <BsBarChart className="text-xl" />,
      color: 'text-purple-600',
      bgLight: 'bg-purple-50',
      borderColor: 'border-purple-200',
      ruta: '/tthh',
      permisosRequeridos: ['reportes.ver', 'reportes.ver_consumo_empleados', 'nomina.ver'],
      rolesPermitidos: ['tthh', 'admin']
    },
    {
      id: 'total_colaboradores',
      titulo: 'Colaboradores Registrados',
      valor: totalEmpleados,
      subtitulo: 'Personal con acceso a consumos POS',
      icono: <BsPeople className="text-xl" />,
      color: 'text-sky-600',
      bgLight: 'bg-sky-50',
      borderColor: 'border-sky-200',
      ruta: '/admin/empleados',
      permisosRequeridos: ['empleados.ver'],
      rolesPermitidos: ['admin', 'tthh']
    }
  ], [
    solicitudesPendientes,
    autoconsumosPorDespachar,
    autoconsumosPendientes,
    stockCriticoCount,
    totalProductos,
    consumoMes,
    totalEmpleados
  ]);

  // Filtrar métricas según permisos
  const metricasAutorizadas = useMemo(() => {
    return todasLasMetricas.filter(m => {
      if (m.rolesPermitidos && m.rolesPermitidos.includes(rol)) return true;
      return m.permisosRequeridos.some(p => hasPermission(p));
    });
  }, [todasLasMetricas, hasPermission, rol]);

  // Métricas visibles según personalización
  const metricasVisibles = useMemo(() => {
    return metricasAutorizadas.filter(m => !metricasOcultas.includes(m.id));
  }, [metricasAutorizadas, metricasOcultas]);

  // Módulos y Accesos rápidos
  const accesosRapidos: AccesoRapidoItem[] = useMemo(() => {
    const list: AccesoRapidoItem[] = [];

    if (hasPermission('entregas.ver') || rol === 'guardia' || rol === 'admin') {
      list.push({
        titulo: 'Módulo de Entregas',
        descripcion: 'Despacho de pedidos de cafetería y firma de autoconsumos',
        ruta: '/entregas',
        icono: <BsBoxSeam className="text-emerald-600 text-lg" />,
        badge: (solicitudesPendientes + autoconsumosPorDespachar) > 0
          ? `${solicitudesPendientes + autoconsumosPorDespachar} pendientes`
          : undefined
      });
    }

    if (hasPermission('inventario.ver') || rol === 'inventario' || rol === 'admin') {
      list.push({
        titulo: 'Control de Inventario',
        descripcion: 'Ajuste de stock, auditoría y catálogo de productos',
        ruta: '/inventario',
        icono: <BsBoxes className="text-indigo-600 text-lg" />,
        badge: stockCriticoCount > 0 ? `${stockCriticoCount} en stock crítico` : undefined
      });
    }

    if (hasPermission('reportes.ver') || rol === 'tthh' || rol === 'admin') {
      list.push({
        titulo: 'Reportes & Talento Humano',
        descripcion: 'Resumen para nómina, transacciones y autoconsumos',
        ruta: '/tthh',
        icono: <BsBarChart className="text-purple-600 text-lg" />
      });
    }

    if (hasPermission('compras.ver') || rol === 'admin') {
      list.push({
        titulo: 'Módulo de Compras',
        descripcion: 'Gestión de requerimientos y órdenes de compra',
        ruta: '/compras',
        icono: <BsCartCheck className="text-amber-600 text-lg" />
      });
    }

    if (hasPermission('empleados.ver') || rol === 'admin') {
      list.push({
        titulo: 'Directorio de Colaboradores',
        descripcion: 'Administración de empleados, cupos y firmas autorizadas',
        ruta: '/admin/empleados',
        icono: <BsPeople className="text-sky-600 text-lg" />
      });
    }

    return list;
  }, [hasPermission, rol, solicitudesPendientes, autoconsumosPorDespachar, stockCriticoCount]);

  const canViewReports = hasPermission('reportes.ver') || rol === 'admin' || rol === 'tthh' || rol === 'inventario';

  return (
    <div className="space-y-7 animate-fade-in font-sans">
      {/* 1. Header y Banner */}
      <DashboardHeader
        rol={rol}
        userName={user?.nombre}
        hasMetricas={metricasAutorizadas.length > 0}
        refreshing={refreshing}
        onRefresh={cargarDatos}
        onOpenConfig={() => setShowConfigModal(true)}
      />

      {/* 2. Métricas y KPIs */}
      <DashboardMetricsGrid
        loading={loading}
        metricasVisibles={metricasVisibles}
        metricasAutorizadasCount={metricasAutorizadas.length}
      />

      {/* 3. Gráficos Analíticos de Consumo */}
      {canViewReports && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartTopProductos
            loading={loading}
            topProductos={topProductos}
          />
          <ChartConsumoDepto
            loading={loading}
            consumoPorDepto={consumoPorDepto}
          />
          <ChartTendenciaTemporal
            loading={loading}
            modoTemporal={modoTemporal}
            onCambiarModo={setModoTemporal}
            consumoSemanal={consumoSemanal}
            consumoMensual={consumoMensual}
          />
        </div>
      )}

      {/* 4. Feed de Actividad Reciente en Vivo */}
      <LiveActivityFeed
        eventos={eventosActividad}
        loading={loading}
        socketConectado={socketConectado}
      />

      {/* 5. Accesos Rápidos Principales */}
      <DashboardAccesosRapidos accesos={accesosRapidos} />

      {/* 5. Modal de Personalización de Métricas */}
      <ModalPersonalizarMetricas
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        metricasAutorizadas={metricasAutorizadas}
        metricasOcultas={metricasOcultas}
        onToggleMetrica={toggleMetricaVisibilidad}
      />
    </div>
  );
};
