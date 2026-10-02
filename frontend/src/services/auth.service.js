import { fetchWithAuth } from './api';
import { API_URL } from '../utils/orders';

export const authService = {
  async login(email, password) {
    // FastAPI OAuth2 espera x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Error al iniciar sesión');
    }

    return response.json(); // { access_token, token_type }
  },

  async register(userData) {
    return fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async getMe() {
    return fetchWithAuth('/api/auth/me');
  }
};
