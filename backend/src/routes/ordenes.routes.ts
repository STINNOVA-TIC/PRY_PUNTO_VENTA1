// backend/src/routes/ordenes.routes.ts
import { Router } from 'express';
import { ordenesController } from '../controllers/ordenes.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', ordenesController.crear);
router.get('/', ordenesController.getAll);
router.get('/secuencial/siguiente', ordenesController.getSiguienteSecuencial);
router.get('/:id', ordenesController.getById);
router.put('/:id/entregar', ordenesController.entregar);
router.delete('/:id', ordenesController.eliminar);

export default router;
