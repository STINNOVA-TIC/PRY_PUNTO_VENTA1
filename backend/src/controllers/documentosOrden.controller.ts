// backend/src/controllers/documentosOrden.controller.ts
// Documentos PDF adjuntos a un requerimiento (facturas escaneadas, guías, cotizaciones...).
import { Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';

const MAX_DOCUMENTOS_POR_ORDEN = 6;
const MAX_TAMANO_MB = 10;
const TIPOS_DOCUMENTO = ['FACTURA', 'GUIA_REMISION', 'COTIZACION', 'PROFORMA', 'ACTA_RECEPCION', 'OTRO'];

// Carpeta PRIVADA: no se publica en /img; solo se descarga con sesión y permiso.
const CARPETA_DOCUMENTOS = path.resolve(__dirname, '../../uploads/requerimientos');

const asegurarCarpeta = () => {
  if (!fs.existsSync(CARPETA_DOCUMENTOS)) fs.mkdirSync(CARPETA_DOCUMENTOS, { recursive: true });
};

const borrarArchivo = (ruta?: string) => {
  if (!ruta) return;
  try { if (fs.existsSync(ruta)) fs.unlinkSync(ruta); } catch { /* sin acción */ }
};

// Verifica que el contenido sea realmente un PDF (no solo la extensión)
const esPdfReal = (ruta: string) => {
  const fd = fs.openSync(ruta, 'r');
  try {
    const cabecera = Buffer.alloc(5);
    fs.readSync(fd, cabecera, 0, 5, 0);
    return cabecera.toString('ascii') === '%PDF-';
  } finally {
    fs.closeSync(fd);
  }
};

// multer entrega el nombre en latin1; se corrige para tildes y ñ
const nombreLegible = (original: string) => {
  const convertido = Buffer.from(original, 'latin1').toString('utf8');
  return (convertido.includes('\uFFFD') ? original : convertido).slice(0, 255);
};

const idValido = (valor: any, etiqueta: string) => {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`${etiqueta} inválido.`, 400);
  return n;
};

