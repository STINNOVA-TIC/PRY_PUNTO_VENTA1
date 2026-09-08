"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = void 0;
const db_1 = __importDefault(require("../config/db"));
const error_middleware_1 = require("../middleware/error.middleware");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const TABLE_WHITELIST = [
    'departamento',
    'empresa',
    'sucursal',
    'centro_costos',
    'categoria',
    'proveedor',
    'producto',
    'rol',
    'modulo',
    'permiso',
    'rol_permiso'
];
exports.adminController = {
    // Obtener todas las filas de una tabla
    read: async (req, res) => {
        try {
            const { table } = req.params;
            if (!TABLE_WHITELIST.includes(table)) {
                throw new error_middleware_1.AppError('Tabla no permitida para administración dinámica', 400);
            }
            const pkCol = `${table}_id`;
            const query = `SELECT * FROM ${table} ORDER BY ${pkCol} DESC`;
            const result = await db_1.default.query(query);
            res.json({
                success: true,
                data: result.rows
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al leer datos administrativos', 500);
        }
    },
    // Insertar una fila de forma dinámica
    create: async (req, res) => {
        try {
            const { table } = req.params;
            const data = req.body;
            if (!TABLE_WHITELIST.includes(table)) {
                throw new error_middleware_1.AppError('Tabla no permitida para administración dinámica', 400);
            }
            // Filtrar y validar llaves de la petición
            const keys = Object.keys(data).filter(key => /^[a-z0-9_]+$/.test(key));
            if (keys.length === 0) {
                throw new error_middleware_1.AppError('No hay columnas válidas para insertar', 400);
            }
            const columnsStr = keys.join(', ');
            const valuesPlaceholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
            const queryValues = keys.map(k => data[k]);
            const query = `INSERT INTO ${table} (${columnsStr}) VALUES (${valuesPlaceholders}) RETURNING *`;
            const result = await db_1.default.query(query, queryValues);
            // Si es una venta o producto, emitir evento socket
            if (table === 'producto') {
                req.io?.emit('producto-actualizado', result.rows[0]);
            }
            res.status(201).json({
                success: true,
                data: result.rows[0],
                message: 'Registro insertado exitosamente'
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al crear registro administrativo', 500);
        }
    },
    // Actualizar una fila de forma dinámica
    update: async (req, res) => {
        try {
            const { table, id } = req.params;
            const data = req.body;
            if (!TABLE_WHITELIST.includes(table)) {
                throw new error_middleware_1.AppError('Tabla no permitida para administración dinámica', 400);
            }
            const keys = Object.keys(data).filter(key => /^[a-z0-9_]+$/.test(key));
            if (keys.length === 0) {
                throw new error_middleware_1.AppError('No hay columnas válidas para actualizar', 400);
            }
            const pkCol = `${table}_id`;
            const sets = keys.map((k, idx) => `${k} = $${idx + 1}`).join(', ');
            const queryValues = keys.map(k => data[k]);
            queryValues.push(parseInt(id)); // ID al final
            const query = `UPDATE ${table} SET ${sets} WHERE ${pkCol} = $${queryValues.length} RETURNING *`;
            const result = await db_1.default.query(query, queryValues);
            if (result.rows.length === 0) {
                throw new error_middleware_1.AppError('Registro no encontrado', 404);
            }
            if (table === 'producto') {
                req.io?.emit('producto-actualizado', result.rows[0]);
            }
            res.json({
                success: true,
                data: result.rows[0],
                message: 'Registro actualizado exitosamente'
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al actualizar registro administrativo', 500);
        }
    },
    // Desactivar / Cambiar estado de forma blanda (Soft delete)
    toggleStatus: async (req, res) => {
        try {
            const { table, id } = req.params;
            const { activo } = req.body; // boolean
            if (!TABLE_WHITELIST.includes(table)) {
                throw new error_middleware_1.AppError('Tabla no permitida para administración dinámica', 400);
            }
            const pkCol = `${table}_id`;
            const statusCol = `${table}_estado`;
            const targetStatus = activo ? 'activo' : 'inactivo';
            // Si la tabla tiene campo de fecha de desactivación, registrarla
            let query = '';
            if (activo) {
                query = `UPDATE ${table} SET ${statusCol} = $1 WHERE ${pkCol} = $2 RETURNING *`;
            }
            else {
                // Buscar si existe columna de fecha de desactivación en metadata de Postgres
                const checkColRes = await db_1.default.query(`SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name = $1 AND column_name = $2`, [table, `${table}_fecha_desactivacion`]);
                if (checkColRes.rows.length > 0) {
                    query = `UPDATE ${table} SET ${statusCol} = $1, ${table}_fecha_desactivacion = CURRENT_TIMESTAMP WHERE ${pkCol} = $2 RETURNING *`;
                }
                else {
                    query = `UPDATE ${table} SET ${statusCol} = $1 WHERE ${pkCol} = $2 RETURNING *`;
                }
            }
            const result = await db_1.default.query(query, [targetStatus, parseInt(id)]);
            if (result.rows.length === 0) {
                throw new error_middleware_1.AppError('Registro no encontrado', 404);
            }
            res.json({
                success: true,
                data: result.rows[0],
                message: `Estado cambiado a ${targetStatus} exitosamente`
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al cambiar el estado del registro', 500);
        }
    },
    // Eliminar físicamente un registro
    delete: async (req, res) => {
        try {
            const { table, id } = req.params;
            if (!TABLE_WHITELIST.includes(table)) {
                throw new error_middleware_1.AppError('Tabla no permitida para administración dinámica', 400);
            }
            const pkCol = `${table}_id`;
            const query = `DELETE FROM ${table} WHERE ${pkCol} = $1 RETURNING *`;
            const result = await db_1.default.query(query, [parseInt(id)]);
            if (result.rows.length === 0) {
                throw new error_middleware_1.AppError('Registro no encontrado', 404);
            }
            if (table === 'producto') {
                req.io?.emit('producto-eliminado', id);
            }
            res.json({
                success: true,
                message: 'Registro eliminado físicamente de la base de datos'
            });
            return;
        }
        catch (error) {
            if (error.code === '23503') {
                throw new error_middleware_1.AppError('No se puede eliminar físicamente este producto porque tiene transacciones, requerimientos o solicitudes vinculadas. Utilice la opción "Desactivar" en su lugar.', 400);
            }
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al eliminar el registro administrativo', 500);
        }
    },
    // Obtener permisos de un rol organizado por módulos
    getRolePermissions: async (req, res) => {
        try {
            const { rolId } = req.params;
            const allPermsRes = await db_1.default.query(`
        SELECT p.permiso_id, p.permiso_clave, p.permiso_nombre, p.permiso_descripcion,
               m.modulo_id, m.modulo_nombre
        FROM permiso p
        JOIN modulo m ON p.modulo_id = m.modulo_id
        WHERE p.permiso_estado = 'activo'
        ORDER BY m.modulo_id ASC, p.permiso_nombre ASC
      `);
            const rolePermsRes = await db_1.default.query(`
        SELECT permiso_id FROM rol_permiso WHERE rol_id = $1
      `, [rolId]);
            const rolePermIds = new Set(rolePermsRes.rows.map(r => r.permiso_id));
            const data = allPermsRes.rows.map(p => ({
                id: p.permiso_id,
                clave: p.permiso_clave,
                nombre: p.permiso_nombre,
                descripcion: p.permiso_descripcion,
                modulo_id: p.modulo_id,
                modulo_nombre: p.modulo_nombre,
                asignado: rolePermIds.has(p.permiso_id)
            }));
            res.json({
                success: true,
                data
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener permisos del rol', 500);
        }
    },
    // Guardar asignación de permisos para un rol
    saveRolePermissions: async (req, res) => {
        const client = await db_1.default.connect();
        try {
            const { rolId } = req.params;
            const { permiso_ids } = req.body; // Array de IDs asignados
            if (!Array.isArray(permiso_ids)) {
                throw new error_middleware_1.AppError('Formato inválido: permiso_ids debe ser un arreglo', 400);
            }
            await client.query('BEGIN');
            // Limpiar permisos actuales del rol
            await client.query('DELETE FROM rol_permiso WHERE rol_id = $1', [rolId]);
            // Insertar los nuevos permisos seleccionados
            for (const pId of permiso_ids) {
                await client.query('INSERT INTO rol_permiso (rol_id, permiso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [rolId, pId]);
            }
            await client.query('COMMIT');
            res.json({
                success: true,
                message: 'Permisos del rol actualizados exitosamente'
            });
            return;
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al actualizar permisos del rol', 500);
        }
        finally {
            client.release();
        }
    },
    // Descargar dump SQL completo directo al navegador
    downloadDatabaseBackup: async (_req, res) => {
        try {
            const host = process.env.DB_HOST || 'db';
            const port = process.env.DB_PORT || '5432';
            const user = process.env.DB_USER || 'postgres';
            const password = process.env.DB_PASSWORD || 'password123';
            const database = process.env.DB_NAME || 'pointofsale';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_pos_${database}_${timestamp}.sql`;
            res.setHeader('Content-Type', 'application/sql');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            const env = {
                ...process.env,
                PGPASSWORD: password
            };
            const pgDump = (0, child_process_1.spawn)('pg_dump', [
                '-h', host,
                '-p', port,
                '-U', user,
                '-d', database,
                '--clean',
                '--if-exists',
                '--no-owner',
                '--no-privileges'
            ], { env });
            pgDump.stdout.pipe(res);
            pgDump.stderr.on('data', (data) => {
                console.warn(`[pg_dump notice/warning]: ${data.toString()}`);
            });
            pgDump.on('error', (err) => {
                console.error('[pg_dump error]:', err);
                if (!res.headersSent) {
                    res.status(500).json({ success: false, message: 'Error al invocar pg_dump' });
                }
            });
        }
        catch (error) {
            console.error('Error generando backup de BD:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Error interno al generar respaldo de la base de datos' });
            }
        }
    },
    // Listar todas las copias de seguridad existentes en /backups (manuales y automáticas del cron)
    listDatabaseBackups: async (_req, res) => {
        try {
            const backupDir = '/backups';
            if (!fs_1.default.existsSync(backupDir)) {
                res.json({ success: true, data: [] });
                return;
            }
            const files = fs_1.default.readdirSync(backupDir);
            const backupList = files
                .filter(file => file.endsWith('.sql') || file.endsWith('.dump') || file.endsWith('.tar.gz'))
                .map(file => {
                const filePath = path_1.default.join(backupDir, file);
                const stats = fs_1.default.statSync(filePath);
                const isCron = file.startsWith('db_') && file.endsWith('.dump');
                const isImages = file.startsWith('images_');
                let tipo = 'Manual (SQL)';
                if (isCron)
                    tipo = 'Automática (Cron DB)';
                else if (isImages)
                    tipo = 'Imágenes';
                else if (file.endsWith('.sql'))
                    tipo = 'Manual (Admin SQL)';
                return {
                    filename: file,
                    size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                    size_bytes: stats.size,
                    created_at: stats.mtime.toISOString(),
                    tipo
                };
            })
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            res.json({ success: true, data: backupList });
        }
        catch (error) {
            console.error('Error al listar backups:', error);
            throw new error_middleware_1.AppError('Error al listar archivos de respaldo', 500);
        }
    },
    // Crear una nueva copia de seguridad y guardarla físicamente en /backups
    createDatabaseBackup: async (_req, res) => {
        try {
            const host = process.env.DB_HOST || 'db';
            const port = process.env.DB_PORT || '5432';
            const user = process.env.DB_USER || 'postgres';
            const password = process.env.DB_PASSWORD || 'password123';
            const database = process.env.DB_NAME || 'pointofsale';
            const backupDir = '/backups';
            if (!fs_1.default.existsSync(backupDir)) {
                fs_1.default.mkdirSync(backupDir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `backup_pos_manual_${timestamp}.sql`;
            const filePath = path_1.default.join(backupDir, filename);
            const writeStream = fs_1.default.createWriteStream(filePath);
            const env = { ...process.env, PGPASSWORD: password };
            const pgDump = (0, child_process_1.spawn)('pg_dump', [
                '-h', host,
                '-p', port,
                '-U', user,
                '-d', database,
                '--clean',
                '--if-exists',
                '--no-owner',
                '--no-privileges'
            ], { env });
            pgDump.stdout.pipe(writeStream);
            pgDump.on('close', (code) => {
                if (code === 0) {
                    const stats = fs_1.default.statSync(filePath);
                    res.json({
                        success: true,
                        message: 'Copia de seguridad generada y almacenada en el servidor con éxito',
                        data: {
                            filename,
                            size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                            created_at: stats.mtime.toISOString(),
                            tipo: 'Manual (Admin SQL)'
                        }
                    });
                }
                else {
                    if (fs_1.default.existsSync(filePath))
                        fs_1.default.unlinkSync(filePath);
                    res.status(500).json({ success: false, message: `pg_dump finalizó con código de error ${code}` });
                }
            });
            pgDump.on('error', (err) => {
                console.error('Error invocando pg_dump:', err);
                if (fs_1.default.existsSync(filePath))
                    fs_1.default.unlinkSync(filePath);
                res.status(500).json({ success: false, message: 'Fallo al ejecutar herramienta de respaldo' });
            });
        }
        catch (error) {
            console.error('Error al crear copia en servidor:', error);
            throw new error_middleware_1.AppError('Error al crear copia de seguridad', 500);
        }
    },
    // Descargar un archivo de respaldo específico por nombre
    downloadBackupFile: async (req, res) => {
        try {
            const { filename } = req.params;
            // Sanitizar filename para evitar directory traversal
            const safeFilename = path_1.default.basename(filename);
            const filePath = path_1.default.join('/backups', safeFilename);
            if (!fs_1.default.existsSync(filePath)) {
                throw new error_middleware_1.AppError('El archivo de respaldo solicitado no existe', 404);
            }
            res.download(filePath, safeFilename);
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al descargar archivo de respaldo', 500);
        }
    },
    // Eliminar un archivo de respaldo del servidor
    deleteDatabaseBackup: async (req, res) => {
        try {
            const { filename } = req.params;
            const safeFilename = path_1.default.basename(filename);
            const filePath = path_1.default.join('/backups', safeFilename);
            if (!fs_1.default.existsSync(filePath)) {
                throw new error_middleware_1.AppError('Archivo no encontrado', 404);
            }
            fs_1.default.unlinkSync(filePath);
            res.json({ success: true, message: 'Copia de seguridad eliminada del servidor' });
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al eliminar copia de seguridad', 500);
        }
    },
    // Estadísticas rápidas de la BD para el panel administrativo
    getDatabaseStats: async (_req, res) => {
        try {
            const sizeRes = await db_1.default.query(`SELECT pg_size_pretty(pg_database_size(current_database())) as total_size`);
            const tablesRes = await db_1.default.query(`
        SELECT count(*) as total_tables 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
            const usersCount = await db_1.default.query(`SELECT count(*) as total FROM usuario`);
            const empCount = await db_1.default.query(`SELECT count(*) as total FROM empleado`);
            const prodCount = await db_1.default.query(`SELECT count(*) as total FROM producto`);
            res.json({
                success: true,
                data: {
                    database_name: process.env.DB_NAME || 'pointofsale',
                    total_size: sizeRes.rows[0]?.total_size || '0 MB',
                    total_tables: parseInt(tablesRes.rows[0]?.total_tables || '0'),
                    total_usuarios: parseInt(usersCount.rows[0]?.total || '0'),
                    total_empleados: parseInt(empCount.rows[0]?.total || '0'),
                    total_productos: parseInt(prodCount.rows[0]?.total || '0'),
                    fecha_servidor: new Date().toISOString()
                }
            });
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener estadísticas de la base de datos', 500);
        }
    }
};
