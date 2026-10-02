export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Estados del backend (models.OrderStatus) traducidos para el cliente
export const ORDER_STEPS = [
  { status: 'pendiente', label: 'Recibido',  desc: 'La tienda recibió tu pedido',        icon: '📝' },
  { status: 'preparado', label: 'Preparado', desc: 'Empacamos tus productos frescos',     icon: '🧺' },
  { status: 'asignado',  label: 'En camino', desc: 'Un domiciliario va hacia tu casa',    icon: '🛵' },
  { status: 'entregado', label: 'Entregado', desc: 'Tu pedido llegó. ¡Buen provecho!',    icon: '🏠' },
];

export const DELIVERY_MINUTES = 45;

export function stepIndex(status) {
  return Math.max(0, ORDER_STEPS.findIndex(s => s.status === status));
}

export function formatPrice(n) {
  return '$' + Math.round(n).toLocaleString('es-CO');
}

export function formatOrderId(id) {
  return '#' + String(id).padStart(5, '0');
}

// El backend guarda la fecha en UTC sin zona horaria
export function parseServerDate(value) {
  return new Date(/(Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + 'Z');
}

export async function fetchOrder(id) {
  const res = await fetch(`${API_URL}/api/orders/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('No pudimos consultar el pedido');
  return res.json();
}

export async function fetchOrders() {
  const res = await fetch(`${API_URL}/api/orders`);
  if (!res.ok) throw new Error('No pudimos cargar los pedidos');
  return res.json();
}

// Devuelve el pedido actualizado; si el backend lo rechaza lanza un error con su status HTTP
export async function updateOrderStatus(id, status) {
  const res = await fetch(`${API_URL}/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(typeof data.detail === 'string' ? data.detail : 'No pudimos actualizar el pedido');
    error.status = res.status;
    throw error;
  }
  return data;
}

/*
 * Mientras no exista el login, los pedidos del cliente se recuerdan en este
 * navegador. Guardamos el recibo (productos, pago, contacto) porque el backend
 * aún no almacena esos datos. Nunca se guarda información de la tarjeta.
 */
const STORAGE_KEY = 'aura_orders';
const MAX_SAVED = 20;

export function getSavedOrders() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function getSavedOrder(id) {
  return getSavedOrders().find(o => String(o.id) === String(id)) || null;
}

export function saveOrder(receipt) {
  try {
    const rest = getSavedOrders().filter(o => o.id !== receipt.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([receipt, ...rest].slice(0, MAX_SAVED)));
  } catch {
    // Sin almacenamiento disponible (modo privado): el seguimiento sigue funcionando por URL
  }
}
