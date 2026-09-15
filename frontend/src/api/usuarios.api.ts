import api from './auth.api';

export interface UsuarioOperador {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  requiere_cambio_password?: boolean;
  empleado: {
    id: number;
    nombre: string;
  } | null;
  rol: {
    id: number;
    nombre: string;
  } | null;
  roles?: {
    id: number;
    nombre: string;
  }[];
}

export interface PermisoItemUsuario {
  id: number;
  clave: string;
  nombre: string;
  descripcion: string;
  modulo_id: number;
  modulo_nombre: string;
  heredado_rol: boolean;
  personalizado: 'conceder' | 'denegar' | null;
  activo: boolean;
}

export const usuariosAPI = {
  getAll: async (): Promise<{ data: UsuarioOperador[] }> => {
    const response = await api.get('/usuarios');
    return response.data;
  },

  getUserPermissions: async (usuarioId: number): Promise<{ data: PermisoItemUsuario[] }> => {
    const response = await api.get(`/usuarios/${usuarioId}/permisos`);
    return response.data;
  },

  saveUserPermissions: async (usuarioId: number, cambios: { permiso_id: number; activo: boolean }[]) => {
    const response = await api.post(`/usuarios/${usuarioId}/permisos`, { cambios });
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
  },

  requirePasswordChange: async (id: number) => {
    const response = await api.patch(`/usuarios/${id}/requerir-cambio-password`);
    return response.data;
  }
};
