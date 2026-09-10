"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usuariosController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../config/db"));
const error_middleware_1 = require("../middleware/error.middleware");
exports.usuariosController = {
    // Obtener todos los operadores del sistema
    getAll: async (_req, res) => {
        try {
            const query = `
        SELECT u.usuario_id, u.usuario_nombre, u.usuario_email, u.usuario_estado, 
               u.empleado_id, e.empleado_nombre, e.empleado_apellido,
               COALESCE(
                 json_agg(
                   json_build_object('id', r.rol_id, 'nombre', r.rol_nombre)
                 ) FILTER (WHERE r.rol_id IS NOT NULL), '[]'
               ) as roles
        FROM usuario u
        LEFT JOIN empleado e ON u.empleado_id = e.empleado_id
        LEFT JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
        LEFT JOIN rol r ON ur.rol_id = r.rol_id
        GROUP BY u.usuario_id, u.usuario_nombre, u.usuario_email, u.usuario_estado, 
                 u.empleado_id, e.empleado_nombre, e.empleado_apellido
        ORDER BY u.usuario_nombre ASC
      `;
            const resUsers = await db_1.default.query(query);
            const data = resUsers.rows.map(row => {
                const rolesList = row.roles || [];
                const principalRol = rolesList.length > 0 ? rolesList[0] : null;
                return {
                    id: row.usuario_id,
                    nombre: row.usuario_nombre,
                    email: row.usuario_email,
                    activo: row.usuario_estado === 'activo',
                    empleado: row.empleado_id ? {
                        id: row.empleado_id,
                        nombre: `${row.empleado_nombre} ${row.empleado_apellido}`
                    } : null,
                    rol: principalRol,
                    roles: rolesList
                };
            });
            res.json({
                success: true,
                data
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener operadores', 500);
        }
    },
    // Obtener roles activos
    getRoles: async (_req, res) => {
        try {
            const resRoles = await db_1.default.query("SELECT rol_id as id, rol_nombre as nombre, rol_descripcion as descripcion FROM rol WHERE rol_estado = 'activo' ORDER BY rol_id ASC");
            res.json({
                success: true,
                data: resRoles.rows
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener roles', 500);
        }
    },
    // Crear un operador
    create: async (req, res) => {
        const client = await db_1.default.connect();
        try {
            const { nombre, email, password, rol_id, empleado_id, activo } = req.body;
            if (!nombre || !email || !password || !rol_id || !empleado_id) {
                throw new error_middleware_1.AppError('Los campos nombre, email, contraseña, rol y colaborador son requeridos', 400);
            }
            // Validar duplicados
            const dupRes = await client.query('SELECT usuario_id FROM usuario WHERE usuario_email = $1', [email.trim().toLowerCase()]);
            if (dupRes.rows.length > 0) {
                throw new error_middleware_1.AppError('Ya existe un usuario con este correo electrónico', 400);
            }
            const empleadoRes = await client.query(`SELECT e.empleado_id,
                EXISTS (SELECT 1 FROM usuario u WHERE u.empleado_id = e.empleado_id) AS ya_vinculado
         FROM empleado e WHERE e.empleado_id = $1 AND e.empleado_estado = 'activo'`, [empleado_id]);
            if (empleadoRes.rows.length === 0) {
                throw new error_middleware_1.AppError('El colaborador seleccionado no existe o está inactivo', 400);
            }
            if (empleadoRes.rows[0].ya_vinculado) {
                throw new error_middleware_1.AppError('El colaborador seleccionado ya está vinculado a otro usuario', 400);
            }
            await client.query('BEGIN');
            // Hash de la clave
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const userRes = await client.query(`INSERT INTO usuario (empleado_id, usuario_nombre, usuario_email, usuario_password, usuario_estado)
         VALUES ($1, $2, $3, $4, $5) RETURNING usuario_id`, [
                empleado_id,
                nombre.trim(),
                email.trim().toLowerCase(),
                hashedPassword,
                activo !== false ? 'activo' : 'inactivo'
            ]);
            const userId = userRes.rows[0].usuario_id;
            // Vincular rol
            await client.query(`INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, $2)`, [userId, rol_id]);
            await client.query('COMMIT');
            res.status(201).json({
                success: true,
                data: { id: userId },
                message: 'Usuario operador creado exitosamente'
            });
            return;
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al crear usuario operador', 500);
        }
        finally {
            client.release();
        }
    },
    // Editar un operador
    update: async (req, res) => {
        const client = await db_1.default.connect();
        try {
            const id = parseInt(req.params.id);
            const { nombre, email, password, rol_id, empleado_id, activo } = req.body;
            if (!nombre || !email || !rol_id || !empleado_id) {
                throw new error_middleware_1.AppError('Los campos nombre, email, rol y colaborador son requeridos', 400);
            }
            // Validar correo duplicado
            const dupRes = await client.query('SELECT usuario_id FROM usuario WHERE usuario_email = $1 AND usuario_id <> $2', [email.trim().toLowerCase(), id]);
            if (dupRes.rows.length > 0) {
                throw new error_middleware_1.AppError('Ya existe otro usuario con este correo electrónico', 400);
            }
            const empleadoRes = await client.query(`SELECT e.empleado_id,
                EXISTS (
                  SELECT 1 FROM usuario u
                  WHERE u.empleado_id = e.empleado_id AND u.usuario_id <> $2
                ) AS ya_vinculado
         FROM empleado e WHERE e.empleado_id = $1 AND e.empleado_estado = 'activo'`, [empleado_id, id]);
            if (empleadoRes.rows.length === 0) {
                throw new error_middleware_1.AppError('El colaborador seleccionado no existe o está inactivo', 400);
            }
            if (empleadoRes.rows[0].ya_vinculado) {
                throw new error_middleware_1.AppError('El colaborador seleccionado ya está vinculado a otro usuario', 400);
            }
            await client.query('BEGIN');
            // Si actualizó contraseña, hacer hash. Si no, dejar la actual
            let updateQuery = '';
            let queryParams = [];
            if (password) {
                const hashedPassword = await bcryptjs_1.default.hash(password, 10);
                updateQuery = `
          UPDATE usuario 
          SET empleado_id = $1, usuario_nombre = $2, usuario_email = $3, usuario_password = $4, usuario_estado = $5, usuario_fecha_modificacion = CURRENT_TIMESTAMP
          WHERE usuario_id = $6
          RETURNING *
        `;
                queryParams = [empleado_id, nombre.trim(), email.trim().toLowerCase(), hashedPassword, activo ? 'activo' : 'inactivo', id];
            }
            else {
                updateQuery = `
          UPDATE usuario 
          SET empleado_id = $1, usuario_nombre = $2, usuario_email = $3, usuario_estado = $4, usuario_fecha_modificacion = CURRENT_TIMESTAMP
          WHERE usuario_id = $5
          RETURNING *
        `;
                queryParams = [empleado_id, nombre.trim(), email.trim().toLowerCase(), activo ? 'activo' : 'inactivo', id];
            }
            const userRes = await client.query(updateQuery, queryParams);
            if (userRes.rows.length === 0) {
                throw new error_middleware_1.AppError('Usuario no encontrado', 404);
            }
            // Actualizar rol
            await client.query('DELETE FROM usuario_rol WHERE usuario_id = $1', [id]);
            await client.query('INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, $2)', [id, rol_id]);
            await client.query('COMMIT');
            res.json({
                success: true,
                message: 'Usuario operador actualizado correctamente'
            });
            return;
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al actualizar operador', 500);
        }
        finally {
            client.release();
        }
    },
    // Eliminar un operador
    delete: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const userRes = await db_1.default.query('SELECT * FROM usuario WHERE usuario_id = $1', [id]);
            if (userRes.rows.length === 0) {
                throw new error_middleware_1.AppError('Usuario no encontrado', 404);
            }
            // Evitar que el admin se borre a sí mismo
            if (req.user?.id === id) {
                throw new error_middleware_1.AppError('No puedes eliminar tu propio usuario operador', 400);
            }
            try {
                await db_1.default.query('DELETE FROM usuario WHERE usuario_id = $1', [id]);
                res.json({
                    success: true,
                    message: 'Operador eliminado físicamente de la base de datos'
                });
            }
            catch (err) {
                // Si hay dependencias (ventas registradas con su usuario_id), desactivarlo
                await db_1.default.query("UPDATE usuario SET usuario_estado = 'inactivo', usuario_fecha_desactivacion = CURRENT_TIMESTAMP WHERE usuario_id = $1", [id]);
                res.json({
                    success: true,
                    message: 'Operador inactivado debido a que tiene transacciones asociadas'
                });
            }
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al eliminar operador', 500);
        }
    },
    // Obtener permisos completos (base de roles + personalizados) de un usuario
    getUserPermissions: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            // 1. Obtener todos los permisos del sistema organizados por módulo
            const allPermsRes = await db_1.default.query(`
        SELECT p.permiso_id, p.permiso_clave, p.permiso_nombre, p.permiso_descripcion,
               m.modulo_id, m.modulo_nombre
        FROM permiso p
        JOIN modulo m ON p.modulo_id = m.modulo_id
        WHERE p.permiso_estado = 'activo'
        ORDER BY m.modulo_id ASC, p.permiso_nombre ASC
      `);
            // 2. Obtener permisos que el usuario hereda de sus roles
            const rolePermsRes = await db_1.default.query(`
        SELECT DISTINCT p.permiso_id, p.permiso_clave
        FROM usuario_rol ur
        JOIN rol_permiso rp ON ur.rol_id = rp.rol_id
        JOIN permiso p ON rp.permiso_id = p.permiso_id
        WHERE ur.usuario_id = $1 AND p.permiso_estado = 'activo'
      `, [id]);
            const rolePermIds = new Set(rolePermsRes.rows.map(r => r.permiso_id));
            // 3. Obtener personalizaciones directas en usuario_permiso
            const customPermsRes = await db_1.default.query(`
        SELECT permiso_id, tipo
        FROM usuario_permiso
        WHERE usuario_id = $1
      `, [id]);
            const customConcedidos = new Set();
            const customDenegados = new Set();
            for (const row of customPermsRes.rows) {
                if (row.tipo === 'conceder')
                    customConcedidos.add(row.permiso_id);
                if (row.tipo === 'denegar')
                    customDenegados.add(row.permiso_id);
            }
            // 4. Mapear cada permiso con su estado final
            const permisosConEstado = allPermsRes.rows.map(p => {
                const porRol = rolePermsIdsContains(rolePermIds, p.permiso_id);
                const estaConcedido = customConcedidos.has(p.permiso_id);
                const estaDenegado = customDenegados.has(p.permiso_id);
                let activo = false;
                if (estaDenegado) {
                    activo = false;
                }
                else if (estaConcedido || porRol) {
                    activo = true;
                }
                return {
                    id: p.permiso_id,
                    clave: p.permiso_clave,
                    nombre: p.permiso_nombre,
                    descripcion: p.permiso_descripcion,
                    modulo_id: p.modulo_id,
                    modulo_nombre: p.modulo_nombre,
                    heredado_rol: porRol,
                    personalizado: estaConcedido ? 'conceder' : estaDenegado ? 'denegar' : null,
                    activo
                };
            });
            res.json({
                success: true,
                data: permisosConEstado
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al consultar permisos del operador', 500);
        }
    },
    // Guardar personalizaciones de permisos para un usuario
    saveUserPermissions: async (req, res) => {
        const client = await db_1.default.connect();
        try {
            const id = parseInt(req.params.id);
            const { cambios } = req.body; // Array de { permiso_id: number, activo: boolean }
            if (!Array.isArray(cambios)) {
                throw new error_middleware_1.AppError('Formato de datos inválido para permisos', 400);
            }
            // Permisos que vienen por rol
            const rolePermsRes = await client.query(`
        SELECT DISTINCT p.permiso_id
        FROM usuario_rol ur
        JOIN rol_permiso rp ON ur.rol_id = rp.rol_id
        JOIN permiso p ON rp.permiso_id = p.permiso_id
        WHERE ur.usuario_id = $1 AND p.permiso_estado = 'activo'
      `, [id]);
            const rolePermIds = new Set(rolePermsRes.rows.map(r => r.permiso_id));
            await client.query('BEGIN');
            // Limpiar excepciones previas
            await client.query('DELETE FROM usuario_permiso WHERE usuario_id = $1', [id]);
            // Insertar solo las excepciones respecto a su rol
            for (const item of cambios) {
                const heredaPorRol = rolePermIds.has(item.permiso_id);
                if (item.activo && !heredaPorRol) {
                    // No lo tenía en el rol, pero se lo concedemos de forma personalizada
                    await client.query(`INSERT INTO usuario_permiso (usuario_id, permiso_id, tipo) VALUES ($1, $2, 'conceder')`, [id, item.permiso_id]);
                }
                else if (!item.activo && heredaPorRol) {
                    // Lo tenía en el rol, pero se lo denegamos específicamente
                    await client.query(`INSERT INTO usuario_permiso (usuario_id, permiso_id, tipo) VALUES ($1, $2, 'denegar')`, [id, item.permiso_id]);
                }
            }
            await client.query('COMMIT');
            res.json({
                success: true,
                message: 'Permisos del usuario actualizados correctamente'
            });
            return;
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al guardar permisos personalizados', 500);
        }
        finally {
            client.release();
        }
    }
};
function rolePermsIdsContains(set, id) {
    return set.has(id);
}
