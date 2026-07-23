// backend/src/routes/upload.routes.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

const router = Router();

// Storage config
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const type = req.query.type as string;
    let uploadPath = path.join(__dirname, '../../img');

    if (type === 'empleado' || type === 'empleados') {
      uploadPath = path.join(uploadPath, 'empleados');
    } else if (type === 'producto' || type === 'productos') {
      uploadPath = path.join(uploadPath, 'producto');
    } else if (type === 'entrega' || type === 'entregas') {
      uploadPath = path.join(uploadPath, 'entregas');
    }

    // Asegurar que exista la carpeta
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)', 400));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  }
});

router.post('/', authenticate, upload.single('foto'), (req: any, res) => {
  if (!req.file) {
    throw new AppError('No se subió ningún archivo', 400);
  }

  const type = req.query.type as string;
  let pathSegment = 'producto';
  if (type === 'empleado' || type === 'empleados') {
    pathSegment = 'empleados';
  } else if (type === 'entrega' || type === 'entregas') {
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

export default router;
