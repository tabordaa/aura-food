import { fetchWithAuth } from './api';

export const orderService = {
  async createOrder(orderData) {
    return fetchWithAuth('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  async getOrder(id) {
    return fetchWithAuth(`/api/orders/${id}`);
  }
};
