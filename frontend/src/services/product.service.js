import { fetchWithAuth } from './api';

export const productService = {
  // Catálogo público (solo productos activos)
  async getAllProducts() {
    return fetchWithAuth('/api/products');
  },

  // Panel admin: incluye los desactivados
  async getManagedProducts() {
    return fetchWithAuth('/api/products/manage');
  },

  async createProduct(product) {
    return fetchWithAuth('/api/products', { method: 'POST', body: JSON.stringify(product) });
  },

  async updateProduct(id, product) {
    return fetchWithAuth(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(product) });
  },

  // Borrado lógico: el producto sale del catálogo pero se conserva en los pedidos históricos
  async deactivateProduct(id) {
    return fetchWithAuth(`/api/products/${id}`, { method: 'DELETE' });
  },
};
