// backend/src/routes/ordenes.routes.ts
// import { Router } from 'express';
// import { ordenesController } from '../controllers/ordenes.controller';
// import { authenticate } from '../middleware/auth.middleware';
// import { requireAnyPermission, requirePermission } from '../middleware/permisos.middleware';

// const router = Router();

// router.use(authenticate);

// router.post('/', requirePermission('compras.requerimientos.crear'), ordenesController.crear);
// router.get('/', requireAnyPermission('compras.ver', 'compras.requerimientos.crear', 'compras.requerimientos.editar', 'compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenesController.getAll);
// router.get('/secuencial/siguiente', requireAnyPermission('compras.ver', 'compras.requerimientos.crear', 'compras.requerimientos.editar', 'compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenesController.getSiguienteSecuencial);
// router.get('/:id', requireAnyPermission('compras.ver', 'compras.requerimientos.crear', 'compras.requerimientos.editar', 'compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenesController.getById);
// router.put('/:id/entregar', requirePermission('compras.requerimientos.recibir'), ordenesController.entregar);
// router.put('/:id/firmar', requireAnyPermission('compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenesController.firmar);
// router.put('/:id', requirePermission('compras.requerimientos.editar'), ordenesController.update);
// router.delete('/:id', requirePermission('compras.requerimientos.eliminar'), ordenesController.eliminar);

// export default router;

// backend/src/routes/ordenes.routes.ts
import { Router } from 'express';
import { ordenesController } from '../controllers/ordenes.controller';
import { documentosOrdenController, subirPdfMiddleware } from '../controllers/documentosOrden.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission, requirePermission } from '../middleware/permisos.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requirePermission('compras.requerimientos.crear'), ordenesController.crear);
router.get('/', requireAnyPermission('compras.ver', 'compras.requerimientos.crear', 'compras.requerimientos.editar', 'compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenesController.getAll);
router.get('/secuencial/siguiente', requireAnyPermission('compras.ver', 'compras.requerimientos.crear', 'compras.requerimientos.editar', 'compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenesController.getSiguienteSecuencial);

// Documentos PDF adjuntos (rutas fijas antes de '/:id')
router.get('/documentos/conteo', requireAnyPermission('compras.ver', 'compras.requerimientos.recibir'), documentosOrdenController.conteo);
router.get('/:id/documentos', requireAnyPermission('compras.ver', 'compras.requerimientos.recibir'), documentosOrdenController.listar);
router.get('/:id/documentos/:docId/archivo', requireAnyPermission('compras.ver', 'compras.requerimientos.recibir'), documentosOrdenController.ver);
router.post('/:id/documentos', requirePermission('compras.requerimientos.recibir'), subirPdfMiddleware, documentosOrdenController.subir);
router.delete('/:id/documentos/:docId', requirePermission('compras.requerimientos.recibir'), documentosOrdenController.eliminar);

router.get('/:id', requireAnyPermission('compras.ver', 'compras.requerimientos.crear', 'compras.requerimientos.editar', 'compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenesController.getById);
router.put('/:id/entregar', requirePermission('compras.requerimientos.recibir'), ordenesController.entregar);
router.put('/:id/firmar', requireAnyPermission('compras.requerimientos.aprobar', 'compras.requerimientos.recibir'), ordenesController.firmar);
router.put('/:id', requirePermission('compras.requerimientos.editar'), ordenesController.update);
router.delete('/:id', requirePermission('compras.requerimientos.eliminar'), ordenesController.eliminar);

export default router;
