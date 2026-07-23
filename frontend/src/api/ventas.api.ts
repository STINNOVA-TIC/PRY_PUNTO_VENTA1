import api from './auth.api';
import { Venta, CreateVentaRequest } from '../types';

export const ventasAPI = {
  getAll: async (): Promise<{ data: Venta[] }> => {
    const response = await api.get('/ventas');
    return response.data;
  },

  create: async (data: CreateVentaRequest): Promise<{ data: any }> => {
    const response = await api.post('/ventas', data);
    return response.data;
  },
};
