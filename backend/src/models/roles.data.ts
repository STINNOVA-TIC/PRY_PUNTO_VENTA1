// backend/src/models/roles.data.ts
import { Permiso, GruposPermisos } from '../types/permisos';

export interface IRol {
  id: number;
  nombre: 'admin' | 'guardia' | 'empleado' | 'inventario' | 'contador' | 'gerente' | 'tthh';
  descripcion: string;
  permisos: Permiso[];
  nivel: number; // Para jerarquía (mayor = más permisos)
}

export const rolesData: IRol[] = [
  {
    id: 1,
    nombre: 'admin',
    descripcion: 'Administrador del sistema con acceso total',
    permisos: GruposPermisos.ADMIN,
    nivel: 100
  },
  {
    id: 2,
    nombre: 'guardia',
    descripcion: 'Encargado de entregas y verificación de empleados',
    permisos: GruposPermisos.GUARDIA,
    nivel: 40
  },
  {
    id: 3,
    nombre: 'empleado',
    descripcion: 'Empleado que puede realizar compras con descuento de nómina',
    permisos: GruposPermisos.EMPLEADO,
    nivel: 20
  },
  {
    id: 4,
    nombre: 'inventario',
    descripcion: 'Encargado de gestión de inventario y productos',
    permisos: GruposPermisos.INVENTARIO,
    nivel: 60
  },
  {
    id: 5,
    nombre: 'gerente',
    descripcion: 'Gerente con acceso a reportes financieros y gestión de equipos',
    permisos: [
      ...GruposPermisos.ADMIN.filter(p => 
        !p.startsWith('configuracion.') && 
        !p.startsWith('usuarios.') &&
        !p.startsWith('roles.')
      ),
      'usuarios.ver',
      'reportes.ver_financieros',
      'nomina.ver_todos',
      'nomina.aplicar_descuento'
    ] as Permiso[],
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
    ] as Permiso[],
    nivel: 70
  },
  {
    id: 7,
    nombre: 'tthh',
    descripcion: 'Talento Humano: Gestión de devoluciones, nómina y consumo de empleados',
    permisos: GruposPermisos.TTHH,
    nivel: 50
  }
];