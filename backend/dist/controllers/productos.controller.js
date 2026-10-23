"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productosController = void 0;
const db_1 = __importDefault(require("../config/db"));
const error_middleware_1 = require("../middleware/error.middleware");
exports.productosController = {
    // Obtener todos los productos
    getAll: async (_req, res) => {
        try {
            const prodRes = await db_1.default.query("SELECT * FROM producto ORDER BY producto_nombre ASC");
            const items = prodRes.rows.map(row => ({
                id: row.producto_id,
                codigo_barras: row.producto_codigo,
                nombre: row.producto_nombre,
                descripcion: row.producto_descripcion || '',
                tipo_articulo: row.producto_tipo_articulo || 'OTROS',
                precio_costo: parseFloat(row.producto_precio_compra || '0'),
                precio_venta: parseFloat(row.producto_precio || '0'),
                stock_actual: row.producto_stock,
                stock_minimo: 5,
                categoria_id: row.categoria_id,
                proveedor_id: row.proveedor_id,
                foto: row.producto_foto || 'https://img.icons8.com/fluent/1200/fast-moving-consumer-goods.jpg',
                activo: row.producto_estado === 'activo'
            }));
            res.json({
                success: true,
                data: items
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener productos', 500);
        }
    },
    // Log de vencimientos: cada recepción de un requerimiento es un lote.
    // Vencimiento = fecha editada por el usuario, o fecha de ingreso + DIAS_VIDA_UTIL.
    getVencimientos: async (_req, res) => {
        const DIAS_VIDA_UTIL = 35; // 5 semanas
        try {
            const result = await db_1.default.query(`
        SELECT
          COALESCE('R-' || r.orden_compra_detalle_recepcion_id,
                   'D-' || d.orden_compra_detalle_id)                        AS id,
          r.orden_compra_detalle_recepcion_id                                AS recepcion_id,
          COALESCE(p.producto_codigo, '')                                    AS producto_codigo,
          COALESCE(p.producto_nombre, d.orden_compra_detalle_descripcion)    AS producto_nombre,
          COALESCE(c.categoria_nombre, 'Sin categoría')                      AS categoria,
          COALESCE(r.cantidad_recibida, d.orden_compra_detalle_cantidad)     AS cantidad,
          TO_CHAR(COALESCE(r.fecha_recepcion, oc.orden_compra_fecha_recepcion), 'YYYY-MM-DD') AS fecha_ingreso,
          TO_CHAR(
            COALESCE(
              r.fecha_vencimiento,
              COALESCE(r.fecha_recepcion, oc.orden_compra_fecha_recepcion)::date + $1::int
            ), 'YYYY-MM-DD')                                                 AS fecha_vencimiento,
          (r.fecha_vencimiento IS NOT NULL)                                  AS vencimiento_manual,
          oc.orden_compra_codigo                                             AS referencia,
          r.factura_codigo                                                   AS factura
        FROM orden_compra_detalle d
        JOIN orden_compra oc                       ON oc.orden_compra_id = d.orden_compra_id
        LEFT JOIN orden_compra_detalle_recepcion r ON r.orden_compra_detalle_id = d.orden_compra_detalle_id
        LEFT JOIN producto p                       ON p.producto_id = d.producto_id
        LEFT JOIN categoria c                      ON c.categoria_id = p.categoria_id
        WHERE d.orden_compra_detalle_tipo_articulo <> 'SERVICIO'
          AND COALESCE(r.fecha_recepcion, oc.orden_compra_fecha_recepcion) IS NOT NULL
        ORDER BY fecha_vencimiento
        `, [DIAS_VIDA_UTIL]);
            res.json({ success: true, data: result.rows });
            return;
        }
        catch (error) {
            console.error('Error al obtener vencimientos:', error);
            throw new error_middleware_1.AppError('Error al obtener el log de vencimientos', 500);
        }
    },
    // Editar (o restablecer con null) la fecha de vencimiento de un lote recibido
    actualizarVencimiento: async (req, res) => {
        const recepcionId = Number(req.params.recepcionId);
        const { fecha_vencimiento } = req.body;
        if (!Number.isInteger(recepcionId) || recepcionId <= 0) {
            throw new error_middleware_1.AppError('Lote inválido.', 400);
        }
        // null = volver a la fecha calculada (ingreso + 35 días)
        const fecha = fecha_vencimiento ? String(fecha_vencimiento) : null;
        if (fecha) {
            const valida = /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
                new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha;
            if (!valida)
                throw new error_middleware_1.AppError('La fecha debe tener formato AAAA-MM-DD y ser válida.', 400);
        }
        try {
            const actual = await db_1.default.query(`SELECT TO_CHAR(fecha_recepcion, 'YYYY-MM-DD') AS fecha_ingreso
         FROM orden_compra_detalle_recepcion
         WHERE orden_compra_detalle_recepcion_id = $1`, [recepcionId]);
            if (actual.rows.length === 0)
                throw new error_middleware_1.AppError('Lote no encontrado.', 404);
            if (fecha && fecha < actual.rows[0].fecha_ingreso) {
                throw new error_middleware_1.AppError('La fecha de vencimiento no puede ser anterior a la fecha de ingreso.', 400);
            }
            await db_1.default.query(`UPDATE orden_compra_detalle_recepcion
         SET fecha_vencimiento = $1
         WHERE orden_compra_detalle_recepcion_id = $2`, [fecha, recepcionId]);
            res.json({
                success: true,
                message: fecha ? 'Fecha de vencimiento actualizada.' : 'Fecha restablecida a la calculada.'
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            console.error('Error al actualizar vencimiento:', error);
            throw new error_middleware_1.AppError('Error al actualizar la fecha de vencimiento', 500);
        }
    },
    // Obtener producto por ID
    getById: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const prodRes = await db_1.default.query("SELECT * FROM producto WHERE producto_id = $1", [id]);
            const row = prodRes.rows[0];
            if (!row) {
                throw new error_middleware_1.AppError('Producto no encontrado', 404);
            }
            res.json({
                success: true,
                data: {
                    id: row.producto_id,
                    codigo_barras: row.producto_codigo,
                    nombre: row.producto_nombre,
                    descripcion: row.producto_descripcion || '',
                    tipo_articulo: row.producto_tipo_articulo || 'OTROS',
                    precio_costo: parseFloat(row.producto_precio_compra || '0'),
                    precio_venta: parseFloat(row.producto_precio || '0'),
                    stock_actual: row.producto_stock,
                    stock_minimo: 5,
                    categoria_id: row.categoria_id,
                    proveedor_id: row.proveedor_id,
                    foto: row.producto_foto || 'https://img.icons8.com/fluent/1200/fast-moving-consumer-goods.jpg',
                    activo: row.producto_estado === 'activo'
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al obtener producto', 500);
        }
    },
    // Crear un nuevo producto
    create: async (req, res) => {
        try {
            const { codigo_barras, nombre, descripcion, precio_costo, precio_venta, stock_actual, categoria_id, proveedor_id, foto, tipo_articulo } = req.body;
            if (!codigo_barras || !nombre || !precio_venta || !stock_actual) {
                throw new error_middleware_1.AppError('Datos incompletos para crear el producto', 400);
            }
            // Obtener primera categoria y proveedor si no se especificaron
            let catId = categoria_id;
            if (!catId) {
                const catRes = await db_1.default.query('SELECT categoria_id FROM categoria LIMIT 1');
                catId = catRes.rows[0]?.categoria_id;
            }
            let provId = proveedor_id;
            if (!provId) {
                const provRes = await db_1.default.query('SELECT proveedor_id FROM proveedor LIMIT 1');
                provId = provRes.rows[0]?.proveedor_id;
            }
            const defaultFoto = foto || 'https://img.icons8.com/fluent/1200/fast-moving-consumer-goods.jpg';
            const insertRes = await db_1.default.query(`INSERT INTO producto (categoria_id, proveedor_id, producto_codigo, producto_nombre, producto_descripcion, producto_tipo_articulo, producto_precio, producto_precio_compra, producto_stock, producto_foto, producto_estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'activo')
         ON CONFLICT (producto_codigo) DO UPDATE SET
           categoria_id = EXCLUDED.categoria_id,
           proveedor_id = EXCLUDED.proveedor_id,
           producto_nombre = EXCLUDED.producto_nombre,
           producto_descripcion = EXCLUDED.producto_descripcion,
           producto_tipo_articulo = EXCLUDED.producto_tipo_articulo,
           producto_precio = EXCLUDED.producto_precio,
           producto_precio_compra = EXCLUDED.producto_precio_compra,
           producto_stock = EXCLUDED.producto_stock,
           producto_foto = EXCLUDED.producto_foto,
           producto_estado = 'activo'
         RETURNING *`, [catId, provId, String(codigo_barras).trim(), String(nombre).trim(), descripcion || '', tipo_articulo || 'OTROS', parseFloat(precio_venta), parseFloat(precio_costo || '0'), parseInt(stock_actual), defaultFoto]);
            res.status(201).json({
                success: true,
                data: insertRes.rows[0],
                message: 'Producto creado exitosamente'
            });
            return;
        }
        catch (error) {
            console.error('Error en productosController.create:', error);
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al crear producto en base de datos', 500);
        }
    },
    // Modificar stock de un producto
    updateStock: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { stock } = req.body;
            if (stock === undefined || isNaN(parseInt(stock))) {
                throw new error_middleware_1.AppError('El valor del stock es inválido', 400);
            }
            const updateRes = await db_1.default.query('UPDATE producto SET producto_stock = $1 WHERE producto_id = $2 RETURNING *', [parseInt(stock), id]);
            if (updateRes.rows.length === 0) {
                throw new error_middleware_1.AppError('Producto no encontrado', 404);
            }
            const prodActualizado = updateRes.rows[0];
            // Emitir evento por WebSockets para auditoría y actualización en tiempo real
            if (req.io) {
                req.io.emit('stock-actualizado', {
                    producto_id: id,
                    producto_nombre: prodActualizado.producto_nombre,
                    stock_nuevo: prodActualizado.producto_stock,
                    usuario_nombre: req.user?.nombre || 'Inventario',
                    tipo_evento: 'ajuste_stock'
                });
            }
            res.json({
                success: true,
                data: prodActualizado,
                message: 'Stock actualizado exitosamente'
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al modificar stock', 500);
        }
    },
    getCategorias: async (_req, res) => {
        try {
            const catRes = await db_1.default.query("SELECT categoria_id as id, categoria_nombre as nombre FROM categoria WHERE categoria_estado = 'activo' ORDER BY categoria_nombre ASC");
            res.json({ success: true, data: catRes.rows });
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener categorías', 500);
        }
    },
    getProveedores: async (_req, res) => {
        try {
            const provRes = await db_1.default.query("SELECT proveedor_id as id, proveedor_nombre as nombre FROM proveedor WHERE proveedor_estado = 'activo' ORDER BY proveedor_nombre ASC");
            res.json({ success: true, data: provRes.rows });
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener proveedores', 500);
        }
    },
};
