import api from './auth.api';

export const MAX_DOCUMENTOS_ORDEN = 6;
export const MAX_TAMANO_DOCUMENTO_MB = 10;
// export const TIPOS_DOCUMENTO_ORDEN = [
//   {value: 'FACTURA', label: 'Factura'},
//   {value: 'GUIA_REMISION', label: 'Guía de Remisión'},
//   {value: 'COTIZACION', label: 'Cotización'},
//   {value: 'PROFORMA', label: 'Proforma'},
//   {value: 'ACTA_RECEPCION', label: 'Acta de Recepción'},
//   {value: 'OTRO', label: 'Otro'},
// ];

export interface DocumentoOrden {
  id: number;
  tipo: string;
  nombre_original: string;
  tamano_bytes: number;
  fecha: string; // 'YYYY-MM-DD HH:mm:ss'
  usuario_nombre: string | null;
}

export const ordenesAPI = {
  crear: async (data: any) => {
    const response = await api.post('/ordenes-compra', data);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/ordenes-compra');
    return response.data;
  },

  getById: async (id: number | string) => {
    const response = await api.get(`/ordenes-compra/${id}`);
    return response.data;
  },

  getSiguienteSecuencial: async (departamento_id: number, empresa_id: number) => {
    const response = await api.get(`/ordenes-compra/secuencial/siguiente?departamento_id=${departamento_id}&empresa_id=${empresa_id}`);
    return response.data;
  },

  entregar: async (id: number | string, recepciones: Array<{ detalle_id: number; cantidad: number; factura_codigo: string }>) => {
    const response = await api.put(`/ordenes-compra/${id}/entregar`, { recepciones });
    return response.data;
  },

  eliminar: async (id: number | string) => {
    const response = await api.delete(`/ordenes-compra/${id}`);
    return response.data;
  },

  firmar: async (id: number | string) => {
    const response = await api.put(`/ordenes-compra/${id}/firmar`);
    return response.data;
  },

  update: async (id: number | string, data: any) => {
    const response = await api.put(`/ordenes-compra/${id}`, data);
    return response.data;
  },
  getConteoDocumentos: async (): Promise<{ success: boolean; data: Record<string, number> }> => {
    const response = await api.get('/ordenes-compra/documentos/conteo');
    return response.data;
  },
  getDocumentos: async (id: number | string): Promise<{ success: boolean; data: DocumentoOrden[] }> => {
    const response = await api.get(`/ordenes-compra/${id}/documentos`);
    return response.data;
  },
  subirDocumento: async (id: number | string, archivo: File, tipo: string) => {
    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('documento', archivo);
    const response = await api.post(`/ordenes-compra/${id}/documentos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  //descargar el token de sesion pdf
   verDocumento: async (id: number | string, docId: number): Promise<Blob> => {
    const response = await api.get(`/ordenes-compra/${id}/documentos/${docId}/archivo`, { responseType: 'blob' });
    return new Blob([response.data], { type: 'application/pdf' });
  },
  eliminarDocumento: async (id: number | string, docId: number) => {
    const response = await api.delete(`/ordenes-compra/${id}/documentos/${docId}`);
    return response.data;
  }
};

