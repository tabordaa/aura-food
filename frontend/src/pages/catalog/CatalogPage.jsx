import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconTruck, IconBolt, IconCheck } from '../../components/Icons';
import Navbar from '../../components/Navbar';
import ProductCard from '../../components/ProductCard';
import CartDrawer from '../../components/CartDrawer';
import styles from './Catalog.module.css';

const CATEGORIES = [
  { id: 'frutas',   label: 'Frutas y Verduras', icon: '🥦' },
  { id: 'dairy',    label: 'Lácteos',            icon: '🥛' },
  { id: 'meat',     label: 'Carnes',             icon: '🥩' },
  { id: 'cleaning', label: 'Aseo del Hogar',     icon: '🧴' },
  { id: 'bakery',   label: 'Panadería',          icon: '🥐' },
];

const PRODUCTS = [
  { id: 1, emoji: '🥑', name: 'Aguacate Hass Maduro',       unit: 'x 500g',   price: 4500,  oldPrice: null,  tag: 'Fresco',        origin: '🌿 Cosecha Nacional',      category: 'frutas'   },
  { id: 2, emoji: '🍎', name: 'Manzanas Rojas Frescas',     unit: 'x 1 kg',   price: 5200,  oldPrice: null,  tag: 'Popular',       origin: '✈️ Importada Premium',     category: 'frutas'   },
  { id: 3, emoji: '🥛', name: 'Leche Entera Orgánica',      unit: 'x 1000ml', price: 3800,  oldPrice: null,  tag: 'Orgánico',      origin: '🔬 100% Pasteurizada',     category: 'dairy'    },
  { id: 4, emoji: '🥦', name: 'Brócoli Fresco Criollo',     unit: 'x 500g',   price: 2900,  oldPrice: 3600,  tag: '-20% Hoy',      origin: '🌱 Huerta Directa',        category: 'frutas'   },
  { id: 5, emoji: '🍗', name: 'Pechuga de Pollo Campero',   unit: 'x 800g',   price: 12400, oldPrice: null,  tag: 'Popular',       origin: '🌿 Libre de Antibióticos', category: 'meat'     },
  { id: 6, emoji: '🥐', name: 'Croissant de Mantequilla',   unit: 'x 4 uds',  price: 6500,  oldPrice: null,  tag: 'Horneado Hoy',  origin: '🏠 Masa Madre 24h',        category: 'bakery'   },
  { id: 7, emoji: '🍅', name: 'Tomate Chonto Seleccionado', unit: 'x 1 kg',   price: 3400,  oldPrice: null,  tag: 'Fresco',        origin: '⭐ Calidad Superior',       category: 'frutas'   },
  { id: 8, emoji: '🧴', name: 'Detergente Ecológico',       unit: 'x 1.5 L',  price: 14900, oldPrice: null,  tag: 'Biodegradable', origin: '🌿 Aroma Eucalipto',       category: 'cleaning' },
];

const FILTERS = ['Todos', 'Más vendidos', 'Ofertas del día', 'Orgánicos'];

export default function CatalogPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('frutas');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const deliveryCost = cartSubtotal > 0 ? 5000 : 0;
  const cartTotal = cartSubtotal + deliveryCost;

  const toggleFav = (id) => setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);

  const addToCart = (product) => {
    setCart(c => {
      const existing = c.find(x => x.id === product.id);
      if (existing) return c.map(x => x.id === product.id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart(c => c.filter(x => x.id !== id));

  const changeQty = (id, delta) => {
    setCart(c => c
      .map(x => x.id === id ? { ...x, qty: x.qty + delta } : x)
      .filter(x => x.qty > 0)
    );
  };

  const filtered = PRODUCTS.filter(p => {
    const matchCategory = p.category === activeCategory;
    const matchSearch   = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter   = activeFilter === 'Todos' ? true
      : activeFilter === 'Ofertas del día' ? p.oldPrice !== null
      : activeFilter === 'Orgánicos' ? p.tag === 'Orgánico'
      : true;
    return matchCategory && matchSearch && matchFilter;
  });

  const activeCategoryLabel = CATEGORIES.find(c => c.id === activeCategory)?.label ?? '';

  return (
    <>
      <div className={styles['catalog-page']}>
        
        <Navbar 
          search={search} 
          setSearch={setSearch} 
          cartCount={cartCount} 
          setCartOpen={setCartOpen} 
          navigate={navigate} 
        />

        <div className={styles['catalog-body']}>
          {/* Sidebar */}
          <aside className={styles['sidebar']}>
            <p className={styles['sidebar-title']}>Categorías</p>
            {CATEGORIES.map(cat => (
              <div key={cat.id} className={[styles['sidebar-item'], activeCategory === cat.id ? styles.active : ''].join(' ')}
                onClick={() => { setActiveCategory(cat.id); setActiveFilter('Todos'); }}
                role="button"
              >
                <span className={styles['cat-icon']}>{cat.icon}</span>
                {cat.label}
              </div>
            ))}
          </aside>

          {/* Main */}
          <main className={styles['catalog-main']}>
            {/* Welcome Banner */}
            <div className={styles['welcome-banner']}>
              <div className={styles['banner-left']}>
                <div className={styles['banner-badge']}><IconTruck size={13} /> Envío gratis en órdenes hoy</div>
                <h1>¡Hola, María!<br />¿Qué necesitas hoy?</h1>
                <p>Encuentra tus alimentos frescos directamente del campo a tu mesa en minutos. Cosecha del día garantizada.</p>
                <div className={styles['banner-meta']}>
                  <span><IconCheck size={13} /> 100% Calidad local</span>
                  <span><IconBolt size={13} /> Entrega express 45 min</span>
                </div>
              </div>
              <div className={styles['banner-right']}>🥦🍅<br />🥑🍞</div>
            </div>

            {/* Section header */}
            <div className={styles['section-header']}>
              <div>
                <div className={styles['section-meta']}>
                  <div className={styles['section-dot']} />
                  <span>Catálogo Selección</span>
                </div>
                <h2>{activeCategoryLabel}</h2>
                <p className={styles['section-sub']}>{filtered.length} producto{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}</p>
              </div>
              <div className={styles['filter-tabs']}>
                {FILTERS.map(f => (
                  <button key={f} className={[styles['tab-btn'], activeFilter === f ? styles.active : ''].join(' ')} onClick={() => setActiveFilter(f)}>{f}</button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className={styles['product-grid']}>
              {filtered.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  favorites={favorites} 
                  toggleFav={toggleFav} 
                  addToCart={addToCart} 
                />
              ))}
            </div>

            {/* CTA Banner */}
            <div className={styles['cta-banner']}>
              <div className={styles['cta-banner-left']}>
                <div className={styles['cta-icon']}>🛒</div>
                <div>
                  <h4>¿No encuentras lo que buscas?</h4>
                  <p>Nuestro equipo de compradores personales puede buscar productos específicos para ti.</p>
                </div>
              </div>
              <button className={styles['btn-secondary']}>Solicitar producto especial</button>
            </div>
          </main>
        </div>
      </div>

      <CartDrawer 
        cartOpen={cartOpen} 
        setCartOpen={setCartOpen} 
        cart={cart} 
        cartCount={cartCount} 
        cartSubtotal={cartSubtotal} 
        deliveryCost={deliveryCost} 
        cartTotal={cartTotal} 
        changeQty={changeQty} 
        removeFromCart={removeFromCart} 
      />
    </>
  );
}
