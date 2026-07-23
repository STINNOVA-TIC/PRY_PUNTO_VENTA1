"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/ordenes.routes.ts
const express_1 = require("express");
const ordenes_controller_1 = require("../controllers/ordenes.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', ordenes_controller_1.ordenesController.crear);
router.get('/', ordenes_controller_1.ordenesController.getAll);
router.get('/secuencial/siguiente', ordenes_controller_1.ordenesController.getSiguienteSecuencial);
router.get('/:id', ordenes_controller_1.ordenesController.getById);
router.put('/:id/entregar', ordenes_controller_1.ordenesController.entregar);
exports.default = router;