const uploadPdf = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      asegurarCarpeta();
      cb(null, CARPETA_DOCUMENTOS);
    },
    filename: (_req, _file, cb) => {
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.pdf`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const esPdf = file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
    if (esPdf) cb(null, true);
    else cb(new AppError('Solo se permiten archivos PDF.', 400));
  },
  limits: { fileSize: MAX_TAMANO_MB * 1024 * 1024, files: 1 },
});

// Middleware de subida: convierte los errores de multer en mensajes claros
export const subirPdfMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  uploadPdf.single('documento')(req as any, res as any, (err: any) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(`El PDF supera el máximo de ${MAX_TAMANO_MB} MB.`, 400));
    }
    if (err instanceof AppError) return next(err);
    return next(new AppError('No se pudo subir el archivo.', 400));
  });
};

export const documentosOrdenController = {
  // Cantidad de documentos por requerimiento: { "12": 3, "15": 1 }
  conteo: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await pool.query(
        `SELECT orden_compra_id, COUNT(*)::int AS total
         FROM orden_compra_documento
         WHERE documento_estado = 'activo'
         GROUP BY orden_compra_id`
      );
      const data: Record<string, number> = {};
      result.rows.forEach((r: any) => { data[String(r.orden_compra_id)] = r.total; });
      res.json({ success: true, data });
      return;
    } catch (error) {
      console.error('Error al contar documentos:', error);
      throw new AppError('Error al obtener los documentos adjuntos', 500);
    }
  },

  listar: async (req: AuthRequest, res: Response): Promise<void> => {
    const ordenId = idValido(req.params.id, 'Requerimiento');
    try {
      const result = await pool.query(
        `SELECT
           d.orden_compra_documento_id                     AS id,
           d.documento_tipo                                AS tipo,
           d.documento_nombre_original                     AS nombre_original,
           d.documento_tamano_bytes                        AS tamano_bytes,
           TO_CHAR(d.fecha_creacion, 'DD/MM/YYYY HH24:MI')  AS fecha,
           u.usuario_nombre                                AS usuario_nombre
         FROM orden_compra_documento d
         LEFT JOIN usuario u ON u.usuario_id = d.usuario_id
         WHERE d.orden_compra_id = $1 AND d.documento_estado = 'activo'
         ORDER BY d.fecha_creacion ASC`,
        [ordenId]
      );
      res.json({ success: true, data: result.rows });
      return;
    } catch (error) {
      console.error('Error al listar documentos:', error);
      throw new AppError('Error al obtener los documentos adjuntos', 500);
    }
  },

  subir: async (req: AuthRequest, res: Response): Promise<void> => {
    const archivo = (req as any).file as Express.Multer.File | undefined;
    try {
      const ordenId = idValido(req.params.id, 'Requerimiento');
      if (!archivo) throw new AppError('No se recibió ningún archivo.', 400);
      if (!esPdfReal(archivo.path)) throw new AppError('El archivo no es un PDF válido.', 400);

      const ordenRes = await pool.query('SELECT 1 FROM orden_compra WHERE orden_compra_id = $1', [ordenId]);
      if (ordenRes.rows.length === 0) throw new AppError('Requerimiento no encontrado.', 404);

      const conteoRes = await pool.query(
        `SELECT COUNT(*)::int AS total FROM orden_compra_documento
         WHERE orden_compra_id = $1 AND documento_estado = 'activo'`,
        [ordenId]
      );
      if (conteoRes.rows[0].total >= MAX_DOCUMENTOS_POR_ORDEN) {
        throw new AppError(`Este requerimiento ya tiene el máximo de ${MAX_DOCUMENTOS_POR_ORDEN} documentos.`, 400);
      }

      const tipoSolicitado = String(req.body?.tipo || 'OTRO').toUpperCase();
      const tipo = TIPOS_DOCUMENTO.includes(tipoSolicitado) ? tipoSolicitado : 'OTRO';

      const result = await pool.query(
        `INSERT INTO orden_compra_documento (
           orden_compra_id, documento_tipo, documento_nombre_original,
           documento_archivo, documento_tamano_bytes, usuario_id
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING orden_compra_documento_id AS id`,
        [ordenId, tipo, nombreLegible(archivo.originalname), archivo.filename, archivo.size, req.user?.id || null]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'Documento adjuntado correctamente.' });
      return;
    } catch (error) {
      borrarArchivo(archivo?.path); // no dejar archivos huérfanos si algo falla
      if (error instanceof AppError) throw error;
      console.error('Error al subir documento:', error);
      throw new AppError('Error al adjuntar el documento', 500);
    }
  },

  // Entrega el PDF solo a usuarios autenticados con permiso
  ver: async (req: AuthRequest, res: Response): Promise<void> => {
    const ordenId = idValido(req.params.id, 'Requerimiento');
    const docId = idValido(req.params.docId, 'Documento');

    const result = await pool.query(
      `SELECT documento_archivo, documento_nombre_original
       FROM orden_compra_documento
       WHERE orden_compra_documento_id = $1 AND orden_compra_id = $2 AND documento_estado = 'activo'`,
      [docId, ordenId]
    );
    const doc = result.rows[0];
    if (!doc) throw new AppError('Documento no encontrado.', 404);

    const ruta = path.join(CARPETA_DOCUMENTOS, path.basename(doc.documento_archivo));
    if (!fs.existsSync(ruta)) throw new AppError('El archivo ya no existe en el servidor.', 404);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.documento_nombre_original)}`);
    res.sendFile(ruta);
  },

  // Baja lógica: el archivo se conserva por auditoría
  eliminar: async (req: AuthRequest, res: Response): Promise<void> => {
    const ordenId = idValido(req.params.id, 'Requerimiento');
    const docId = idValido(req.params.docId, 'Documento');
    try {
      const result = await pool.query(
        `UPDATE orden_compra_documento
         SET documento_estado = 'inactivo', fecha_desactivacion = CURRENT_TIMESTAMP
         WHERE orden_compra_documento_id = $1 AND orden_compra_id = $2 AND documento_estado = 'activo'`,
        [docId, ordenId]
      );
      if (result.rowCount === 0) throw new AppError('Documento no encontrado.', 404);
      res.json({ success: true, message: 'Documento quitado del requerimiento.' });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error al quitar documento:', error);
      throw new AppError('Error al quitar el documento', 500);
    }
  },
};