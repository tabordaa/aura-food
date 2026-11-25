import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '../../components/Navbar';
import ProductCard from '../../components/ProductCard';
import CartDrawer from '../../components/CartDrawer';
import CheckoutModal from '../../components/CheckoutModal';
import ActiveOrderBanner from '../../components/ActiveOrderBanner';
import CatalogHero from './CatalogHero';
import ProductSkeletonGrid from './ProductSkeletonGrid';
import SlidingTabs from './SlidingTabs';
import { isActiveOrder } from '../../utils/orders';
import { CATEGORIES } from '../../utils/categories';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { productService } from '../../services/product.service';
import { orderService } from '../../services/order.service';
import { configService } from '../../services/config.service';
import styles from './Catalog.module.css';

const FILTERS = ['Todos', 'Más vendidos', 'Ofertas del día', 'Orgánicos'];
const CATEGORY_TABS = CATEGORIES.map(cat => ({ value: cat.id, label: cat.label, icon: cat.icon }));
const FILTER_TABS = FILTERS.map(f => ({ value: f, label: f }));

const isOnSale = (p) => p.old_price != null && p.old_price > p.price;
// Sin tildes ni mayúsculas: "organico" encuentra "Orgánico"
const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const isOrganic = (p) => normalize([p.tag, p.origin, p.name].filter(Boolean).join(' ')).includes('organic');

