import api from './auth.api';

export interface RegistroActivoTI {
  id: number;
  acta_numero: number | null;
  responsable_nombre: string | null;
  responsable_cedula: string | null;
  empleado_id: number | null;            // null = la CI no existe como colaborador
  empleado_nombre_sistema: string | null;
  departamento_nombre: string | null;
  material: string | null;
  area_responsable: string | null;
  condicion: string | null;
  existencia: string | null;
  equipo_tipo: string | null;
  total: number | null;
  ingresados: number | null;
  salidos: number | null;
  descripcion: string | null;
  serial_marca: string | null;
  fecha_acta: string | null;             // 'YYYY-MM-DD'
  origen: string;                        // 'EXCEL' | 'MANUAL'
}

export interface ResumenActivosColaborador {
  cedula: string;
  registros: number;
  en_poder: number;
}

export interface ResultadoImportacionActivos {
  insertados: number;
  omitidas: number;
  sin_empleado: number;
  advertencias: string[];
}

export const activosTiAPI = {
  getAll: async (): Promise<{ success: boolean; data: RegistroActivoTI[] }> => {
    const response = await api.get('/activos-ti');
    return response.data;
  },

  getResumenColaboradores: async (): Promise<{ success: boolean; data: ResumenActivosColaborador[] }> => {
    const response = await api.get('/activos-ti/resumen-colaboradores');
    return response.data;
  },

  getPorColaborador: async (cedula: string): Promise<{ success: boolean; data: RegistroActivoTI[] }> => {
    const response = await api.get(`/activos-ti/colaborador/${encodeURIComponent(cedula)}`);
    return response.data;
  },

  importar: async (filas: any[]): Promise<{ success: boolean; data: ResultadoImportacionActivos }> => {
    const response = await api.post('/activos-ti/importar', { filas });
    return response.data;
  },

  crear: async (datos: Record<string, any>): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/activos-ti', datos);
    return response.data;
  },

  actualizar: async (id: number, datos: Record<string, any>): Promise<{ success: boolean; message: string }> => {
    const response = await api.put(`/activos-ti/${id}`, datos);
    return response.data;
  },

  eliminar: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/activos-ti/${id}`);
    return response.data;
  },
};