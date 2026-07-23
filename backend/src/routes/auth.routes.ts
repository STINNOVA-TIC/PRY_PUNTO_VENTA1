// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permisos.middleware';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Rate limiting para rutas sensibles
const loginLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 segundos
  max: 5, // 5 intentos por IP
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 segundos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
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
router.post('/login', loginLimiter, authController.login);
router.post('/employee-login', authController.employeeLogin);

/**
 * POST /api/auth/register
 * Registrar nuevo usuario (solo admin)
 */
router.post(
  '/register',
  authenticate,
  requirePermission('usuarios.crear'),
  registerLimiter,
  authController.register
);

/**
 * POST /api/auth/forgot-password
 * Solicitar recuperación de contraseña
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * POST /api/auth/reset-password
 * Restablecer contraseña con token
 */
router.post('/reset-password', authController.resetPassword);

/**
 * POST /api/auth/verify-token
 * Verificar token JWT
 */
router.post('/verify-token', authController.verifyToken);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================

/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
router.post('/logout', authenticate, authController.logout);

/**
 * GET /api/auth/me
 * Obtener usuario actual
 */
router.get('/me', authenticate, authController.getMe);

/**
 * PUT /api/auth/change-password
 * Cambiar contraseña
 */
router.put('/change-password', authenticate, authController.changePassword);

/**
 * GET /api/auth/users
 * Listar usuarios (solo admin)
 */
router.get(
  '/users',
  authenticate,
  requirePermission('usuarios.ver'),
  authController.getUsers
);

/**
 * PATCH /api/auth/users/:id/toggle
 * Activar/Desactivar usuario (solo admin)
 */
router.patch(
  '/users/:id/toggle',
  authenticate,
  requirePermission('usuarios.activar'),
  authController.toggleUserStatus
);

export default router;