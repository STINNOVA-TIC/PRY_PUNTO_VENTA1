// backend/src/routes/empleados.routes.ts
import { Router } from 'express';
import { empleadosController } from '../controllers/empleados.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission, requireSelfOrPermission } from '../middleware/permisos.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/empleados - Ver todos los empleados
router.get(
  '/',
  requirePermission('empleados.ver'),
  empleadosController.getAll
);

// GET /api/empleados/departamentos
router.get(
  '/departamentos',
  empleadosController.getDepartamentos
);

// GET /api/empleados/centros-costos
router.get(
  '/centros-costos',
  empleadosController.getCentrosCostos
);

// GET /api/empleados/:id - Ver un empleado específico
router.get(
  '/:id',
  requireSelfOrPermission('empleados.ver_datos_sensibles'),
  empleadosController.getById
);

// GET /api/empleados/:id/historial - Ver historial de compras
// Permite: empleados.ver_historial_compras O ser el mismo empleado
router.get(
  '/:id/historial',
  requireSelfOrPermission('empleados.ver_historial_compras'),
  empleadosController.getHistorialCompras
);

// POST /api/empleados - Crear empleado
// Requiere: empleados.crear
router.post(
  '/',
  requirePermission('empleados.crear'),
  empleadosController.create
);

// PUT /api/empleados/:id - Editar empleado
// Requiere: empleados.editar
router.put(
  '/:id',
  requirePermission('empleados.editar'),
  empleadosController.update
);

// PUT /api/empleados/:id/firma - Editar la firma de un empleado (el mismo empleado o alguien con permiso)
router.put(
  '/:id/firma',
  requireSelfOrPermission('empleados.editar'),
  empleadosController.updateSignature
);

// DELETE /api/empleados/:id - Eliminar empleado
// Requiere: empleados.eliminar
router.delete(
  '/:id',
  requirePermission('empleados.eliminar'),
  empleadosController.delete
);

export default router;