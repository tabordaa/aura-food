import { fetchWithAuth } from './api';

export const productService = {
  async getAllProducts() {
    return fetchWithAuth('/api/products');
  }
};
