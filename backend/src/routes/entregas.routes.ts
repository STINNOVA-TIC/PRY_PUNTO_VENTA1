// backend/src/routes/entregas.routes.ts
import { Router } from 'express';
import { entregasController } from '../controllers/entregas.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permisos.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/entregas
 * Obtener todas las solicitudes de entrega
 * Permisos: entregas.ver (admin, guardia, inventario)
 * Empleados: solo ven sus propias solicitudes
 */
router.get(
  '/',
  requirePermission('entregas.ver'),
  entregasController.getAll
);

/**
 * GET /api/entregas/pendientes
 * Obtener solicitudes pendientes (para guardia)
 * Permisos: entregas.ver_pendientes
 */
router.get(
  '/pendientes',
  requirePermission('entregas.ver_pendientes'),
  entregasController.getPendientes
);

/**
 * GET /api/entregas/estadisticas
 * Obtener estadísticas de entregas
 * Permisos: reportes.ver
 */
router.get(
  '/estadisticas',
  requirePermission('reportes.ver'),
  entregasController.getEstadisticas
);

/**
 * GET /api/entregas/:id
 * Obtener una solicitud específica
 * Permisos: entregas.ver O ser el empleado propietario
 */
router.get(
  '/:id',
  requirePermission('entregas.ver'),
  entregasController.getById
);

/**
 * POST /api/entregas/confirmar
 * Confirmar entrega de producto
 * Permisos: entregas.confirmar
 */
router.post(
  '/confirmar',
  requirePermission('entregas.confirmar'),
  entregasController.confirmar
);

/**
 * PUT /api/entregas/:id/cancelar
 * Cancelar una solicitud de entrega
 * Permisos: entregas.confirmar
 */
router.put(
  '/:id/cancelar',
  requirePermission('entregas.confirmar'),
  entregasController.cancelar
);

/**
 * POST /api/entregas/:id/incidente
 * Reportar incidente en verificación
 * Permisos: entregas.reportar_incidente
 */
router.post(
  '/:id/incidente',
  requirePermission('entregas.reportar_incidente'),
  entregasController.reportarIncidente
);

router.patch(
  '/:id/no-entregado',
  requirePermission('entregas.confirmar'),
  entregasController.marcarNoEntregado
);

export default router;