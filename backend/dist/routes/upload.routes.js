"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/upload.routes.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
// Storage config
const storage = multer_1.default.diskStorage({
    destination: (req, _file, cb) => {
        const type = req.query.type;
        let uploadPath = path_1.default.join(__dirname, '../../img');
        if (type === 'empleado' || type === 'empleados') {
            uploadPath = path_1.default.join(uploadPath, 'empleados');
        }
        else if (type === 'producto' || type === 'productos') {
            uploadPath = path_1.default.join(uploadPath, 'producto');
        }
        else if (type === 'entrega' || type === 'entregas') {
            uploadPath = path_1.default.join(uploadPath, 'entregas');
        }
        // Asegurar que exista la carpeta
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new error_middleware_1.AppError('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)', 400));
        }
    },
    limits: {
        fileSize: 20 * 1024 * 1024 // 20 MB max
    }
});
router.post('/', auth_middleware_1.authenticate, upload.single('foto'), (req, res) => {
    if (!req.file) {
        throw new error_middleware_1.AppError('No se subió ningún archivo', 400);
    }
    const type = req.query.type;
    let pathSegment = 'producto';
    if (type === 'empleado' || type === 'empleados') {
        pathSegment = 'empleados';
    }
    else if (type === 'entrega' || type === 'entregas') {
        pathSegment = 'entregas';
    }
    const host = req.get('host') || 'localhost:5000';
    const fileUrl = `http://${host}/img/${pathSegment}/${req.file.filename}`;
    res.json({
        success: true,
        url: fileUrl,
        message: 'Imagen subida exitosamente'
    });
});
exports.default = router;
