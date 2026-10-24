import { fetchWithAuth } from './api';

export const orderService = {
  async createOrder(orderData) {
    return fetchWithAuth('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  // Devuelve null si el pedido no existe (o no pertenece al usuario)
  async getOrder(id) {
    try {
      return await fetchWithAuth(`/api/orders/${id}`);
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  // Solo para admin y domiciliario
  async getOrders(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return fetchWithAuth(`/api/orders${query}`);
  },

  async updateStatus(id, status) {
    return fetchWithAuth(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
