// backend/src/routes/ordenes.routes.ts
import { Router } from 'express';
import { ordenesController } from '../controllers/ordenes.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middleware/permisos.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requireAnyPermission('compras.requerimientos.crear', 'requerimientos.firmar'), ordenesController.crear);
router.get('/', requireAnyPermission('compras.ver', 'compras.requerimientos.crear', 'requerimientos.firmar'), ordenesController.getAll);
router.get('/secuencial/siguiente', requireAnyPermission('compras.ver', 'compras.requerimientos.crear', 'requerimientos.firmar'), ordenesController.getSiguienteSecuencial);
router.get('/:id', requireAnyPermission('compras.ver', 'compras.requerimientos.crear', 'requerimientos.firmar'), ordenesController.getById);
router.put('/:id/entregar', requirePermission('compras.requerimientos.recibir'), ordenesController.entregar);
router.put('/:id/firmar', requireAnyPermission('compras.requerimientos.aprobar', 'requerimientos.firmar'), ordenesController.firmar);
router.put('/:id', requirePermission('compras.requerimientos.editar'), ordenesController.update);
router.delete('/:id', requirePermission('compras.requerimientos.eliminar'), ordenesController.eliminar);

export default router;
