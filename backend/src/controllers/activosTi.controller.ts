// backend/src/controllers/activosTi.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import pool from '../config/db';
import { AppError } from '../middleware/error.middleware';

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

const esFechaValida = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
};

// Acepta: número de serie de Excel, "miércoles, 12 de junio de 2024", "12/06/2024" o "2024-06-12"
const parseFecha = (valor: any): string | null => {
  if (valor === undefined || valor === null || String(valor).trim() === '') return null;

  let iso: string | null = null;
  if (typeof valor === 'number') {
    const d = new Date(Math.round((valor - 25569) * 86400000));
    iso = isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } else {
    const t = String(valor).trim().toLowerCase();
    let m = t.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+(?:de|del)\s+(\d{4})/);
    if (m && MESES[m[2]]) iso = `${m[3]}-${pad(MESES[m[2]])}-${pad(Number(m[1]))}`;
    if (!iso) {
      m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) iso = `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
    }
    if (!iso) {
      m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) iso = `${m[1]}-${m[2]}-${m[3]}`;
    }
  }
  return iso && esFechaValida(iso) ? iso : null;
};

const texto = (v: any, max: number): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

const entero = (v: any): number | null => {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : null;
};

// Excel convierte la CI en número y se come el 0 inicial (ej. 0912345678 → 912345678)
const normalizarCedula = (v: any): string | null => {
  const s = texto(v, 20);
  if (!s) return null;
  const limpio = s.replace(/[^0-9A-Za-z]/g, '');
  return /^\d{9}$/.test(limpio) ? `0${limpio}` : limpio;
};

// Datos de un activo desde el formulario (crear / editar)
const leerDatosFormulario = (b: any) => {
  const datos = {
    acta_numero: entero(b.acta_numero),
    responsable_nombre: texto(b.responsable_nombre, 200),
    responsable_cedula: normalizarCedula(b.responsable_cedula),
    material: texto(b.material, 255),
    area_responsable: texto(b.area_responsable, 100),
    condicion: texto(b.condicion, 50)?.toUpperCase() ?? null,
    existencia: texto(b.existencia, 10)?.toUpperCase() ?? null,
    equipo_tipo: texto(b.equipo_tipo, 150),
    total: entero(b.total),
    ingresados: entero(b.ingresados),
    salidos: entero(b.salidos),
    descripcion: texto(b.descripcion, 5000),
    serial_marca: texto(b.serial_marca, 150),
    fecha_acta: parseFecha(b.fecha_acta),
  };

  if (!datos.material && !datos.equipo_tipo) {
    throw new AppError('Indica el equipo tecnológico o el material/herramienta.', 400);
  }
  if (b.fecha_acta && String(b.fecha_acta).trim() !== '' && !datos.fecha_acta) {
    throw new AppError('La fecha del acta no es válida.', 400);
  }
  return datos;
};

type DatosActivo = ReturnType<typeof leerDatosFormulario>;

const buscarEmpleadoPorCedula = async (cedula: string | null) => {
  if (!cedula) return null;
  const r = await pool.query(
    `SELECT empleado_id, empleado_nombre || ' ' || empleado_apellido AS nombre
     FROM empleado
     WHERE LTRIM(empleado_cedula, '0') = LTRIM($1, '0')
     LIMIT 1`,
    [cedula]
  );
  return r.rows[0] || null;
};

// Orden de columnas compartido por INSERT y UPDATE ($1..$15)
const valoresActivo = (d: DatosActivo, empleadoId: number | null, nombre: string | null) => [
  d.acta_numero, nombre, d.responsable_cedula, empleadoId, d.material,
  d.area_responsable, d.condicion, d.existencia, d.equipo_tipo, d.total,
  d.ingresados, d.salidos, d.descripcion, d.serial_marca, d.fecha_acta,
];

const SELECT_REGISTROS = `
  SELECT
    r.activo_ti_registro_id                      AS id,
    r.acta_numero,
    r.responsable_nombre,
    r.responsable_cedula,
    r.empleado_id,
    e.empleado_nombre || ' ' || e.empleado_apellido AS empleado_nombre_sistema,
    d.departamento_nombre,
    r.material,
    r.area_responsable,
    r.condicion,
    r.existencia,
    r.equipo_tipo,
    r.total,
    r.ingresados,
    r.salidos,
    r.descripcion,
    r.serial_marca,
    TO_CHAR(r.fecha_acta, 'YYYY-MM-DD')          AS fecha_acta,
    r.origen
  FROM activo_ti_registro r
  LEFT JOIN empleado e     ON e.empleado_id = r.empleado_id
  LEFT JOIN departamento d ON d.departamento_id = e.departamento_id
`;

export const activosTiController = {
  // Listado del inventario TI (solo registros activos)
  listar: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await pool.query(
        `${SELECT_REGISTROS}
         WHERE r.estado = 'activo'
         ORDER BY r.acta_numero DESC NULLS LAST, r.activo_ti_registro_id DESC`
      );
      res.json({ success: true, data: result.rows });
      return;
    } catch (error) {
      console.error('Error al listar activos TI:', error);
      throw new AppError('Error al obtener el inventario de activos TI', 500);
    }
  },

  // Cantidad de activos por cédula (para el botón en Colaboradores)
  resumenColaboradores: async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await pool.query(`
        SELECT
          responsable_cedula AS cedula,
          COUNT(*)::int      AS registros,
          COALESCE(SUM(COALESCE(ingresados, total, 0) - COALESCE(salidos, 0)), 0)::int AS en_poder
        FROM activo_ti_registro
        WHERE responsable_cedula IS NOT NULL
          AND estado = 'activo'
        GROUP BY responsable_cedula
      `);
      res.json({ success: true, data: result.rows });
      return;
    } catch (error) {
      console.error('Error al obtener resumen de activos TI:', error);
      throw new AppError('Error al obtener el resumen de activos TI', 500);
    }
  },

  // Activos de un colaborador por cédula (para el modal)
  porColaborador: async (req: AuthRequest, res: Response): Promise<void> => {
    const cedula = normalizarCedula(req.params.cedula);
    if (!cedula) throw new AppError('Cédula inválida.', 400);
    try {
      const result = await pool.query(
        `${SELECT_REGISTROS}
         WHERE r.responsable_cedula = $1
           AND r.estado = 'activo'
         ORDER BY r.fecha_acta DESC NULLS LAST, r.acta_numero DESC NULLS LAST`,
        [cedula]
      );
      res.json({ success: true, data: result.rows });
      return;
    } catch (error) {
      console.error('Error al obtener activos del colaborador:', error);
      throw new AppError('Error al obtener los activos del colaborador', 500);
    }
  },

  // Crear un activo manualmente
  crear: async (req: AuthRequest, res: Response): Promise<void> => {
    const datos = leerDatosFormulario(req.body);
    try {
      const empleado = await buscarEmpleadoPorCedula(datos.responsable_cedula);
      const nombre = datos.responsable_nombre || empleado?.nombre || null;

      const result = await pool.query(
        `INSERT INTO activo_ti_registro (
           acta_numero, responsable_nombre, responsable_cedula, empleado_id, material,
           area_responsable, condicion, existencia, equipo_tipo, total,
           ingresados, salidos, descripcion, serial_marca, fecha_acta,
           origen, importado_por
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'MANUAL',$16)
         RETURNING activo_ti_registro_id AS id`,
        [...valoresActivo(datos, empleado?.empleado_id ?? null, nombre), req.user?.id || null]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: datos.responsable_cedula && !empleado
          ? 'Activo registrado. Aviso: la CI no está registrada como colaborador.'
          : 'Activo registrado correctamente.',
      });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error al crear activo TI:', error);
      throw new AppError('Error al registrar el activo', 500);
    }
  },

  // Editar un activo
  actualizar: async (req: AuthRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Activo inválido.', 400);
    const datos = leerDatosFormulario(req.body);

    try {
      const empleado = await buscarEmpleadoPorCedula(datos.responsable_cedula);
      const nombre = datos.responsable_nombre || empleado?.nombre || null;

      const result = await pool.query(
        `UPDATE activo_ti_registro SET
           acta_numero = $1, responsable_nombre = $2, responsable_cedula = $3, empleado_id = $4,
           material = $5, area_responsable = $6, condicion = $7, existencia = $8,
           equipo_tipo = $9, total = $10, ingresados = $11, salidos = $12,
           descripcion = $13, serial_marca = $14, fecha_acta = $15,
           fecha_modificacion = CURRENT_TIMESTAMP
         WHERE activo_ti_registro_id = $16 AND estado = 'activo'`,
        [...valoresActivo(datos, empleado?.empleado_id ?? null, nombre), id]
      );
      if (result.rowCount === 0) throw new AppError('Activo no encontrado.', 404);

      res.json({ success: true, message: 'Activo actualizado correctamente.' });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error al actualizar activo TI:', error);
      throw new AppError('Error al actualizar el activo', 500);
    }
  },

  // Baja lógica
  eliminar: async (req: AuthRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Activo inválido.', 400);
    try {
      const result = await pool.query(
        `UPDATE activo_ti_registro
         SET estado = 'inactivo', fecha_modificacion = CURRENT_TIMESTAMP
         WHERE activo_ti_registro_id = $1 AND estado = 'activo'`,
        [id]
      );
      if (result.rowCount === 0) throw new AppError('Activo no encontrado.', 404);
      res.json({ success: true, message: 'Activo dado de baja.' });
      return;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Error al dar de baja activo TI:', error);
      throw new AppError('Error al dar de baja el activo', 500);
    }
  },

  // Importa las filas del Excel. Reemplaza SOLO la carga anterior del Excel (los MANUAL se conservan).
  importar: async (req: AuthRequest, res: Response): Promise<void> => {
    const { filas } = req.body;
    if (!Array.isArray(filas) || filas.length === 0) {
      throw new AppError('El archivo no tiene filas para importar.', 400);
    }
    if (filas.length > 20000) {
      throw new AppError('El archivo supera el máximo de 20.000 filas.', 400);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const empRes = await client.query('SELECT empleado_id, empleado_cedula FROM empleado');
      const empleadosPorCedula = new Map<string, number>();
      empRes.rows.forEach((e: any) => {
        const ced = normalizarCedula(e.empleado_cedula);
        if (ced) empleadosPorCedula.set(ced, e.empleado_id);
      });

      await client.query(`DELETE FROM activo_ti_registro WHERE origen = 'EXCEL'`);

      let insertados = 0;
      let omitidas = 0;
      let sinEmpleado = 0;
      const advertencias: string[] = [];

      for (let i = 0; i < filas.length; i++) {
        const f = filas[i] || {};
        const filaExcel = i + 2; // la fila 1 es el encabezado

        const cedula = normalizarCedula(f.responsable_cedula);
        const material = texto(f.material, 255);
        const equipoTipo = texto(f.equipo_tipo, 150);
        const descripcion = texto(f.descripcion, 5000);

        if (!cedula && !material && !equipoTipo && !descripcion) {
          omitidas++;
          continue;
        }

        const fecha = parseFecha(f.fecha_acta);
        if (f.fecha_acta !== undefined && String(f.fecha_acta).trim() !== '' && !fecha) {
          advertencias.push(`Fila ${filaExcel}: fecha "${f.fecha_acta}" no reconocida; se guardó vacía.`);
        }

        const empleadoId = cedula ? empleadosPorCedula.get(cedula) ?? null : null;
        if (cedula && !empleadoId) {
          sinEmpleado++;
          advertencias.push(`Fila ${filaExcel}: la CI ${cedula} no está registrada como colaborador.`);
        }

        await client.query(
          `INSERT INTO activo_ti_registro (
             acta_numero, responsable_nombre, responsable_cedula, empleado_id, material,
             area_responsable, condicion, existencia, equipo_tipo, total, ingresados, salidos,
             descripcion, serial_marca, fecha_acta, origen, importado_por
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'EXCEL',$16)`,
          [
            entero(f.acta_numero),
            texto(f.responsable_nombre, 200),
            cedula,
            empleadoId,
            material,
            texto(f.area_responsable, 100),
            texto(f.condicion, 50)?.toUpperCase() ?? null,
            texto(f.existencia, 10)?.toUpperCase() ?? null,
            equipoTipo,
            entero(f.total),
            entero(f.ingresados),
            entero(f.salidos),
            descripcion,
            texto(f.serial_marca, 150),
            fecha,
            req.user?.id || null,
          ]
        );
        insertados++;
      }

      await client.query('COMMIT');
      res.json({
        success: true,
        data: { insertados, omitidas, sin_empleado: sinEmpleado, advertencias: advertencias.slice(0, 100) },
      });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      console.error('Error al importar activos TI:', error);
      throw new AppError('Error al importar el inventario de activos TI', 500);
    } finally {
      client.release();
    }
  },
};