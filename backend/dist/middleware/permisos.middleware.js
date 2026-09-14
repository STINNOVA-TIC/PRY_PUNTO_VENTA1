"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSelfOrPermission = exports.requireAllPermissions = exports.requireAnyPermission = exports.requirePermission = void 0;
exports.getUsuarioPermisos = getUsuarioPermisos;
const db_1 = __importDefault(require("../config/db"));
// Helper para obtener los permisos efectivos del usuario
async function getUsuarioPermisos(userId, defaultRolId) {
    const rolesList = [];
    if (userId && userId !== 0) {
        const userRolesRes = await db_1.default.query('SELECT rol_id FROM usuario_rol WHERE usuario_id = $1', [userId]);
        rolesList.push(...userRolesRes.rows.map(r => r.rol_id));
    }
    if (rolesList.length === 0 && defaultRolId) {
        rolesList.push(defaultRolId);
    }
    // 1. Obtener nombres de roles
    const rolesRes = await db_1.default.query('SELECT rol_id, rol_nombre FROM rol WHERE rol_id = ANY($1)', [rolesList]);
    const rolesNames = rolesRes.rows.map(r => r.rol_nombre);
    const isAdmin = rolesNames.includes('admin') || rolesList.includes(1);
    // 2. Obtener permisos híbridos reales (DB + personalizados)
    const allPermisos = new Set();
    if (userId && userId !== 0) {
        const { getPermisosForUsuario } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
        const userPerms = await getPermisosForUsuario(userId, defaultRolId || 3);
        userPerms.forEach(p => allPermisos.add(p));
    }
    else {
        const { getPermisosForRol } = await Promise.resolve().then(() => __importStar(require('../controllers/auth.controller')));
        for (const rId of rolesList) {
            const perms = await getPermisosForRol(rId);
            perms.forEach(p => allPermisos.add(p));
        }
    }
    return { permissions: allPermisos, isAdmin, roles: rolesNames.length > 0 ? rolesNames : ['empleado'] };
}
// Las sesiones por cédula nunca heredan roles corporativos de una cuenta vinculada.
// Solo admiten los permisos base del colaborador y las excepciones personales de acceso rápido.
async function getPermisosPeticion(req) {
    if (!req.empleado) {
        return getUsuarioPermisos(req.user?.id || 0, req.user?.rol_id || 3);
    }
    const base = await getUsuarioPermisos(0, 3);
    const allowedQuickPermissions = ['autoconsumo.crear'];
    const customRes = await db_1.default.query(`SELECT p.permiso_clave, up.tipo
     FROM usuario u
     JOIN usuario_permiso up ON up.usuario_id = u.usuario_id
     JOIN permiso p ON p.permiso_id = up.permiso_id
     WHERE u.empleado_id = $1
       AND u.usuario_estado = 'activo'
       AND p.permiso_estado = 'activo'
       AND p.permiso_clave = ANY($2)`, [req.empleado.empleado_id, allowedQuickPermissions]);
    customRes.rows.forEach(({ permiso_clave, tipo }) => {
        if (tipo === 'conceder')
            base.permissions.add(permiso_clave);
        if (tipo === 'denegar')
            base.permissions.delete(permiso_clave);
    });
    return { permissions: base.permissions, isAdmin: false, roles: ['empleado'] };
}
// Verificar si el usuario tiene un permiso específico
const requirePermission = (permiso) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'No autenticado'
                });
                return;
            }
            const { permissions, isAdmin, roles } = await getPermisosPeticion(req);
            if (roles.length === 0) {
                res.status(403).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
                return;
            }
            if (!isAdmin && !permissions.has(permiso)) {
                res.status(403).json({
                    success: false,
                    message: `No tienes permiso para: ${permiso}`,
                    required: permiso,
                    currentRole: roles.join(', ')
                });
                return;
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
};
exports.requirePermission = requirePermission;
// Verificar si el usuario tiene ALGUNO de los permisos
const requireAnyPermission = (...permisos) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'No autenticado'
                });
                return;
            }
            const { permissions, isAdmin, roles } = await getPermisosPeticion(req);
            if (roles.length === 0) {
                res.status(403).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
                return;
            }
            const hasPermission = isAdmin || permisos.some(p => permissions.has(p));
            if (!hasPermission) {
                res.status(403).json({
                    success: false,
                    message: `No tienes ninguno de los permisos requeridos: ${permisos.join(', ')}`,
                    required: permisos,
                    currentRole: roles.join(', ')
                });
                return;
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
};
exports.requireAnyPermission = requireAnyPermission;
// Verificar si el usuario tiene TODOS los permisos
const requireAllPermissions = (...permisos) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'No autenticado'
                });
                return;
            }
            const { permissions, isAdmin, roles } = await getPermisosPeticion(req);
            if (roles.length === 0) {
                res.status(403).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
                return;
            }
            const missingPermissions = isAdmin ? [] : permisos.filter(p => !permissions.has(p));
            if (missingPermissions.length > 0) {
                res.status(403).json({
                    success: false,
                    message: `Faltan permisos: ${missingPermissions.join(', ')}`,
                    missing: missingPermissions,
                    currentRole: roles.join(', ')
                });
                return;
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
};
exports.requireAllPermissions = requireAllPermissions;
// Middleware para verificar que un usuario puede acceder a sus propios datos o a los de otros
const requireSelfOrPermission = (permiso) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'No autenticado'
                });
                return;
            }
            const { permissions, isAdmin, roles } = await getPermisosPeticion(req);
            if (roles.length === 0) {
                res.status(403).json({
                    success: false,
                    message: 'Rol no encontrado'
                });
                return;
            }
            const empleadoObjetivoId = parseInt(req.params.id);
            let empleadoPropioId = req.empleado?.empleado_id;
            // Las rutas de colaboradores reciben un empleado_id, mientras que en una
            // sesión corporativa req.user.id es usuario_id. Resolver el vínculo antes
            // de decidir si la operación se hace sobre el propio perfil.
            if (!empleadoPropioId && req.user.id) {
                const usuarioRes = await db_1.default.query('SELECT empleado_id FROM usuario WHERE usuario_id = $1', [req.user.id]);
                empleadoPropioId = usuarioRes.rows[0]?.empleado_id;
            }
            const isSelf = empleadoPropioId === empleadoObjetivoId;
            const hasPermission = isAdmin || permissions.has(permiso);
            if (!isSelf && !hasPermission) {
                res.status(403).json({
                    success: false,
                    message: 'No tienes permiso para acceder a estos datos',
                    required: permiso
                });
                return;
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
};
exports.requireSelfOrPermission = requireSelfOrPermission;
