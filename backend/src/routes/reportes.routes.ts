import { Router } from 'express';
import { reportesController } from '../controllers/reportes.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permisos.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/consumo-empleados',
  requirePermission('reportes.ver_consumo_empleados'),
  reportesController.getConsumoEmpleados
);

router.get(
  '/transacciones',
  requirePermission('reportes.ver_consumo_empleados'),
  reportesController.getTransaccionesDetalladas
);

export default router;