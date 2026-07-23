import api from './auth.api';

export interface UsuarioOperador {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  empleado: {
    id: number;
    nombre: string;
  } | null;
  rol: {
    id: number;
    nombre: string;
  } | null;
}

export const usuariosAPI = {
  getAll: async (): Promise<{ data: UsuarioOperador[] }> => {
    const response = await api.get('/usuarios');
    return response.data;
  },

  getRoles: async (): Promise<{ data: { id: number; nombre: string; descripcion: string }[] }> => {
    const response = await api.get('/usuarios/roles');
    return response.data;
  },

  create: async (data: {
    nombre: string;
    email: string;
    password?: string;
    rol_id: number;
    empleado_id?: number | null;
    activo: boolean;
  }) => {
    const response = await api.post('/usuarios', data);
    return response.data;
  },

  update: async (id: number, data: {
    nombre: string;
    email: string;
    password?: string;
    rol_id: number;
    empleado_id?: number | null;
    activo: boolean;
  }) => {
    const response = await api.put(`/usuarios/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  }
};
