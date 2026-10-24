import { API_URL } from '../utils/orders';

// Mensajes legibles para los errores de validación (422) que devuelve FastAPI como lista
const FIELD_MESSAGES = {
  name: 'El nombre debe tener entre 2 y 100 caracteres',
  email: 'El correo electrónico no es válido',
  password: 'La contraseña debe tener entre 8 y 72 caracteres',
  phone: 'El teléfono es demasiado largo',
  address: 'La dirección es demasiado larga',
};

export function getErrorMessage(detail, fallback = 'Error en la petición') {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const field = detail[0].loc?.[detail[0].loc.length - 1];
    return FIELD_MESSAGES[field] || 'Revisa los datos ingresados';
  }
  return fallback;
}

// Wrapper básico de fetch para inyectar automáticamente el Bearer Token
export async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(getErrorMessage(errorData.detail));
  }

  return response.json();
}
