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

    // 4. Sembrar nuevo rol de empleado_autorizado
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
