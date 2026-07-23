"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token no proporcionado' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        // Verificar si es una sesión de empleado puro (cédula)
        if (decoded.empleado_id) {
            const empleadoRes = await db_1.default.query(`SELECT e.*, d.departamento_nombre, cc.centro_costos_nombre, cc.centro_costos_codigo
         FROM empleado e 
         LEFT JOIN departamento d ON e.departamento_id = d.departamento_id
         LEFT JOIN centro_costos cc ON e.centro_costos_id = cc.centro_costos_id
         WHERE e.empleado_id = $1 AND e.empleado_estado = 'activo'`, [decoded.empleado_id]);
            const empleado = empleadoRes.rows[0];
            if (!empleado) {
                return res.status(401).json({ message: 'Empleado no encontrado o inactivo' });
            }
            // Crear usuario virtual para cumplir con req.user
            req.user = {
                id: 0, // ID virtual
                nombre: `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
                email: empleado.empleado_email || '',
                password_hash: '',
                rol_id: 3, // Rol empleado
                activo: true,
                fecha_creacion: empleado.empleado_fecha_creacion,
            };
            req.empleado = empleado;
            return next();
        }
        // Sesión de usuario administrativo normal (email / password)
        const userRes = await db_1.default.query('SELECT * FROM usuario WHERE usuario_id = $1 AND usuario_estado = \'activo\'', [decoded.id]);
        const user = userRes.rows[0];
        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
        }
        // Mapear base de datos a interfaz IUsuario (id en lugar de usuario_id)
        req.user = {
            id: user.usuario_id,
            nombre: user.usuario_nombre,
            email: user.usuario_email,
            password_hash: user.usuario_password,
            rol_id: decoded.rol_id,
            activo: user.usuario_estado === 'activo',
            fecha_creacion: user.usuario_fecha_creacion,
        };
        next();
    }
    catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
};
exports.authenticate = authenticate;
