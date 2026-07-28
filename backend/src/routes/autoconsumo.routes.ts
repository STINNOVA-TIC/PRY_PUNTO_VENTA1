import { Router } from 'express';
import { autoconsumoController } from '../controllers/autoconsumo.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission, requireAnyPermission } from '../middleware/permisos.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('autoconsumo.ver'), autoconsumoController.getAll);
router.get('/:id', requirePermission('autoconsumo.ver'), autoconsumoController.getById);
router.post('/', requirePermission('autoconsumo.crear'), autoconsumoController.crear);
router.post('/:id/aprobar', requirePermission('autoconsumo.aprobar'), autoconsumoController.aprobar);
router.post('/:id/entregar', requirePermission('autoconsumo.entregar'), autoconsumoController.entregar);
router.post('/:id/cancelar', requireAnyPermission('autoconsumo.crear', 'autoconsumo.eliminar', 'autoconsumo.aprobar'), autoconsumoController.cancelar);

export default router;
