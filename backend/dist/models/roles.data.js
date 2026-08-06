"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesData = void 0;
// backend/src/models/roles.data.ts
const permisos_1 = require("../types/permisos");
exports.rolesData = [
    {
        id: 1,
        nombre: 'admin',
        descripcion: 'Administrador del sistema con acceso total',
        permisos: permisos_1.GruposPermisos.ADMIN,
        nivel: 100
    },
    {
        id: 2,
        nombre: 'guardia',
        descripcion: 'Encargado de entregas y verificación de empleados',
        permisos: permisos_1.GruposPermisos.GUARDIA,
        nivel: 40
    },
    {
        id: 3,
        nombre: 'empleado',
        descripcion: 'Empleado que puede realizar compras con descuento de nómina',
        permisos: permisos_1.GruposPermisos.EMPLEADO,
        nivel: 20
    },
    {
        id: 4,
        nombre: 'inventario',
        descripcion: 'Encargado de gestión de inventario y productos',
        permisos: permisos_1.GruposPermisos.INVENTARIO,
        nivel: 60
    },
    {
        id: 5,
        nombre: 'gerente',
        descripcion: 'Gerente con acceso a reportes financieros y gestión de equipos',
        permisos: [
            ...permisos_1.GruposPermisos.ADMIN.filter(p => !p.startsWith('configuracion.') &&
                !p.startsWith('usuarios.') &&
                !p.startsWith('roles.')),
            'usuarios.ver',
            'reportes.ver_financieros',
            'nomina.ver_todos',
            'nomina.aplicar_descuento'
        ],
        nivel: 80
    },
    {
        id: 6,
        nombre: 'contador',
        descripcion: 'Acceso a reportes financieros y nómina',
        permisos: [
            'reportes.ver',
            'reportes.ver_financieros',
            'reportes.exportar',
            'nomina.ver',
            'nomina.ver_todos',
            'ventas.ver',
            'empleados.ver',
            'empleados.ver_datos_sensibles'
        ],
        nivel: 70
    },
    {
        id: 7,
        nombre: 'tthh',
        descripcion: 'Talento Humano: Gestión de devoluciones, nómina y consumo de empleados',
        permisos: permisos_1.GruposPermisos.TTHH,
        nivel: 50
    },
    {
        id: 8,
        nombre: 'empleado_autorizado',
        descripcion: 'Empleado autorizado para realizar autoconsumos para la empresa',
        permisos: [
            ...permisos_1.GruposPermisos.EMPLEADO,
            'autoconsumo.crear'
        ],
        nivel: 25
    },
    {
        id: 9,
        nombre: 'empleado_autorizado_firmar',
        descripcion: 'Colaborador autorizado para firmar requerimientos',
        permisos: [
            ...permisos_1.GruposPermisos.EMPLEADO
        ],
        nivel: 26
    }
];
