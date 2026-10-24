// Formatos compartidos por todas las pantallas

export function formatPrice(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

export function formatOrderId(id) {
  return '#' + String(id).padStart(5, '0');
}

// Las fechas antiguas del backend llegaban en UTC sin zona horaria; las nuevas ya traen la zona
export function parseServerDate(value) {
  return new Date(/(Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + 'Z');
}
