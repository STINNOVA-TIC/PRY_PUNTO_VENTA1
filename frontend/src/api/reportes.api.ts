import api from './auth.api';

export const reportesAPI = {
  getConsumoEmpleados: async (fechaInicio?: string, fechaFin?: string): Promise<{ data: any[] }> => {
    const params = fechaInicio && fechaFin ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin } : {};
    const response = await api.get('/reportes/consumo-empleados', { params });
    return response.data;
  },

  getTransaccionesDetalladas: async (fechaInicio?: string, fechaFin?: string): Promise<{ data: any[] }> => {
    const params = fechaInicio && fechaFin ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin } : {};
    const response = await api.get('/reportes/transacciones', { params });
    return response.data;
  }
};
