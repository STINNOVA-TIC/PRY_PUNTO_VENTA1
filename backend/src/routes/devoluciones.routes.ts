// backend/src/routes/devoluciones.routes.ts
import { Router } from 'express';
import { devolucionesController } from '../controllers/devoluciones.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permisos.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requirePermission('entregas.ver_pendientes'), devolucionesController.solicitar);
router.get('/', requirePermission('reportes.ver'), devolucionesController.getAll);
router.patch('/:id/aprobar', requirePermission('nomina.configurar_descuentos'), devolucionesController.aprobar);
router.patch('/:id/rechazar', requirePermission('nomina.configurar_descuentos'), devolucionesController.rechazar);

export default router;
