"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ventasController = void 0;
const db_1 = __importDefault(require("../config/db"));
const error_middleware_1 = require("../middleware/error.middleware");
exports.ventasController = {
    // Obtener todas las ventas
    getAll: async (req, res) => {
        try {
            // Si es un empleado, solo ve sus propias ventas
            let query = `
        SELECT v.*, e.empleado_nombre, e.empleado_apellido, u.usuario_nombre
        FROM venta v
        LEFT JOIN empleado e ON v.empleado_id = e.empleado_id
        LEFT JOIN usuario u ON v.usuario_id = u.usuario_id
      `;
            const params = [];
            if (req.user?.rol_id === 3) {
                let empId = req.empleado?.empleado_id;
                if (!empId) {
                    const userRes = await db_1.default.query('SELECT empleado_id FROM usuario WHERE usuario_id = $1', [req.user.id]);
                    empId = userRes.rows[0]?.empleado_id;
                }
                query += ' WHERE v.empleado_id = $1';
                params.push(empId || 0);
            }
            query += ' ORDER BY v.venta_fecha DESC';
            const salesRes = await db_1.default.query(query, params);
            const sales = [];
            for (const row of salesRes.rows) {
                const detailsRes = await db_1.default.query(`SELECT vd.*, p.producto_nombre, p.producto_codigo
           FROM venta_detalle vd
           JOIN producto p ON vd.producto_id = p.producto_id
           WHERE vd.venta_id = $1`, [row.venta_id]);
                sales.push({
                    id: row.venta_id,
                    empleado_id: row.empleado_id,
                    empleado_nombre: row.empleado_nombre ? `${row.empleado_nombre} ${row.empleado_apellido}` : 'Cliente Externo',
                    usuario_nombre: row.usuario_nombre || 'Sistema Kiosco',
                    fecha: row.venta_fecha,
                    total_bruto: parseFloat(row.venta_total),
                    descuento_total: 0,
                    total_neto: parseFloat(row.venta_total),
                    estado: row.venta_estado,
                    metodo_pago: 'nomina',
                    detalles: detailsRes.rows.map(d => ({
                        id: d.venta_detalle_id,
                        producto_id: d.producto_id,
                        producto_nombre: d.producto_nombre,
                        producto_codigo: d.producto_codigo,
                        cantidad: d.venta_detalle_cantidad,
                        precio_unitario: parseFloat(d.venta_detalle_precio_unitario),
                        subtotal: parseFloat(d.venta_detalle_subtotal)
                    }))
                });
            }
            res.json({
                success: true,
                data: sales
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener ventas', 500);
        }
    },
    // Crear una nueva venta / orden desde el POS
    create: async (req, res) => {
        const client = await db_1.default.connect();
        try {
            const { empleado_id, productos } = req.body;
            if (!empleado_id || !productos || !productos.length) {
                throw new error_middleware_1.AppError('Datos de venta incompletos', 400);
            }
            await client.query('BEGIN');
            // 1. Obtener primera sucursal activa
            const sucRes = await client.query("SELECT sucursal_id FROM sucursal WHERE sucursal_estado = 'activo' LIMIT 1");
            const sucursalId = sucRes.rows[0]?.sucursal_id;
            if (!sucursalId) {
                throw new error_middleware_1.AppError('No hay sucursales activas configuradas', 500);
            }
            let totalBruto = 0;
            const calculatedDetails = [];
            // 2. Validar productos, stock y calcular precios
            for (const p of productos) {
                const prodRes = await client.query('SELECT * FROM producto WHERE producto_id = $1 FOR UPDATE', [p.producto_id]);
                const producto = prodRes.rows[0];
                if (!producto) {
                    throw new error_middleware_1.AppError(`Producto con ID ${p.producto_id} no encontrado`, 404);
                }
                if (producto.producto_stock < p.cantidad) {
                    throw new error_middleware_1.AppError(`Stock insuficiente para: ${producto.producto_nombre}`, 400);
                }
                const subtotal = parseFloat(producto.producto_precio) * p.cantidad;
                totalBruto += subtotal;
                calculatedDetails.push({
                    producto_id: p.producto_id,
                    cantidad: p.cantidad,
                    precio_unitario: parseFloat(producto.producto_precio),
                    subtotal: subtotal
                });
            }
            // Sin descuento (0%)
            const descuento = 0;
            const totalNeto = totalBruto;
            // 3. Crear la venta en la BD
            // Si el comprador es el empleado del token, o un usuario admin
            const usuarioId = req.user?.id && req.user.id !== 0 ? req.user.id : null;
            const ventaRes = await client.query(`INSERT INTO venta (sucursal_id, empleado_id, usuario_id, venta_total, venta_estado, venta_observacion) 
         VALUES ($1, $2, $3, $4, 'completada', 'Compra POS Autoservicio') 
         RETURNING venta_id`, [sucursalId, empleado_id, usuarioId, totalNeto]);
            const ventaId = ventaRes.rows[0].venta_id;
            // 4. Crear detalles y actualizar stock
            for (const d of calculatedDetails) {
                const itemNeto = d.subtotal;
                await client.query(`INSERT INTO venta_detalle (venta_id, producto_id, venta_detalle_cantidad, venta_detalle_precio_unitario, venta_detalle_subtotal) 
           VALUES ($1, $2, $3, $4, $5)`, [ventaId, d.producto_id, d.cantidad, d.precio_unitario, itemNeto]);
                // Descontar del inventario
                await client.query('UPDATE producto SET producto_stock = producto_stock - $1 WHERE producto_id = $2', [d.cantidad, d.producto_id]);
            }
            // 5. Generar código de retiro dinámico según el departamento del empleado y crear solicitud de entrega
            const empDeptRes = await client.query(`SELECT d.departamento_nombre 
         FROM empleado e
         LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
         WHERE e.empleado_id = $1`, [empleado_id]);
            const deptoNombre = empDeptRes.rows[0]?.departamento_nombre || 'BODEGA';
            let prefix = 'BOD';
            if (deptoNombre) {
                // Remover acentos, espacios y caracteres especiales
                const cleanName = deptoNombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").trim();
                if (cleanName.length >= 3) {
                    prefix = cleanName.substring(0, 3).toUpperCase();
                }
                else if (cleanName.length > 0) {
                    prefix = cleanName.toUpperCase().padEnd(3, 'X');
                }
            }
            const randNum = Math.floor(100 + Math.random() * 900);
            const codigoRetiro = `${prefix}-${randNum}`;
            const solRes = await client.query(`INSERT INTO solicitud_entrega (empleado_id, sucursal_id, solicitud_entrega_codigo, solicitud_entrega_estado, solicitud_entrega_observacion) 
         VALUES ($1, $2, $3, 'pendiente', 'Retiro en Bodega de POS Autoservicio')
         RETURNING solicitud_entrega_id`, [empleado_id, sucursalId, codigoRetiro]);
            const solId = solRes.rows[0].solicitud_entrega_id;
            // 6. Crear detalles de solicitud de entrega
            for (const d of calculatedDetails) {
                await client.query(`INSERT INTO solicitud_entrega_detalle (solicitud_entrega_id, producto_id, solicitud_entrega_detalle_cantidad, solicitud_entrega_detalle_precio_unitario) 
           VALUES ($1, $2, $3, $4)`, [solId, d.producto_id, d.cantidad, d.precio_unitario]);
            }
            await client.query('COMMIT');
            if (req.io) {
                req.io.emit('entrega-pendiente', { id: solId, codigo_entrega: codigoRetiro });
                req.io.emit('stock-actualizado', {
                    productos: calculatedDetails.map(d => ({
                        producto_id: d.producto_id,
                        cantidad: d.cantidad
                    }))
                });
                console.log('📡 WebSocket: Emitido entrega-pendiente y stock-actualizado para', codigoRetiro);
            }
            res.status(201).json({
                success: true,
                data: {
                    venta_id: ventaId,
                    codigo_retiro: codigoRetiro,
                    total_bruto: totalBruto,
                    descuento_total: descuento,
                    total_neto: totalNeto
                },
                message: 'Compra realizada con éxito'
            });
            return;
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al realizar compra en el servidor', 500);
        }
        finally {
            client.release();
        }
    }
};
