// ============ ROLES ============
export const roles = [
    {
        id: 1,
        nombre: 'admin',
        descripcion: 'Administrador del sistema con acceso total',
        permisos: {
            gestionar_usuarios: true,
            gestionar_productos: true,
            gestionar_inventario: true,
            gestionar_empleados: true,
            realizar_ventas: true,
            gestionar_entregas: true,
            ver_reportes: true,
            ver_reportes_financieros: true,
            ver_datos_empleados: true
        }
    },
    {
        id: 2,
        nombre: 'guardia',
        descripcion: 'Encargado de entregas y verificación de empleados',
        permisos: {
            gestionar_usuarios: false,
            gestionar_productos: false,
            gestionar_inventario: false,
            gestionar_empleados: false,
            realizar_ventas: false,
            gestionar_entregas: true,
            ver_reportes: true,
            ver_reportes_financieros: false,
            ver_datos_empleados: true
        }
    },
    {
        id: 3,
        nombre: 'empleado',
        descripcion: 'Empleado que puede realizar compras con descuento de nómina',
        permisos: {
            gestionar_usuarios: false,
            gestionar_productos: false,
            gestionar_inventario: false,
            gestionar_empleados: false,
            realizar_ventas: true,
            gestionar_entregas: false,
            ver_reportes: false,
            ver_reportes_financieros: false,
            ver_datos_empleados: false
        }
    },
    {
        id: 4,
        nombre: 'inventario',
        descripcion: 'Encargado de gestión de inventario y productos',
        permisos: {
            gestionar_usuarios: false,
            gestionar_productos: true,
            gestionar_inventario: true,
            gestionar_empleados: false,
            realizar_ventas: false,
            gestionar_entregas: false,
            ver_reportes: true,
            ver_reportes_financieros: false,
            ver_datos_empleados: false
        }
    }
];
// ============ USUARIOS ============
// Nota: En producción usar bcrypt, aquí solo para simulación
export const usuarios = [
    {
        id: 1,
        nombre: 'Carlos Admin',
        email: 'admin@empresa.com',
        password_hash: '$2a$10$M9xVkHtX7n3PqR5tY2uLhO9Zx7WqVnM4yB3cDfGjKpL1wE2rT6uJ', // "admin123"
        rol_id: 1,
        activo: true,
        fecha_creacion: new Date('2024-01-01'),
        ultimo_acceso: new Date('2026-07-14'),
        intentos_fallidos: 0
    },
    {
        id: 2,
        nombre: 'Juan Guardia',
        email: 'guardia@empresa.com',
        password_hash: '$2a$10$M9xVkHtX7n3PqR5tY2uLhO9Zx7WqVnM4yB3cDfGjKpL1wE2rT6uJ', // "guardia123"
        rol_id: 2,
        activo: true,
        fecha_creacion: new Date('2024-01-15'),
        ultimo_acceso: new Date('2026-07-14')
    },
    {
        id: 3,
        nombre: 'Ana Empleada',
        email: 'ana@empresa.com',
        password_hash: '$2a$10$M9xVkHtX7n3PqR5tY2uLhO9Zx7WqVnM4yB3cDfGjKpL1wE2rT6uJ', // "empleado123"
        rol_id: 3,
        activo: true,
        fecha_creacion: new Date('2024-02-01'),
        ultimo_acceso: new Date('2026-07-14')
    },
    {
        id: 4,
        nombre: 'Pedro Inventario',
        email: 'inventario@empresa.com',
        password_hash: '$2a$10$M9xVkHtX7n3PqR5tY2uLhO9Zx7WqVnM4yB3cDfGjKpL1wE2rT6uJ', // "inventario123"
        rol_id: 4,
        activo: true,
        fecha_creacion: new Date('2024-03-01'),
        ultimo_acceso: new Date('2026-07-14')
    }
];
// ============ EMPLEADOS ============
export const empleados = [
    {
        id: 1,
        usuario_id: 3,
        codigo_empleado: 'EMP-001',
        nombre: 'Ana',
        apellido: 'García',
        salario_base: 2500,
        fecha_contrato: new Date('2023-01-15'),
        departamento: 'Ventas',
        cargo: 'Vendedor Senior',
        tipo_contrato: 'indefinido',
        saldo_disponible: 500,
        limite_credito: 800,
        foto_perfil: 'https://ui-avatars.com/api/?name=Ana+Garcia&size=128',
        activo: true
    },
    {
        id: 2,
        usuario_id: null,
        codigo_empleado: 'EMP-002',
        nombre: 'María',
        apellido: 'López',
        salario_base: 1800,
        fecha_contrato: new Date('2023-06-01'),
        departamento: 'Limpieza',
        cargo: 'Auxiliar de Limpieza',
        tipo_contrato: 'indefinido',
        saldo_disponible: 200,
        limite_credito: 300,
        foto_perfil: 'https://ui-avatars.com/api/?name=Maria+Lopez&size=128',
        activo: true
    },
    {
        id: 3,
        usuario_id: null,
        codigo_empleado: 'EMP-003',
        nombre: 'Carlos',
        apellido: 'Martínez',
        salario_base: 3000,
        fecha_contrato: new Date('2022-10-01'),
        departamento: 'IT',
        cargo: 'Desarrollador',
        tipo_contrato: 'indefinido',
        saldo_disponible: 600,
        limite_credito: 1000,
        foto_perfil: 'https://ui-avatars.com/api/?name=Carlos+Martinez&size=128',
        activo: true
    },
    {
        id: 4,
        usuario_id: null,
        codigo_empleado: 'EMP-004',
        nombre: 'Laura',
        apellido: 'Rodríguez',
        salario_base: 2200,
        fecha_contrato: new Date('2023-08-15'),
        departamento: 'Marketing',
        cargo: 'Analista',
        tipo_contrato: 'temporal',
        saldo_disponible: 400,
        limite_credito: 600,
        foto_perfil: 'https://ui-avatars.com/api/?name=Laura+Rodriguez&size=128',
        activo: true
    }
];
// ============ PRODUCTOS ============
export const productos = [
    {
        id: 1,
        codigo_barras: '1234567890123',
        nombre: 'Laptop HP ProBook',
        descripcion: 'Laptop HP ProBook 440 G8, Intel Core i5, 8GB RAM, 256GB SSD',
        precio_costo: 800,
        precio_venta: 1200,
        stock_actual: 15,
        stock_minimo: 5,
        categoria_id: 1,
        proveedor_id: 1,
        activo: true,
        fecha_creacion: new Date('2024-01-01')
    },
    {
        id: 2,
        codigo_barras: '2345678901234',
        nombre: 'Monitor Samsung 24"',
        descripcion: 'Monitor Samsung LED 24" Full HD, 60Hz, HDMI',
        precio_costo: 150,
        precio_venta: 250,
        stock_actual: 30,
        stock_minimo: 10,
        categoria_id: 1,
        proveedor_id: 2,
        activo: true,
        fecha_creacion: new Date('2024-01-01')
    },
    {
        id: 3,
        codigo_barras: '3456789012345',
        nombre: 'Teclado Mecánico Logitech',
        descripcion: 'Teclado mecánico Logitech G Pro, switches táctiles, RGB',
        precio_costo: 80,
        precio_venta: 150,
        stock_actual: 45,
        stock_minimo: 15,
        categoria_id: 2,
        proveedor_id: 3,
        activo: true,
        fecha_creacion: new Date('2024-01-01')
    },
    {
        id: 4,
        codigo_barras: '4567890123456',
        nombre: 'Mouse Inalámbrico',
        descripcion: 'Mouse Logitech MX Master 3S, inalámbrico, recargable',
        precio_costo: 60,
        precio_venta: 120,
        stock_actual: 50,
        stock_minimo: 20,
        categoria_id: 2,
        proveedor_id: 3,
        activo: true,
        fecha_creacion: new Date('2024-01-01')
    },
    {
        id: 5,
        codigo_barras: '5678901234567',
        nombre: 'Café Gourmet 1kg',
        descripcion: 'Café gourmet molido, origen colombiano, 1kg',
        precio_costo: 15,
        precio_venta: 35,
        stock_actual: 80,
        stock_minimo: 20,
        categoria_id: 3,
        proveedor_id: 4,
        activo: true,
        fecha_creacion: new Date('2024-01-01')
    }
];
// ============ VENTAS ============
export let ventas = [
    {
        id: 1,
        empleado_id: 1,
        fecha: new Date('2026-07-14T10:30:00'),
        total_bruto: 370,
        descuento_total: 37,
        total_neto: 333,
        estado: 'completada',
        metodo_pago: 'nomina',
        estado_entrega: 'entregado',
        entregado_por: 2,
        fecha_entrega: new Date('2026-07-14T11:00:00')
    },
    {
        id: 2,
        empleado_id: 3,
        fecha: new Date('2026-07-14T14:15:00'),
        total_bruto: 250,
        descuento_total: 25,
        total_neto: 225,
        estado: 'completada',
        metodo_pago: 'nomina',
        estado_entrega: 'entregado',
        entregado_por: 2,
        fecha_entrega: new Date('2026-07-14T14:45:00')
    },
    {
        id: 3,
        empleado_id: 2,
        fecha: new Date('2026-07-14T16:00:00'),
        total_bruto: 35,
        descuento_total: 3.5,
        total_neto: 31.5,
        estado: 'completada',
        metodo_pago: 'efectivo',
        estado_entrega: 'entregado',
        entregado_por: 2,
        fecha_entrega: new Date('2026-07-14T16:20:00')
    }
];
// ============ DETALLES VENTA ============
export let detallesVenta = [
    {
        id: 1,
        venta_id: 1,
        producto_id: 2,
        cantidad: 1,
        precio_unitario: 250,
        descuento_aplicado: 25,
        subtotal: 225
    },
    {
        id: 2,
        venta_id: 1,
        producto_id: 4,
        cantidad: 1,
        precio_unitario: 120,
        descuento_aplicado: 12,
        subtotal: 108
    },
    {
        id: 3,
        venta_id: 2,
        producto_id: 2,
        cantidad: 1,
        precio_unitario: 250,
        descuento_aplicado: 25,
        subtotal: 225
    },
    {
        id: 4,
        venta_id: 3,
        producto_id: 5,
        cantidad: 1,
        precio_unitario: 35,
        descuento_aplicado: 3.5,
        subtotal: 31.5
    }
];
// ============ SOLICITUDES ENTREGA ============
export let solicitudesEntrega = [
    {
        id: 1,
        venta_id: 1,
        empleado_id: 1,
        producto_id: 2,
        cantidad_solicitada: 1,
        cantidad_entregada: 1,
        estado: 'completada',
        fecha_solicitud: new Date('2026-07-14T10:30:00'),
        fecha_entrega: new Date('2026-07-14T11:00:00'),
        entregado_por: 2,
        observaciones: 'Entrega exitosa, verificación de documento'
    },
    {
        id: 2,
        venta_id: 1,
        empleado_id: 1,
        producto_id: 4,
        cantidad_solicitada: 1,
        cantidad_entregada: 1,
        estado: 'completada',
        fecha_solicitud: new Date('2026-07-14T10:30:00'),
        fecha_entrega: new Date('2026-07-14T11:00:00'),
        entregado_por: 2,
        observaciones: 'Entrega exitosa, verificación de documento'
    },
    {
        id: 3,
        venta_id: 2,
        empleado_id: 3,
        producto_id: 2,
        cantidad_solicitada: 1,
        cantidad_entregada: 1,
        estado: 'completada',
        fecha_solicitud: new Date('2026-07-14T14:15:00'),
        fecha_entrega: new Date('2026-07-14T14:45:00'),
        entregado_por: 2,
        observaciones: 'Entrega exitosa'
    }
];
// ============ VERIFICACIONES ENTREGA ============
export let verificacionesEntrega = [
    {
        id: 1,
        solicitud_id: 1,
        empleado_verificado_id: 1,
        guardia_id: 2,
        metodo_verificacion: 'documento_fisico',
        estado_verificacion: 'exitosa',
        fecha_verificacion: new Date('2026-07-14T11:00:00'),
        observaciones: 'Documento de identidad verificado, coincide con la foto'
    },
    {
        id: 2,
        solicitud_id: 2,
        empleado_verificado_id: 1,
        guardia_id: 2,
        metodo_verificacion: 'documento_fisico',
        estado_verificacion: 'exitosa',
        fecha_verificacion: new Date('2026-07-14T11:00:00'),
        observaciones: 'Documento de identidad verificado, coincide con la foto'
    },
    {
        id: 3,
        solicitud_id: 3,
        empleado_verificado_id: 3,
        guardia_id: 2,
        metodo_verificacion: 'validacion_manual',
        estado_verificacion: 'exitosa',
        fecha_verificacion: new Date('2026-07-14T14:45:00'),
        observaciones: 'Verificación manual, empleado reconocido'
    }
];
// ============ FUNCIONES AUXILIARES PARA MANEJAR IDs ============
let nextUsuarioId = usuarios.length + 1;
let nextEmpleadoId = empleados.length + 1;
let nextProductoId = productos.length + 1;
let nextVentaId = ventas.length + 1;
let nextDetalleVentaId = detallesVenta.length + 1;
let nextSolicitudId = solicitudesEntrega.length + 1;
let nextVerificacionId = verificacionesEntrega.length + 1;
export function getNextId(tabla) {
    const map = {
        usuario: () => nextUsuarioId++,
        empleado: () => nextEmpleadoId++,
        producto: () => nextProductoId++,
        venta: () => nextVentaId++,
        detalle: () => nextDetalleVentaId++,
        solicitud: () => nextSolicitudId++,
        verificacion: () => nextVerificacionId++
    };
    return map[tabla]();
}
// ============ EXPORTAR DATOS ============
export const db = {
    usuarios,
    empleados,
    productos,
    roles,
    ventas,
    detallesVenta,
    solicitudesEntrega,
    verificacionesEntrega,
    getNextId
};
