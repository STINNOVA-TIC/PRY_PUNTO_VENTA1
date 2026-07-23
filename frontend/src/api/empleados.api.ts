import api from './auth.api';
import { Empleado } from '../types';

export const empleadosAPI = {
  getAll: async (): Promise<{ data: Empleado[] }> => {
    const response = await api.get('/empleados');
    return response.data;
  },

  getById: async (id: number): Promise<{ data: Empleado }> => {
    const response = await api.get(`/empleados/${id}`);
    return response.data;
  },

  getHistorial: async (id: number) => {
    const response = await api.get(`/empleados/${id}/historial`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/empleados', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put(`/empleados/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/empleados/${id}`);
    return response.data;
  },

  getDepartamentos: async (): Promise<{ data: { id: number; nombre: string }[] }> => {
    const response = await api.get('/empleados/departamentos');
    return response.data;
  },

  getCentrosCostos: async (): Promise<{ data: { id: number; nombre: string }[] }> => {
    const response = await api.get('/empleados/centros-costos');
    return response.data;
  }
};
