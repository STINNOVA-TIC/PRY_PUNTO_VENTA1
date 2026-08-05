"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.empleadosController = void 0;
const db_1 = __importDefault(require("../config/db"));
const error_middleware_1 = require("../middleware/error.middleware");
const validators_1 = require("../utils/validators");
exports.empleadosController = {
    // Obtener todos los empleados
    getAll: async (req, res) => {
        try {
            let query = `
        SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre,
               EXISTS (
                 SELECT 1 FROM usuario u 
                 JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id 
                 WHERE u.empleado_id = e.empleado_id AND ur.rol_id = 8 AND u.usuario_estado = 'activo'
               ) as permitir_autoconsumo
        FROM empleado e
        LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
        LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
      `;
            const params = [];
            // Si es rol empleado, solo puede verse a sí mismo
            if (req.user?.rol_id === 3) {
                let empId = req.empleado?.empleado_id;
                if (!empId) {
                    const userRes = await db_1.default.query('SELECT empleado_id FROM usuario WHERE usuario_id = $1', [req.user.id]);
                    empId = userRes.rows[0]?.empleado_id;
                }
                query += ' WHERE e.empleado_id = $1';
                params.push(empId || 0);
            }
            query += ' ORDER BY e.empleado_nombre ASC, e.empleado_apellido ASC';
            const employeesRes = await db_1.default.query(query, params);
            // Mapear los datos de los empleados
            const employees = employeesRes.rows.map(row => ({
                id: row.empleado_id,
                codigo_empleado: row.empleado_cedula,
                nombre: row.empleado_nombre,
                apellido: row.empleado_apellido,
                departamento_id: row.departamento_id,
                departamento: row.departamento_nombre || 'Sin Departamento',
                centro_costos_id: row.centro_costos_id,
                centro_costos: row.centro_costos_nombre || 'Sin Centro de Costos',
                cargo: row.empleado_cargo || 'Empleado',
                email: row.empleado_email || '',
                foto_perfil: row.empleado_foto || `https://ui-avatars.com/api/?name=${row.empleado_nombre}+${row.empleado_apellido}&size=128`,
                firma: row.empleado_firma || null,
                activo: row.empleado_estado === 'activo',
                permitir_autoconsumo: row.permitir_autoconsumo || false
            }));
            res.json({
                success: true,
                data: employees
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener empleados', 500);
        }
    },
    // Obtener un empleado por ID
    getById: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const empRes = await db_1.default.query(`SELECT e.*, d.departamento_nombre,
                EXISTS (
                  SELECT 1 FROM usuario u 
                  JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id 
                  WHERE u.empleado_id = e.empleado_id AND ur.rol_id = 8 AND u.usuario_estado = 'activo'
                ) as permitir_autoconsumo
         FROM empleado e 
         LEFT JOIN departamento d ON e.departamento_id = d.departamento_id 
         WHERE e.empleado_id = $1`, [id]);
            const empleado = empRes.rows[0];
            if (!empleado) {
                res.status(404).json({
                    success: false,
                    message: 'Empleado no encontrado'
                });
                return;
            }
            res.json({
                success: true,
                data: {
                    id: empleado.empleado_id,
                    codigo_empleado: empleado.empleado_cedula,
                    nombre: empleado.empleado_nombre,
                    apellido: empleado.empleado_apellido,
                    departamento_id: empleado.departamento_id,
                    departamento: empleado.departamento_nombre || 'Sin Departamento',
                    centro_costos_id: empleado.centro_costos_id,
                    cargo: empleado.empleado_cargo || 'Empleado',
                    email: empleado.empleado_email || '',
                    foto_perfil: empleado.empleado_foto || `https://ui-avatars.com/api/?name=${empleado.empleado_nombre}+${empleado.empleado_apellido}&size=128`,
                    firma: empleado.empleado_firma || null,
                    activo: empleado.empleado_estado === 'activo',
                    permitir_autoconsumo: empleado.permitir_autoconsumo || false
                }
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener empleado', 500);
        }
    },
    // Obtener historial de compras de un empleado
    getHistorialCompras: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const empRes = await db_1.default.query('SELECT * FROM empleado WHERE empleado_id = $1', [id]);
            const empleado = empRes.rows[0];
            if (!empleado) {
                res.status(404).json({
                    success: false,
                    message: 'Empleado no encontrado'
                });
                return;
            }
            // Consultar historial real
            const ventasRes = await db_1.default.query(`SELECT venta_id as id, venta_fecha as fecha, venta_total as total, 
                venta_estado as estado
         FROM venta 
         WHERE empleado_id = $1 
         ORDER BY venta_fecha DESC`, [id]);
            res.json({
                success: true,
                data: {
                    empleado: {
                        id: empleado.empleado_id,
                        nombre: `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
                        codigo: empleado.empleado_cedula
                    },
                    historial: ventasRes.rows.map(v => ({
                        id: v.id,
                        fecha: v.fecha,
                        total: parseFloat(v.total),
                        estado: v.estado,
                        metodo: 'nomina'
                    }))
                }
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener historial de compras', 500);
        }
    },
    create: async (req, res) => {
        try {
            const { cedula, nombre, apellido, departamento_id, centro_costos_id, email, cargo, foto_perfil, firma, activo, permitir_autoconsumo } = req.body;
            if (!cedula || !nombre || !apellido) {
                throw new error_middleware_1.AppError('Cédula, nombre y apellido son requeridos', 400);
            }
            if (!(0, validators_1.isValidCedulaEcuatoriana)(cedula)) {
                throw new error_middleware_1.AppError('El número de cédula ingresado no es válido para Ecuador', 400);
            }
            if (email && !(0, validators_1.isValidEmail)(email)) {
                throw new error_middleware_1.AppError('Formato de correo electrónico inválido', 400);
            }
            const dupRes = await db_1.default.query('SELECT empleado_id FROM empleado WHERE empleado_cedula = $1', [cedula.trim()]);
            if (dupRes.rows.length > 0) {
                throw new error_middleware_1.AppError('Ya existe un empleado con esa cédula', 400);
            }
            const insertRes = await db_1.default.query(`INSERT INTO empleado (empleado_cedula, empleado_nombre, empleado_apellido, departamento_id, centro_costos_id, empleado_email, empleado_cargo, empleado_foto, empleado_firma, empleado_estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [
                cedula.trim(),
                nombre.trim(),
                apellido.trim(),
                departamento_id || null,
                centro_costos_id || null,
                email ? email.trim() : null,
                cargo ? cargo.trim() : null,
                foto_perfil || null,
                firma || null,
                activo !== false ? 'activo' : 'inactivo'
            ]);
            const empleado = insertRes.rows[0];
            if (permitir_autoconsumo) {
                const userRes = await db_1.default.query(`INSERT INTO usuario (usuario_nombre, usuario_email, usuario_password, empleado_id, usuario_estado)
           VALUES ($1, $2, $3, $4, 'activo') RETURNING usuario_id`, [
                    `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
                    empleado.empleado_email || `autoconsumo_${empleado.empleado_cedula}@empresa.local`,
                    '$2b$10$Un9uYn.H5.d2fHpxkUexl.ZtZexGvS2P1g2T9Dq0aFvU8ZqBlyR82', // bcrypt hash for 'autoconsumo123'
                    empleado.empleado_id
                ]);
                const userId = userRes.rows[0].usuario_id;
                await db_1.default.query(`INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, 8)`, [userId]);
            }
            res.status(201).json({
                success: true,
                data: empleado,
                message: 'Empleado creado exitosamente'
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al crear empleado en base de datos', 500);
        }
    },
    update: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { cedula, nombre, apellido, departamento_id, centro_costos_id, email, cargo, foto_perfil, firma, activo, permitir_autoconsumo } = req.body;
            if (!cedula || !nombre || !apellido) {
                throw new error_middleware_1.AppError('Cédula, nombre y apellido son requeridos', 400);
            }
            if (!(0, validators_1.isValidCedulaEcuatoriana)(cedula)) {
                throw new error_middleware_1.AppError('El número de cédula ingresado no es válido para Ecuador', 400);
            }
            if (email && !(0, validators_1.isValidEmail)(email)) {
                throw new error_middleware_1.AppError('Formato de correo electrónico inválido', 400);
            }
            const dupRes = await db_1.default.query('SELECT empleado_id FROM empleado WHERE empleado_cedula = $1 AND empleado_id <> $2', [cedula.trim(), id]);
            if (dupRes.rows.length > 0) {
                throw new error_middleware_1.AppError('Ya existe otro empleado con esa cédula', 400);
            }
            const updateRes = await db_1.default.query(`UPDATE empleado 
         SET empleado_cedula = $1, empleado_nombre = $2, empleado_apellido = $3, departamento_id = $4, centro_costos_id = $5, empleado_email = $6, empleado_cargo = $7, empleado_foto = $8, empleado_firma = $9, empleado_estado = $10, empleado_fecha_modificacion = CURRENT_TIMESTAMP
         WHERE empleado_id = $11 RETURNING *`, [
                cedula.trim(),
                nombre.trim(),
                apellido.trim(),
                departamento_id || null,
                centro_costos_id || null,
                email ? email.trim() : null,
                cargo ? cargo.trim() : null,
                foto_perfil || null,
                firma || null,
                activo ? 'activo' : 'inactivo',
                id
            ]);
            if (updateRes.rows.length === 0) {
                throw new error_middleware_1.AppError('Empleado no encontrado', 404);
            }
            const empleado = updateRes.rows[0];
            if (permitir_autoconsumo) {
                // Buscar si existe el usuario para este empleado
                const userCheck = await db_1.default.query('SELECT usuario_id FROM usuario WHERE empleado_id = $1', [id]);
                if (userCheck.rows.length === 0) {
                    // Crear usuario nuevo con rol 8
                    const userRes = await db_1.default.query(`INSERT INTO usuario (usuario_nombre, usuario_email, usuario_password, empleado_id, usuario_estado)
             VALUES ($1, $2, $3, $4, 'activo') RETURNING usuario_id`, [
                        `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
                        empleado.empleado_email || `autoconsumo_${empleado.empleado_cedula}@empresa.local`,
                        '$2b$10$Un9uYn.H5.d2fHpxkUexl.ZtZexGvS2P1g2T9Dq0aFvU8ZqBlyR82', // bcrypt hash for 'autoconsumo123'
                        id
                    ]);
                    const userId = userRes.rows[0].usuario_id;
                    await db_1.default.query(`INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, 8)`, [userId]);
                }
                else {
                    const userId = userCheck.rows[0].usuario_id;
                    // Reactivar usuario si estuviera inactivo
                    await db_1.default.query("UPDATE usuario SET usuario_estado = 'activo' WHERE usuario_id = $1", [userId]);
                    // Quitar para reinsertar o simplemente upsert
                    await db_1.default.query('DELETE FROM usuario_rol WHERE usuario_id = $1 AND rol_id = 8', [userId]);
                    await db_1.default.query('INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, 8)', [userId]);
                }
            }
            else {
                // Si se quita el check, borrar la asociación al rol de autoconsumo
                await db_1.default.query(`DELETE FROM usuario_rol 
           WHERE usuario_id IN (SELECT usuario_id FROM usuario WHERE empleado_id = $1) 
           AND rol_id = 8`, [id]);
            }
            res.json({
                success: true,
                data: empleado,
                message: 'Empleado actualizado exitosamente'
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al actualizar empleado', 500);
        }
    },
    delete: async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            // Verificar si existe el empleado
            const empRes = await db_1.default.query('SELECT * FROM empleado WHERE empleado_id = $1', [id]);
            if (empRes.rows.length === 0) {
                throw new error_middleware_1.AppError('Empleado no encontrado', 404);
            }
            try {
                await db_1.default.query('DELETE FROM empleado WHERE empleado_id = $1', [id]);
                res.json({
                    success: true,
                    message: 'Empleado eliminado físicamente de la base de datos'
                });
            }
            catch (err) {
                // Si hay integridad referencial, desactivarlo
                await db_1.default.query("UPDATE empleado SET empleado_estado = 'inactivo', empleado_fecha_desactivacion = CURRENT_TIMESTAMP WHERE empleado_id = $1", [id]);
                res.json({
                    success: true,
                    message: 'Empleado inactivado debido a que tiene transacciones registradas'
                });
            }
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al eliminar empleado', 500);
        }
    },
    getDepartamentos: async (_req, res) => {
        try {
            const depRes = await db_1.default.query("SELECT departamento_id as id, departamento_nombre as nombre FROM departamento WHERE departamento_estado = 'activo' ORDER BY departamento_nombre ASC");
            res.json({ success: true, data: depRes.rows });
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener departamentos', 500);
        }
    },
    getCentrosCostos: async (_req, res) => {
        try {
            const ccRes = await db_1.default.query("SELECT centro_costos_id as id, centro_costos_nombre as nombre FROM centro_costos WHERE centro_costos_estado = 'activo' ORDER BY centro_costos_nombre ASC");
            res.json({ success: true, data: ccRes.rows });
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener centros de costos', 500);
        }
    }
};
