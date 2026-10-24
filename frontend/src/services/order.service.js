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

  // Pedidos del usuario autenticado, del más reciente al más antiguo
  async getMyOrders(limit = 50) {
    return fetchWithAuth(`/api/orders/me?limit=${limit}`);
  },

  // El cliente cancela su pedido mientras está pendiente (el stock vuelve al inventario)
  async cancelOrder(id) {
    return fetchWithAuth(`/api/orders/${id}/cancel`, { method: 'POST' });
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
