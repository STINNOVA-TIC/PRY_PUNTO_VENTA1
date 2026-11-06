// backend/src/routes/activosTi.routes.ts
import { Router } from 'express';
import { activosTiController } from '../controllers/activosTi.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permisos.middleware';

const router = Router();

router.use(authenticate);

// Rutas fijas primero, luego las que llevan parámetro
router.get('/', requirePermission('activos_ti.ver'), activosTiController.listar);
router.get('/resumen-colaboradores', requirePermission('activos_ti.ver'), activosTiController.resumenColaboradores);
router.get('/colaborador/:cedula', requirePermission('activos_ti.ver'), activosTiController.porColaborador);
router.post('/importar', requirePermission('activos_ti.importar'), activosTiController.importar);

// CRUD
router.post('/', requirePermission('activos_ti.gestionar'), activosTiController.crear);
router.put('/:id', requirePermission('activos_ti.gestionar'), activosTiController.actualizar);
router.delete('/:id', requirePermission('activos_ti.gestionar'), activosTiController.eliminar);

export default router;