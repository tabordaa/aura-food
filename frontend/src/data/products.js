// Catálogo de productos (temporal hasta que exista un endpoint de productos).
// Los ids deben coincidir con los productos de la base de datos.
export const PRODUCTS = [
  { id: 1, emoji: '🥑', name: 'Aguacate Hass Maduro',       unit: 'x 500g',   price: 4500,  oldPrice: null,  tag: 'Fresco',        origin: '🌿 Cosecha Nacional',      category: 'frutas'   },
  { id: 2, emoji: '🍎', name: 'Manzanas Rojas Frescas',     unit: 'x 1 kg',   price: 5200,  oldPrice: null,  tag: 'Popular',       origin: '✈️ Importada Premium',     category: 'frutas'   },
  { id: 3, emoji: '🥛', name: 'Leche Entera Orgánica',      unit: 'x 1000ml', price: 3800,  oldPrice: null,  tag: 'Orgánico',      origin: '🔬 100% Pasteurizada',     category: 'dairy'    },
  { id: 4, emoji: '🥦', name: 'Brócoli Fresco Criollo',     unit: 'x 500g',   price: 2900,  oldPrice: 3600,  tag: '-20% Hoy',      origin: '🌱 Huerta Directa',        category: 'frutas'   },
  { id: 5, emoji: '🍗', name: 'Pechuga de Pollo Campero',   unit: 'x 800g',   price: 12400, oldPrice: null,  tag: 'Popular',       origin: '🌿 Libre de Antibióticos', category: 'meat'     },
  { id: 6, emoji: '🥐', name: 'Croissant de Mantequilla',   unit: 'x 4 uds',  price: 6500,  oldPrice: null,  tag: 'Horneado Hoy',  origin: '🏠 Masa Madre 24h',        category: 'bakery'   },
  { id: 7, emoji: '🍅', name: 'Tomate Chonto Seleccionado', unit: 'x 1 kg',   price: 3400,  oldPrice: null,  tag: 'Fresco',        origin: '⭐ Calidad Superior',       category: 'frutas'   },
  { id: 8, emoji: '🧴', name: 'Detergente Ecológico',       unit: 'x 1.5 L',  price: 14900, oldPrice: null,  tag: 'Biodegradable', origin: '🌿 Aroma Eucalipto',       category: 'cleaning' },
];

export const PRODUCTS_BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
