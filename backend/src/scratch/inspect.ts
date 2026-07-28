import pool from '../config/db';

async function main() {
  try {
    console.log('=== FORCE SEEDING KEVIN DAVID (EMPLOYEE 5) ===');
    
    const empleadoId = 5;
    const empRes = await pool.query('SELECT * FROM empleado WHERE empleado_id = $1', [empleadoId]);
    const empleado = empRes.rows[0];
    
    if (!empleado) {
      console.error('Employee 5 not found!');
      return;
    }

    // Check if user already exists
    const userCheck = await pool.query('SELECT usuario_id FROM usuario WHERE empleado_id = $1', [empleadoId]);
    let userId = 0;
    
    if (userCheck.rows.length === 0) {
      const userRes = await pool.query(
        `INSERT INTO usuario (usuario_nombre, usuario_email, usuario_password, empleado_id, usuario_estado)
         VALUES ($1, $2, $3, $4, 'activo') RETURNING usuario_id`,
        [
          `${empleado.empleado_nombre} ${empleado.empleado_apellido}`,
          empleado.empleado_email || `autoconsumo_${empleado.empleado_cedula}@empresa.local`,
          '$2b$10$Un9uYn.H5.d2fHpxkUexl.ZtZexGvS2P1g2T9Dq0aFvU8ZqBlyR82', // bcrypt hash for 'autoconsumo123'
          empleadoId
        ]
      );
      userId = userRes.rows[0].usuario_id;
      console.log('User created with ID:', userId);
    } else {
      userId = userCheck.rows[0].usuario_id;
      console.log('User already exists with ID:', userId);
    }

    // Assign role 8
    await pool.query('DELETE FROM usuario_rol WHERE usuario_id = $1 AND rol_id = 8', [userId]);
    await pool.query('INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, 8)', [userId]);
    console.log('Role 8 (empleado_autorizado) assigned successfully.');

    // Dump users
    const users = await pool.query(`
      SELECT u.usuario_id, u.usuario_nombre, u.usuario_email, u.empleado_id, u.usuario_estado,
             array_agg(ur.rol_id) as roles
      FROM usuario u
      LEFT JOIN usuario_rol ur ON u.usuario_id = ur.usuario_id
      GROUP BY u.usuario_id
    `);
    console.table(users.rows);

  } catch (error: any) {
    console.error('Error during manual seeding:', error.message);
  } finally {
    await pool.end();
  }
}

main();
