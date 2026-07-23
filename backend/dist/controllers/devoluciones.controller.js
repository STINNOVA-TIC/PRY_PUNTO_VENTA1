"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.devolucionesController = void 0;
const db_1 = __importDefault(require("../config/db"));
const error_middleware_1 = require("../middleware/error.middleware");
exports.devolucionesController = {
    // Solicitar devolución (iniciada por el entregador/guardia)
    solicitar: async (req, res) => {
        const client = await db_1.default.connect();
        try {
            const { solicitud_entrega_id, motivo, detalles } = req.body;
            if (!solicitud_entrega_id || !motivo) {
                throw new error_middleware_1.AppError('Datos de devolución incompletos', 400);
            }
            await client.query('BEGIN');
            // Obtener empleado_id de la solicitud de entrega
            const solRes = await client.query('SELECT empleado_id, solicitud_entrega_estado FROM solicitud_entrega WHERE solicitud_entrega_id = $1', [solicitud_entrega_id]);
            const solicitud = solRes.rows[0];
            if (!solicitud) {
                throw new error_middleware_1.AppError('Solicitud de entrega no encontrada', 404);
            }
            // Insertar la devolución
            const usuarioEntregaId = req.user?.id && req.user.id !== 0 ? req.user.id : null;
            const devInsertRes = await client.query(`INSERT INTO devolucion (solicitud_entrega_id, empleado_id, usuario_entrega_id, devolucion_motivo, devolucion_estado) 
         VALUES ($1, $2, $3, $4, 'pendiente') RETURNING devolucion_id`, [solicitud_entrega_id, solicitud.empleado_id, usuarioEntregaId, motivo.trim()]);
            const devolucionId = devInsertRes.rows[0].devolucion_id;
            // Si detalles se envían, insertamos detalles específicos
            if (detalles && Array.isArray(detalles) && detalles.length > 0) {
                for (const d of detalles) {
                    if (d.cantidad_devuelta > 0) {
                        await client.query(`INSERT INTO devolucion_detalle (devolucion_id, producto_id, cantidad_devuelta) VALUES ($1, $2, $3)`, [devolucionId, d.producto_id, d.cantidad_devuelta]);
                    }
                }
            }
            else {
                // De lo contrario, por compatibilidad, insertamos todos los productos de la solicitud como devolución
                const itemsRes = await client.query(`SELECT producto_id, solicitud_entrega_detalle_cantidad FROM solicitud_entrega_detalle WHERE solicitud_entrega_id = $1`, [solicitud_entrega_id]);
                for (const item of itemsRes.rows) {
                    await client.query(`INSERT INTO devolucion_detalle (devolucion_id, producto_id, cantidad_devuelta) VALUES ($1, $2, $3)`, [devolucionId, item.producto_id, item.solicitud_entrega_detalle_cantidad]);
                }
            }
            await client.query('COMMIT');
            if (req.io) {
                req.io.emit('devolucion-actualizada', { id: solicitud_entrega_id });
                console.log('📡 WebSocket: Emitido devolucion-actualizada para', solicitud_entrega_id);
            }
            res.status(201).json({
                success: true,
                message: 'Solicitud de devolución registrada. Pendiente de aprobación por Talento Humano.'
            });
            return;
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al registrar devolución', 500);
        }
        finally {
            client.release();
        }
    },
    // Obtener todas las devoluciones (para TTHH y Guardia)
    getAll: async (_req, res) => {
        try {
            const devRes = await db_1.default.query(`SELECT d.*, e.empleado_nombre, e.empleado_apellido, e.empleado_cedula,
                se.solicitud_entrega_codigo,
                u_entrega.usuario_nombre as entregador_nombre,
                u_tthh.usuario_nombre as tthh_nombre
         FROM devolucion d
         JOIN empleado e ON d.empleado_id = e.empleado_id
         JOIN solicitud_entrega se ON d.solicitud_entrega_id = se.solicitud_entrega_id
         LEFT JOIN usuario u_entrega ON d.usuario_entrega_id = u_entrega.usuario_id
         LEFT JOIN usuario u_tthh ON d.usuario_tthh_id = u_tthh.usuario_id
         ORDER BY d.devolucion_fecha_solicitud DESC`);
            const items = [];
            for (const row of devRes.rows) {
                const detailsRes = await db_1.default.query(`SELECT dd.*, p.producto_nombre, p.producto_codigo
           FROM devolucion_detalle dd
           JOIN producto p ON dd.producto_id = p.producto_id
           WHERE dd.devolucion_id = $1`, [row.devolucion_id]);
                items.push({
                    id: row.devolucion_id,
                    solicitud_entrega_id: row.solicitud_entrega_id,
                    codigo_entrega: row.solicitud_entrega_codigo,
                    empleado_nombre: `${row.empleado_nombre} ${row.empleado_apellido}`,
                    empleado_cedula: row.empleado_cedula,
                    entregador_nombre: row.entregador_nombre || 'N/A',
                    tthh_nombre: row.tthh_nombre || 'N/A',
                    fecha_solicitud: row.devolucion_fecha_solicitud,
                    fecha_aprobacion: row.devolucion_fecha_aprobacion,
                    motivo: row.devolucion_motivo,
                    estado: row.devolucion_estado,
                    observacion_tthh: row.devolucion_observacion_tthh || '',
                    detalles: detailsRes.rows.map((d) => ({
                        id: d.devolucion_detalle_id,
                        producto_id: d.producto_id,
                        producto_nombre: d.producto_nombre,
                        producto_codigo: d.producto_codigo,
                        cantidad: d.cantidad_devuelta
                    }))
                });
            }
            res.json({
                success: true,
                data: items
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener devoluciones', 500);
        }
    },
    // Aprobar devolución (por Talento Humano)
    aprobar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const usuarioTthhId = req.user?.id && req.user.id !== 0 ? req.user.id : null;
            const updateRes = await db_1.default.query(`UPDATE devolucion 
         SET devolucion_estado = 'aprobado', 
             devolucion_fecha_aprobacion = CURRENT_TIMESTAMP, 
             usuario_tthh_id = $1 
         WHERE devolucion_id = $2 
         RETURNING *`, [usuarioTthhId, id]);
            if (updateRes.rows.length === 0) {
                throw new error_middleware_1.AppError('Solicitud de devolución no encontrada', 404);
            }
            if (req.io) {
                req.io.emit('devolucion-actualizada', { id });
                console.log('📡 WebSocket: Emitido devolucion-actualizada para', id);
            }
            res.json({
                success: true,
                message: 'Devolución aprobada por Talento Humano. El entregador ahora puede confirmar la cancelación.'
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al aprobar devolución', 500);
        }
    },
    // Rechazar devolución (por Talento Humano)
    rechazar: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { observaciones } = req.body;
            const usuarioTthhId = req.user?.id && req.user.id !== 0 ? req.user.id : null;
            if (!observaciones) {
                throw new error_middleware_1.AppError('Debe incluir una justificación o comentario para el rechazo', 400);
            }
            const updateRes = await db_1.default.query(`UPDATE devolucion 
         SET devolucion_estado = 'rechazado', 
             devolucion_fecha_aprobacion = CURRENT_TIMESTAMP, 
             devolucion_observacion_tthh = $1, 
             usuario_tthh_id = $2 
         WHERE devolucion_id = $3 
         RETURNING *`, [observaciones.trim(), usuarioTthhId, id]);
            if (updateRes.rows.length === 0) {
                throw new error_middleware_1.AppError('Solicitud de devolución no encontrada', 404);
            }
            if (req.io) {
                req.io.emit('devolucion-actualizada', { id });
                console.log('📡 WebSocket: Emitido devolucion-actualizada para', id);
            }
            res.json({
                success: true,
                message: 'Devolución rechazada por Talento Humano.'
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al rechazar devolución', 500);
        }
    }
};