export default function CatalogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('frutas');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [latestOrderId, setLatestOrderId] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [catalogState, setCatalogState] = useState('loading'); // loading | ready | error
  const [notice, setNotice] = useState('');
  // Lo define el backend; null mientras carga
  const [deliveryFee, setDeliveryFee] = useState(null);

  const { cart, qtyOf, addToCart: addEntry, changeQty, removeFromCart, clearCart } = useCart(user?.id, dbProducts);

  // Los más vendidos llegan primero; cada filtro decide luego el orden
  const loadProducts = useCallback(() => productService.getAllProducts('best_sellers')
    .then(data => { setDbProducts(data); setCatalogState('ready'); })
    .catch(() => setCatalogState('error')), []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const retryCatalog = () => { setCatalogState('loading'); loadProducts(); };

  useEffect(() => {
    configService.getConfig()
      .then(config => setDeliveryFee(config.delivery_fee))
      .catch(() => {});
  }, []);

  // Muestra el aviso de seguimiento si el cliente tiene un pedido en curso
  useEffect(() => {
    orderService.getMyOrders(5)
      .then(orders => {
        const active = orders.find(o => isActiveOrder(o.status));
        if (active) setLatestOrderId(active.id);
      })
      .catch(() => {});
  }, []);

  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const deliveryCost = cartSubtotal > 0 ? deliveryFee : 0;
  const cartTotal = cartSubtotal + (deliveryCost || 0);

  // Elige el producto en oferta con mayor % de descuento (priorizando los disponibles)
  const dealProduct = useMemo(() => {
    const onSale = dbProducts.filter(isOnSale);
    if (onSale.length === 0) return null;
    const pool = onSale.filter(p => p.stock > 0);
    const candidates = pool.length > 0 ? pool : onSale;
    return candidates.reduce((best, current) => {
      const bestPct = (best.old_price - best.price) / best.old_price;
      const curPct = (current.old_price - current.price) / current.old_price;
      return curPct > bestPct ? current : best;
    }, candidates[0]);
  }, [dbProducts]);

  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);

  const toggleFav = (id) => setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);

  const addToCart = (product) => {
    if (!addEntry(product)) setNotice(`No hay más unidades disponibles de ${product.name}`);
  };

  const handleSelectCategory = (categoryId) => {
    setActiveCategory(categoryId);
    setActiveFilter('Todos');
  };

  // Al buscar se recorre todo el catálogo, no solo la categoría abierta
  const term = normalize(search.trim());
  const filtered = dbProducts.filter(p => {
    const matchCategory = term ? true : p.category === activeCategory;
    const matchSearch   = !term || normalize([p.name, p.tag, p.origin].filter(Boolean).join(' ')).includes(term);
    const matchFilter   = activeFilter === 'Todos' ? true
      : activeFilter === 'Más vendidos' ? p.units_sold > 0
      : activeFilter === 'Ofertas del día' ? isOnSale(p)
      : activeFilter === 'Orgánicos' ? isOrganic(p)
      : true;
    return matchCategory && matchSearch && matchFilter;
  });
  // La API los entrega por unidades vendidas; fuera de "Más vendidos" se conserva el orden de siempre
  if (activeFilter !== 'Más vendidos') filtered.sort((a, b) => a.id - b.id);

  const activeCategoryLabel = term
    ? `Resultados para "${search.trim()}"`
    : CATEGORIES.find(c => c.id === activeCategory)?.label ?? '';

  const gridAnimKey = `${activeCategory}-${activeFilter}-${term}`;

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
          {/* Sidebar / chips de categoría */}
          <aside className={styles['sidebar']}>
            <p className={styles['sidebar-title']}>Categorías</p>
            <SlidingTabs
              items={CATEGORY_TABS}
              activeValue={activeCategory}
              onSelect={handleSelectCategory}
              containerClassName={styles['sidebar-list']}
              pillClassName={styles['sidebar-pill']}
              itemClassName={styles['sidebar-item']}
              activeItemClassName={styles.active}
              ariaLabel="Categorías de productos"
              renderItem={(cat) => (
                <>
                  <span className={styles['cat-icon']}>{cat.icon}</span>
                  <span>{cat.label}</span>
                </>
              )}
            />
          </aside>

          {/* Main */}
          <main className={styles['catalog-main']}>
            {latestOrderId && <ActiveOrderBanner orderId={latestOrderId} />}

            {/* Hero con saludo personalizado y oferta del día */}
            <CatalogHero
              dealProduct={dealProduct}
              loading={catalogState === 'loading'}
              inCart={dealProduct ? qtyOf(dealProduct.id) : 0}
              addToCart={addToCart}
              changeQty={changeQty}
            />

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
              <div className={styles['filter-tabs-scroll']}>
                <SlidingTabs
                  items={FILTER_TABS}
                  activeValue={activeFilter}
                  onSelect={setActiveFilter}
                  containerClassName={styles['filter-tabs']}
                  pillClassName={styles['filter-pill']}
                  itemClassName={styles['tab-btn']}
                  activeItemClassName={styles.active}
                  ariaLabel="Filtros del catálogo"
                />
              </div>
            </div>

            {/* Product Grid */}
            {catalogState === 'loading' ? (
              <ProductSkeletonGrid />
            ) : catalogState === 'error' ? (
              <div className={styles['catalog-state']} role="alert">
                <span className={styles['state-icon']} aria-hidden="true">📡</span>
                <p>No pudimos cargar el catálogo. Revisa tu conexión e intenta de nuevo.</p>
                <button type="button" className={styles['btn-secondary']} onClick={retryCatalog}>Reintentar</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles['catalog-state']}>
                {term ? (
                  <>
                    <span className={styles['state-icon-lg']} aria-hidden="true">🔍</span>
                    <p className={styles['state-title']}>{`No encontramos "${search.trim()}"`}</p>
                    <p className={styles['state-copy']}>
                      Prueba con otra palabra o explora nuestras categorías frescas.
                    </p>
                    <button
                      type="button"
                      className={styles['btn-secondary']}
                      onClick={() => { setSearch(''); setActiveFilter('Todos'); }}
                    >
                      Limpiar búsqueda
                    </button>
                  </>
                ) : (
                  <>
                    <span className={styles['state-icon-lg']} aria-hidden="true">🥬</span>
                    <p className={styles['state-title']}>
                      {activeFilter === 'Todos'
                        ? 'Pronto tendremos productos aquí'
                        : 'Sin coincidencias en este filtro'}
                    </p>
                    <p className={styles['state-copy']}>
                      {activeFilter === 'Todos'
                        ? 'Estamos preparando cosecha fresca para esta categoría.'
                        : 'Ningún producto de esta categoría coincide con el filtro elegido.'}
                    </p>
                    {activeFilter !== 'Todos' && (
                      <button
                        type="button"
                        className={styles['btn-secondary']}
                        onClick={() => setActiveFilter('Todos')}
                      >
                        Ver todos los productos
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div key={gridAnimKey} className={styles['product-grid']}>
                {filtered.map((product, index) => (
                  <div
                    key={product.id}
                    className={styles['card-stagger']}
                    style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
                  >
                    <ProductCard
                      product={product}
                      inCart={qtyOf(product.id)}
                      favorites={favorites}
                      toggleFav={toggleFav}
                      addToCart={addToCart}
                      changeQty={changeQty}
                    />
                  </div>
                ))}
              </div>
            )}
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
        notice={notice}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={closeCheckout}
        cart={cart}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
        deliveryCost={deliveryCost}
        cartTotal={cartTotal}
        clearCart={clearCart}
        onOrderPlaced={(receipt) => { setLatestOrderId(receipt.id); loadProducts(); }}
      />
    </>
  );
}
