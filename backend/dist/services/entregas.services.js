// backend/src/services/entregas.service.ts
import { solicitudesEntrega, verificacionesEntrega, ventas, detallesVenta, empleados, productos, usuarios, db } from '../models/data.js';
import { AppError } from '../middleware/error.middleware.js';
export const entregasService = {
    /**
     * Obtener todas las solicitudes con filtros
     */
    getAll: (filtros) => {
        let resultados = [...solicitudesEntrega];
        if (filtros?.estado) {
            resultados = resultados.filter(s => s.estado === filtros.estado);
        }
        if (filtros?.empleado_id) {
            resultados = resultados.filter(s => s.empleado_id === filtros.empleado_id);
        }
        if (filtros?.fecha_desde) {
            resultados = resultados.filter(s => s.fecha_solicitud >= filtros.fecha_desde);
        }
        if (filtros?.fecha_hasta) {
            resultados = resultados.filter(s => s.fecha_solicitud <= filtros.fecha_hasta);
        }
        return resultados;
    },
    /**
     * Obtener solicitudes pendientes
     */
    getPendientes: () => {
        return solicitudesEntrega.filter(s => s.estado === 'pendiente' || s.estado === 'parcial');
    },
    /**
     * Obtener solicitud por ID
     */
    getById: (id) => {
        return solicitudesEntrega.find(s => s.id === id);
    },
    /**
     * Obtener solicitudes por empleado
     */
    getByEmpleado: (empleadoId) => {
        return solicitudesEntrega.filter(s => s.empleado_id === empleadoId);
    },
    /**
     * Confirmar entrega
     */
    confirmarEntrega: (data) => {
        const solicitud = solicitudesEntrega.find(s => s.id === data.solicitud_id);
        if (!solicitud) {
            throw new AppError('Solicitud de entrega no encontrada', 404);
        }
        if (solicitud.estado === 'completada') {
            throw new AppError('Esta solicitud ya fue completada', 400);
        }
        if (solicitud.estado === 'cancelada') {
            throw new AppError('Esta solicitud fue cancelada', 400);
        }
        // Actualizar solicitud
        solicitud.estado = 'completada';
        solicitud.cantidad_entregada = solicitud.cantidad_solicitada;
        solicitud.fecha_entrega = new Date();
        solicitud.entregado_por = data.guardia_id;
        solicitud.observaciones = data.observaciones || solicitud.observaciones;
        // Registrar verificación
        const nuevaVerificacion = {
            id: db.getNextId('verificacion'),
            solicitud_id: solicitud.id,
            empleado_verificado_id: solicitud.empleado_id,
            guardia_id: data.guardia_id,
            metodo_verificacion: data.metodo_verificacion,
            estado_verificacion: 'exitosa',
            fecha_verificacion: new Date(),
            observaciones: data.observaciones
        };
        verificacionesEntrega.push(nuevaVerificacion);
        // Actualizar venta
        const venta = ventas.find(v => v.id === solicitud.venta_id);
        if (venta) {
            venta.estado_entrega = 'entregado';
            venta.entregado_por = data.guardia_id;
            venta.fecha_entrega = new Date();
        }
        return { solicitud, verificacion: nuevaVerificacion };
    },
    /**
     * Cancelar solicitud
     */
    cancelarEntrega: (solicitudId, motivo) => {
        const solicitud = solicitudesEntrega.find(s => s.id === solicitudId);
        if (!solicitud) {
            throw new AppError('Solicitud de entrega no encontrada', 404);
        }
        if (solicitud.estado === 'completada') {
            throw new AppError('No se puede cancelar una entrega ya completada', 400);
        }
        solicitud.estado = 'cancelada';
        solicitud.observaciones = `Cancelada: ${motivo}`;
        // Actualizar venta
        const venta = ventas.find(v => v.id === solicitud.venta_id);
        if (venta) {
            venta.estado_entrega = 'cancelado';
        }
        return solicitud;
    },
    /**
     * Reportar incidente en verificación
     */
    reportarIncidente: (solicitudId, guardiaId, observaciones) => {
        const solicitud = solicitudesEntrega.find(s => s.id === solicitudId);
        if (!solicitud) {
            throw new AppError('Solicitud de entrega no encontrada', 404);
        }
        // Registrar verificación fallida
        const nuevaVerificacion = {
            id: db.getNextId('verificacion'),
            solicitud_id: solicitud.id,
            empleado_verificado_id: solicitud.empleado_id,
            guardia_id: guardiaId,
            metodo_verificacion: 'validacion_manual',
            estado_verificacion: 'fallida',
            fecha_verificacion: new Date(),
            observaciones
        };
        verificacionesEntrega.push(nuevaVerificacion);
        // Marcar solicitud como retenida
        solicitud.estado = 'retenida';
        solicitud.observaciones = `Incidente reportado: ${observaciones}`;
        return { solicitud, verificacion: nuevaVerificacion };
    },
    /**
     * Obtener detalles completos de una solicitud
     */
    getDetallesCompletos: (solicitudId) => {
        const solicitud = solicitudesEntrega.find(s => s.id === solicitudId);
        if (!solicitud) {
            return null;
        }
        const empleado = empleados.find(e => e.id === solicitud.empleado_id);
        const producto = productos.find(p => p.id === solicitud.producto_id);
        const verificacion = verificacionesEntrega.find(v => v.solicitud_id === solicitud.id);
        const entregadoPor = solicitud.entregado_por
            ? usuarios.find(u => u.id === solicitud.entregado_por)
            : null;
        const venta = ventas.find(v => v.id === solicitud.venta_id);
        const detalles = detallesVenta.filter(d => d.venta_id === solicitud.venta_id);
        return {
            solicitud,
            empleado,
            producto,
            verificacion,
            entregadoPor,
            venta,
            detalles
        };
    },
    /**
     * Obtener estadísticas de entregas
     */
    getEstadisticas: () => {
        const total = solicitudesEntrega.length;
        const pendientes = solicitudesEntrega.filter(s => s.estado === 'pendiente').length;
        const completadas = solicitudesEntrega.filter(s => s.estado === 'completada').length;
        const canceladas = solicitudesEntrega.filter(s => s.estado === 'cancelada').length;
        const retenidas = solicitudesEntrega.filter(s => s.estado === 'retenida').length;
        // Calcular tiempo promedio de entrega (solo completadas)
        const completadasConTiempo = solicitudesEntrega.filter(s => s.estado === 'completada' && s.fecha_solicitud && s.fecha_entrega);
        let tiempoPromedio = 0;
        if (completadasConTiempo.length > 0) {
            const totalTiempo = completadasConTiempo.reduce((sum, s) => {
                const diff = s.fecha_entrega.getTime() - s.fecha_solicitud.getTime();
                return sum + diff;
            }, 0);
            tiempoPromedio = Math.round(totalTiempo / completadasConTiempo.length / 60000); // en minutos
        }
        // Entregas por empleado
        const entregasPorEmpleado = empleados.map(emp => {
            const entregas = solicitudesEntrega.filter(s => s.empleado_id === emp.id && s.estado === 'completada');
            return {
                empleado: `${emp.nombre} ${emp.apellido}`,
                codigo: emp.codigo_empleado,
                total_entregas: entregas.length,
                total_productos: entregas.reduce((sum, s) => sum + s.cantidad_entregada, 0)
            };
        }).filter(e => e.total_entregas > 0);
        // Productos más entregados
        const productosEntregados = solicitudesEntrega
            .filter(s => s.estado === 'completada')
            .reduce((acc, s) => {
            const existing = acc.find(a => a.producto_id === s.producto_id);
            if (existing) {
                existing.cantidad += s.cantidad_entregada;
            }
            else {
                acc.push({ producto_id: s.producto_id, cantidad: s.cantidad_entregada });
            }
            return acc;
        }, []);
        const productosMasEntregados = productosEntregados
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 10)
            .map(item => {
            const producto = productos.find(p => p.id === item.producto_id);
            return {
                producto: producto?.nombre || 'Producto eliminado',
                cantidad: item.cantidad
            };
        });
        return {
            total,
            pendientes,
            completadas,
            canceladas,
            retenidas,
            tiempo_promedio_entrega: tiempoPromedio,
            entregas_por_empleado: entregasPorEmpleado,
            productos_mas_entregados: productosMasEntregados
        };
    }
};
