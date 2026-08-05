import pool from './db';

export const initDb = async () => {
  try {
    console.log('🔄 Iniciando migración y verificación de base de datos...');

    // 1. Crear tabla de autoconsumo
    await pool.query(`
      CREATE TABLE IF NOT EXISTS autoconsumo (
        autoconsumo_id SERIAL PRIMARY KEY,
        empleado_id INTEGER NOT NULL REFERENCES empleado(empleado_id) ON DELETE RESTRICT,
        sucursal_id INTEGER NOT NULL REFERENCES sucursal(sucursal_id) ON DELETE RESTRICT,
        departamento_id INTEGER NOT NULL REFERENCES departamento(departamento_id) ON DELETE RESTRICT,
        centro_costos_id INTEGER NOT NULL REFERENCES centro_costos(centro_costos_id) ON DELETE RESTRICT,
        
        autoconsumo_codigo VARCHAR(50) UNIQUE NOT NULL,
        autoconsumo_justificacion TEXT NOT NULL,
        autoconsumo_fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        autoconsumo_fecha_entrega TIMESTAMP NULL,
        autoconsumo_estado VARCHAR(20) DEFAULT 'pendiente' CHECK (autoconsumo_estado IN ('pendiente', 'aprobado', 'entregado', 'rechazado', 'cancelado')),
        autoconsumo_observacion TEXT NULL,
        
        usuario_aprobador_id INTEGER NULL REFERENCES usuario(usuario_id) ON DELETE SET NULL,
        autoconsumo_fecha_aprobacion TIMESTAMP NULL,
        
        usuario_entrega_id INTEGER NULL REFERENCES usuario(usuario_id) ON DELETE SET NULL,
        autoconsumo_foto_entrega VARCHAR(255) NULL,
        
        autoconsumo_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        autoconsumo_fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Crear tabla de autoconsumo_detalle
    await pool.query(`
      CREATE TABLE IF NOT EXISTS autoconsumo_detalle (
        autoconsumo_detalle_id SERIAL PRIMARY KEY,
        autoconsumo_id INTEGER NOT NULL REFERENCES autoconsumo(autoconsumo_id) ON DELETE CASCADE,
        producto_id INTEGER NOT NULL REFERENCES producto(producto_id) ON DELETE RESTRICT,
        autoconsumo_detalle_cantidad INTEGER NOT NULL CHECK (autoconsumo_detalle_cantidad > 0),
        autoconsumo_detalle_precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
        autoconsumo_detalle_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0
      );
    `);

    // 3. Crear índices si no existen
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_autoconsumo_estado ON autoconsumo(autoconsumo_estado);
      CREATE INDEX IF NOT EXISTS idx_autoconsumo_codigo ON autoconsumo(autoconsumo_codigo);
    `);

    // 4. Migración: permitir devoluciones de autoconsumos en la tabla devolucion
    await pool.query(`
      ALTER TABLE devolucion
        ALTER COLUMN solicitud_entrega_id DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS autoconsumo_id INTEGER NULL;
    `);
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_devolucion_autoconsumo'
        ) THEN
          ALTER TABLE devolucion
            ADD CONSTRAINT fk_devolucion_autoconsumo
            FOREIGN KEY (autoconsumo_id) REFERENCES autoconsumo(autoconsumo_id) ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    // 4.1. Migración: trazar autoconsumos en movimiento_inventario
    await pool.query(`
      ALTER TABLE movimiento_inventario ADD COLUMN IF NOT EXISTS autoconsumo_id INTEGER NULL;
    `);

    // 4.2. Migración: indicador de IVA por línea de detalle de orden de compra
    await pool.query(`
      ALTER TABLE orden_compra_detalle
        ADD COLUMN IF NOT EXISTS orden_compra_detalle_incluye_iva BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    // 4.3. Migración: firma digital en empleado
    await pool.query(`
      ALTER TABLE empleado
        ADD COLUMN IF NOT EXISTS empleado_firma VARCHAR(255) NULL;
    `);

    // 4.4. Migración: firmas digitales y empleados de aprobación/recepción en orden_compra
    await pool.query(`
      ALTER TABLE orden_compra
        ADD COLUMN IF NOT EXISTS orden_compra_firma_elaborador VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS orden_compra_fecha_firma_elaborador TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS orden_compra_firma_aprobador VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS orden_compra_fecha_firma_aprobador TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS orden_compra_firma_recibido VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS orden_compra_fecha_firma_recibido TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS empleado_aprobador_id INTEGER NULL,
        ADD COLUMN IF NOT EXISTS empleado_receptor_id INTEGER NULL;
    `);

    // 4.5. Migración: claves foráneas de empleados en orden_compra
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_orden_compra_empleado_aprobador'
        ) THEN
          ALTER TABLE orden_compra
            ADD CONSTRAINT fk_orden_compra_empleado_aprobador
            FOREIGN KEY (empleado_aprobador_id) REFERENCES empleado(empleado_id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_orden_compra_empleado_receptor'
        ) THEN
          ALTER TABLE orden_compra
            ADD CONSTRAINT fk_orden_compra_empleado_receptor
            FOREIGN KEY (empleado_receptor_id) REFERENCES empleado(empleado_id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // 5. Sembrar nuevo rol de empleado_autorizado
    await pool.query(`
      INSERT INTO rol (rol_id, rol_nombre, rol_descripcion, rol_estado) 
      VALUES (8, 'empleado_autorizado', 'Empleado autorizado para realizar autoconsumo', 'activo')
      ON CONFLICT (rol_nombre) DO NOTHING;
    `);

    // Ajustar secuencia de rol
    await pool.query(`
      SELECT setval('rol_rol_id_seq', COALESCE((SELECT MAX(rol_id)+1 FROM rol), 1), false);
    `);

    console.log('✅ Verificación y migración de base de datos completada exitosamente.');
  } catch (error: any) {
    console.error('❌ Error durante la migración de base de datos:', error.message);
  }
};
