import { Router } from 'express';
import { ventasController } from '../controllers/ventas.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permisos.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('ventas.ver'), ventasController.getAll);
router.post('/', requirePermission('ventas.realizar'), ventasController.create);

export default router;