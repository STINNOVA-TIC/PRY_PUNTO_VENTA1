"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/auth.routes.ts
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permisos_middleware_1 = require("../middleware/permisos.middleware");
const express_rate_limit_1 = require("express-rate-limit");
const router = (0, express_1.Router)();
// Rate limiting para rutas sensibles
const loginLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 1000, // 15 segundos
    max: 5, // 5 intentos por IP
    message: {
        success: false,
        message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 segundos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const registerLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // 3 registros por IP
    message: {
        success: false,
        message: 'Demasiados intentos de registro. Intente nuevamente en 1 hora.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// ============================================
// RUTAS PÚBLICAS
// ============================================
/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', loginLimiter, auth_controller_1.authController.login);
router.post('/employee-login', auth_controller_1.authController.employeeLogin);
/**
 * POST /api/auth/register
 * Registrar nuevo usuario (solo admin)
 */
router.post('/register', auth_middleware_1.authenticate, (0, permisos_middleware_1.requirePermission)('usuarios.crear'), registerLimiter, auth_controller_1.authController.register);
/**
 * POST /api/auth/forgot-password
 * Solicitar recuperación de contraseña
 */
router.post('/forgot-password', auth_controller_1.authController.forgotPassword);
/**
 * POST /api/auth/reset-password
 * Restablecer contraseña con token
 */
router.post('/reset-password', auth_controller_1.authController.resetPassword);
/**
 * POST /api/auth/verify-token
 * Verificar token JWT
 */
router.post('/verify-token', auth_controller_1.authController.verifyToken);
// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.authController.logout);
/**
 * GET /api/auth/me
 * Obtener usuario actual
 */
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.authController.getMe);
/**
 * PUT /api/auth/change-password
 * Cambiar contraseña
 */
router.put('/change-password', auth_middleware_1.authenticate, auth_controller_1.authController.changePassword);
/**
 * GET /api/auth/users
 * Listar usuarios (solo admin)
 */
router.get('/users', auth_middleware_1.authenticate, (0, permisos_middleware_1.requirePermission)('usuarios.ver'), auth_controller_1.authController.getUsers);
/**
 * PATCH /api/auth/users/:id/toggle
 * Activar/Desactivar usuario (solo admin)
 */
router.patch('/users/:id/toggle', auth_middleware_1.authenticate, (0, permisos_middleware_1.requirePermission)('usuarios.activar'), auth_controller_1.authController.toggleUserStatus);
exports.default = router;
