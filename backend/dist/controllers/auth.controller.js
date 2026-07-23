"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../config/db"));
const error_middleware_1 = require("../middleware/error.middleware");
const permisos_1 = require("../types/permisos");
const roles_data_1 = require("../models/roles.data");
const validators_1 = require("../utils/validators");
exports.authController = {
    /**
     * Iniciar sesión de empleado por Cédula (Sin Contraseña)
     * POST /api/auth/employee-login
     */
    employeeLogin: async (req, res) => {
        try {
            const { cedula } = req.body;
            if (!cedula) {
                throw new error_middleware_1.AppError('Número de cédula es requerido', 400);
            }
            if (!(0, validators_1.isValidCedulaEcuatoriana)(cedula)) {
                throw new error_middleware_1.AppError('El número de cédula ingresado no es válido para Ecuador', 400);
            }
            // Buscar empleado por cédula en PostgreSQL
            const empRes = await db_1.default.query(`SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre, cc.centro_costos_codigo
         FROM empleado e
         LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
         LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
         WHERE e.empleado_cedula = $1 AND e.empleado_estado = 'activo'`, [cedula.trim()]);
            const empleado = empRes.rows[0];
            if (!empleado) {
                throw new error_middleware_1.AppError('Cédula no registrada o empleado inactivo', 401);
            }
            // Generar Token JWT con rol_id = 3 (empleado) y el ID del empleado
            const token = jsonwebtoken_1.default.sign({
                id: 0,
                empleado_id: empleado.empleado_id,
                rol_id: 3
            }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
            res.json({
                success: true,
                data: {
                    token,
                    usuario: {
                        id: 0,
                        nombre: `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
                        email: empleado.empleado_email || '',
                        rol: {
                            id: 3,
                            nombre: 'empleado',
                            permisos: permisos_1.GruposPermisos.EMPLEADO
                        },
                        empleado: {
                            id: empleado.empleado_id,
                            codigo_empleado: empleado.empleado_cedula,
                            nombre: empleado.empleado_nombre,
                            apellido: empleado.empleado_apellido,
                            cargo: empleado.empleado_cargo,
                            foto_perfil: empleado.empleado_foto,
                            departamento: empleado.departamento_nombre || 'General',
                            centro_costos: empleado.centro_costos_nombre ? `${empleado.centro_costos_codigo} - ${empleado.centro_costos_nombre}` : 'N/A'
                        }
                    }
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al iniciar sesión por cédula', 500);
        }
    },
    /**
     * Iniciar sesión administrativa/bodega normal (correo/contraseña)
     * POST /api/auth/login
     */
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                throw new error_middleware_1.AppError('Email y contraseña son requeridos', 400);
            }
            if (!(0, validators_1.isValidEmail)(email)) {
                throw new error_middleware_1.AppError('Formato de correo electrónico inválido', 400);
            }
            if (!(0, validators_1.isValidPassword)(password)) {
                throw new error_middleware_1.AppError('La contraseña debe tener al menos 6 caracteres', 400);
            }
            // Buscar usuario en PostgreSQL
            const userRes = await db_1.default.query("SELECT * FROM usuario WHERE usuario_email = $1 AND usuario_estado = 'activo'", [email.trim()]);
            const user = userRes.rows[0];
            if (!user) {
                throw new error_middleware_1.AppError('Credenciales incorrectas', 401);
            }
            // Verificar contraseña
            const isMatch = await bcryptjs_1.default.compare(password, user.usuario_password);
            if (!isMatch) {
                throw new error_middleware_1.AppError('Credenciales incorrectas', 401);
            }
            // Obtener rol del usuario
            const rolRes = await db_1.default.query(`SELECT r.* FROM rol r
         JOIN usuario_rol ur ON r.rol_id = ur.rol_id
         WHERE ur.usuario_id = $1`, [user.usuario_id]);
            const rol = rolRes.rows[0];
            if (!rol) {
                throw new error_middleware_1.AppError('Rol de usuario no encontrado', 500);
            }
            // Mapear permisos según rol dinámicamente desde static rolesData
            const staticRole = roles_data_1.rolesData.find(r => r.id === rol.rol_id);
            const rolNombre = staticRole?.nombre || 'empleado';
            const permisos = staticRole?.permisos || permisos_1.GruposPermisos.EMPLEADO;
            // Obtener datos del empleado asociado si existe
            let empleado = null;
            if (user.empleado_id) {
                const empRes = await db_1.default.query(`SELECT e.*, d.departamento_nombre 
           FROM empleado e 
           LEFT JOIN departamento d ON e.departamento_id = d.departamento_id 
           WHERE e.empleado_id = $1`, [user.empleado_id]);
                const emp = empRes.rows[0];
                if (emp) {
                    empleado = {
                        id: emp.empleado_id,
                        codigo_empleado: emp.empleado_cedula,
                        nombre: emp.empleado_nombre,
                        apellido: emp.empleado_apellido,
                        cargo: emp.empleado_cargo,
                        foto_perfil: emp.empleado_foto,
                        departamento: emp.departamento_nombre || 'Sin Departamento'
                    };
                }
            }
            // Generar Token JWT
            const token = jsonwebtoken_1.default.sign({
                id: user.usuario_id,
                rol_id: rol.rol_id
            }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
            res.json({
                success: true,
                data: {
                    token,
                    usuario: {
                        id: user.usuario_id,
                        nombre: user.usuario_nombre,
                        email: user.usuario_email,
                        rol: {
                            id: rol.rol_id,
                            nombre: rolNombre,
                            permisos
                        },
                        empleado
                    }
                }
            });
            return;
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al iniciar sesión', 500);
        }
    },
    /**
     * Obtener perfil del usuario autenticado
     * GET /api/auth/me
     */
    getMe: async (req, res) => {
        try {
            if (!req.user) {
                throw new error_middleware_1.AppError('Usuario no autenticado', 401);
            }
            const staticRole = roles_data_1.rolesData.find(r => r.id === req.user.rol_id);
            const rolNombre = staticRole?.nombre || 'empleado';
            const permisos = staticRole?.permisos || permisos_1.GruposPermisos.EMPLEADO;
            let empleado = null;
            if (req.empleado) {
                empleado = {
                    id: req.empleado.empleado_id,
                    codigo_empleado: req.empleado.empleado_cedula,
                    nombre: req.empleado.empleado_nombre,
                    apellido: req.empleado.empleado_apellido,
                    departamento: req.empleado.departamento_nombre || 'Sin Departamento',
                    centro_costos: req.empleado.centro_costos_nombre ? `${req.empleado.centro_costos_codigo} - ${req.empleado.centro_costos_nombre}` : 'N/A',
                    cargo: req.empleado.empleado_cargo,
                    foto_perfil: req.empleado.empleado_foto
                };
            }
            else if (req.user.id !== 0) {
                // Si es usuario admin/operator, verificar si tiene empleado_id
                const userRes = await db_1.default.query('SELECT empleado_id FROM usuario WHERE usuario_id = $1', [req.user.id]);
                const empId = userRes.rows[0]?.empleado_id;
                if (empId) {
                    const empRes = await db_1.default.query(`SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre, cc.centro_costos_codigo 
             FROM empleado e 
             LEFT JOIN departamento d ON e.departamento_id = d.departamento_id 
             LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
             WHERE e.empleado_id = $1`, [empId]);
                    const emp = empRes.rows[0];
                    if (emp) {
                        empleado = {
                            id: emp.empleado_id,
                            codigo_empleado: emp.empleado_cedula,
                            nombre: emp.empleado_nombre,
                            apellido: emp.empleado_apellido,
                            cargo: emp.empleado_cargo,
                            foto_perfil: emp.empleado_foto,
                            departamento: emp.departamento_nombre || 'Sin Departamento',
                            centro_costos: emp.centro_costos_nombre ? `${emp.centro_costos_codigo} - ${emp.centro_costos_nombre}` : 'N/A'
                        };
                    }
                }
            }
            res.json({
                success: true,
                data: {
                    id: req.user.id,
                    nombre: req.user.nombre,
                    email: req.user.email,
                    rol: {
                        id: req.user.rol_id,
                        nombre: rolNombre,
                        permisos
                    },
                    empleado
                }
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener perfil', 500);
        }
    },
    /**
     * Verificar validez del Token
     * POST /api/auth/verify-token
     */
    verifyToken: async (req, res) => {
        try {
            const { token } = req.body;
            if (!token) {
                throw new error_middleware_1.AppError('Token requerido', 400);
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
            if (decoded.empleado_id) {
                const empRes = await db_1.default.query(`SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre, cc.centro_costos_codigo
           FROM empleado e 
           LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
           LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
           WHERE e.empleado_id = $1 AND e.empleado_estado = 'activo'`, [decoded.empleado_id]);
                if (empRes.rows.length === 0) {
                    throw new error_middleware_1.AppError('Empleado inactivo', 401);
                }
                const empleado = empRes.rows[0];
                res.json({
                    success: true,
                    data: {
                        valid: true,
                        user: {
                            id: 0,
                            nombre: `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
                            email: empleado.empleado_email || '',
                            rol: {
                                id: 3,
                                nombre: 'empleado',
                                permisos: permisos_1.GruposPermisos.EMPLEADO
                            },
                            empleado: {
                                id: empleado.empleado_id,
                                codigo_empleado: empleado.empleado_cedula,
                                nombre: empleado.empleado_nombre,
                                apellido: empleado.empleado_apellido,
                                cargo: empleado.empleado_cargo,
                                foto_perfil: empleado.empleado_foto,
                                departamento: empleado.departamento_nombre || 'General',
                                centro_costos: empleado.centro_costos_nombre ? `${empleado.centro_costos_codigo} - ${empleado.centro_costos_nombre}` : 'N/A'
                            }
                        }
                    }
                });
                return;
            }
            const userRes = await db_1.default.query('SELECT * FROM usuario WHERE usuario_id = $1 AND usuario_estado = \'activo\'', [decoded.id]);
            if (userRes.rows.length === 0) {
                throw new error_middleware_1.AppError('Usuario inactivo', 401);
            }
            const user = userRes.rows[0];
            const staticRole = roles_data_1.rolesData.find(r => r.id === decoded.rol_id);
            const rolNombre = staticRole?.nombre || 'empleado';
            const permisos = staticRole?.permisos || permisos_1.GruposPermisos.EMPLEADO;
            res.json({
                success: true,
                data: {
                    valid: true,
                    user: {
                        id: user.usuario_id,
                        nombre: user.usuario_nombre,
                        email: user.usuario_email,
                        rol: {
                            id: decoded.rol_id,
                            nombre: rolNombre,
                            permisos
                        }
                    }
                }
            });
            return;
        }
        catch (error) {
            throw new error_middleware_1.AppError('Token inválido', 401);
        }
    },
    register: async (req, res) => {
        try {
            const { nombre, email, password, empleado_id, rol_id } = req.body;
            if (!nombre || !email || !password || !rol_id) {
                throw new error_middleware_1.AppError('Datos incompletos para el registro', 400);
            }
            const salt = await bcryptjs_1.default.genSalt(10);
            const hashedPassword = await bcryptjs_1.default.hash(password, salt);
            const userRes = await db_1.default.query(`INSERT INTO usuario (usuario_nombre, usuario_email, usuario_password, empleado_id, usuario_estado) 
         VALUES ($1, $2, $3, $4, 'activo') RETURNING usuario_id`, [nombre, email, hashedPassword, empleado_id || null]);
            const userId = userRes.rows[0].usuario_id;
            await db_1.default.query(`INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, $2)`, [userId, rol_id]);
            res.status(201).json({ success: true, message: 'Usuario registrado exitosamente' });
        }
        catch (error) {
            if (error.code === '23505') {
                throw new error_middleware_1.AppError('El email ya está registrado', 400);
            }
            throw new error_middleware_1.AppError('Error al registrar usuario', 500);
        }
    },
    forgotPassword: async (_req, res) => {
        res.json({ success: true, message: 'Se ha enviado un enlace de recuperación a su correo electrónico.' });
    },
    resetPassword: async (_req, res) => {
        res.json({ success: true, message: 'Su contraseña ha sido restablecida exitosamente.' });
    },
    logout: async (_req, res) => {
        res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
    },
    changePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            if (!req.user)
                throw new error_middleware_1.AppError('No autenticado', 401);
            const userRes = await db_1.default.query('SELECT * FROM usuario WHERE usuario_id = $1', [req.user.id]);
            const user = userRes.rows[0];
            if (!user)
                throw new error_middleware_1.AppError('Usuario no encontrado', 404);
            const isMatch = await bcryptjs_1.default.compare(currentPassword, user.usuario_password);
            if (!isMatch)
                throw new error_middleware_1.AppError('Contraseña actual incorrecta', 400);
            const salt = await bcryptjs_1.default.genSalt(10);
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, salt);
            await db_1.default.query('UPDATE usuario SET usuario_password = $1 WHERE usuario_id = $2', [hashedPassword, req.user.id]);
            res.json({ success: true, message: 'Contraseña cambiada exitosamente' });
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al cambiar contraseña', 500);
        }
    },
    getUsers: async (_req, res) => {
        try {
            const usersRes = await db_1.default.query(`SELECT u.usuario_id as id, u.usuario_nombre as nombre, u.usuario_email as email, u.usuario_estado as estado,
                r.rol_id, r.rol_nombre as rol_nombre
         FROM usuario u
         LEFT JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
         LEFT JOIN rol r ON ur.rol_id = r.rol_id
         ORDER BY u.usuario_id DESC`);
            res.json({ success: true, data: usersRes.rows });
        }
        catch (error) {
            throw new error_middleware_1.AppError('Error al obtener usuarios', 500);
        }
    },
    toggleUserStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const userRes = await db_1.default.query('SELECT usuario_estado FROM usuario WHERE usuario_id = $1', [id]);
            if (userRes.rows.length === 0)
                throw new error_middleware_1.AppError('Usuario no encontrado', 404);
            const currentStatus = userRes.rows[0].usuario_estado;
            const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
            await db_1.default.query('UPDATE usuario SET usuario_estado = $1 WHERE usuario_id = $2', [newStatus, id]);
            res.json({ success: true, message: `Usuario ${newStatus === 'activo' ? 'activado' : 'desactivado'} exitosamente` });
        }
        catch (error) {
            if (error instanceof error_middleware_1.AppError)
                throw error;
            throw new error_middleware_1.AppError('Error al cambiar estado del usuario', 500);
        }
    }
};
