import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../utils/orders';
import { prefersReducedMotion } from '../utils/motion';
import useCountUp from '../hooks/useCountUp';
import styles from '../pages/catalog/Catalog.module.css';

const REMOVE_DELAY_MS = 240;

function CartDrawerContent({
  setCartOpen,
  cart,
  cartCount,
  cartSubtotal,
  deliveryCost,
  cartTotal,
  changeQty,
  removeFromCart,
  notice,
  onCheckout,
}) {
  const [removingIds, setRemovingIds] = useState([]);
  const timersRef = useRef(new Map());
  const animatedTotal = useCountUp(cartTotal, 420);

  // Limpia temporizadores pendientes si el drawer se cierra a mitad de una eliminación
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const scheduleRemoval = (id, onComplete) => {
    if (prefersReducedMotion()) {
      onComplete();
      return;
    }
    if (timersRef.current.has(id)) return;
    setRemovingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      setRemovingIds((prev) => prev.filter((itemId) => itemId !== id));
      onComplete();
    }, REMOVE_DELAY_MS);
    timersRef.current.set(id, timer);
  };

  const handleDecrease = (item) => {
    if (item.qty <= 1) {
      scheduleRemoval(item.id, () => changeQty(item.id, -1));
      return;
    }
    changeQty(item.id, -1);
  };

  return (
    <div className={styles['cart-overlay']} onClick={() => setCartOpen(false)}>
      <div className={styles['cart-drawer']} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles['cart-drawer-header']}>
          <div>
            <h3>Tu carrito</h3>
            <span className={styles['cart-drawer-count']}>
              {cartCount} producto{cartCount !== 1 ? 's' : ''}
            </span>
          </div>
          <button type="button" className={styles['cart-close-btn']} onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">✕</button>
        </div>

        {notice && <p className={styles['cart-notice']} role="status">{notice}</p>}

        {/* Items */}
        <div className={styles['cart-drawer-items']}>
          {cart.length === 0 ? (
            <div className={styles['cart-empty']}>
              <span className={styles['cart-empty-icon']} aria-hidden="true">🧺</span>
              <p>Tu canasta está vacía</p>
              <span>Agrega productos frescos desde el catálogo</span>
              <button
                type="button"
                className={styles['btn-secondary']}
                onClick={() => setCartOpen(false)}
              >
                Explorar productos
              </button>
            </div>
          ) : (
            cart.map((item, index) => {
              const isRemoving = removingIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={[styles['cart-item-wrap'], isRemoving ? styles['removing'] : ''].filter(Boolean).join(' ')}
                >
                  <div className={styles['cart-item-clip']}>
                    <div
                      className={styles['cart-item']}
                      style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
                    >
                      <div className={styles['cart-item-image']}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className={styles['cart-item-img']} />
                        ) : (
                          <div className={[styles['cart-item-img'], styles['product-img-placeholder']].join(' ')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M8 10l2-2 4 4 2-2"/></svg>
                          </div>
                        )}
                      </div>
                      <div className={styles['cart-item-info']}>
                        <p className={styles['cart-item-name']}>{item.name}</p>
                        <p className={styles['cart-item-unit']}>{item.unit}</p>
                        <p className={styles['cart-item-price']}>{formatPrice(item.price * item.qty)}</p>
                        {item.qty >= item.stock && <p className={styles['card-stock']}>Máximo disponible</p>}
                      </div>
                      <div className={styles['cart-item-controls']}>
                        <button
                          type="button"
                          className={styles['qty-btn']}
                          onClick={() => handleDecrease(item)}
                          disabled={isRemoving}
                          aria-label="Quitar una unidad"
                        >
                          −
                        </button>
                        <span className={styles['qty-value']}>{item.qty}</span>
                        <button
                          type="button"
                          className={styles['qty-btn']}
                          onClick={() => changeQty(item.id, +1)}
                          disabled={isRemoving || item.qty >= item.stock}
                          aria-label="Agregar una unidad"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className={styles['cart-remove-btn']}
                        onClick={() => scheduleRemoval(item.id, () => removeFromCart(item.id))}
                        disabled={isRemoving}
                        aria-label="Eliminar"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className={styles['cart-drawer-footer']}>
            <div className={styles['cart-summary-row']}>
              <span>Subtotal</span>
              <span>{formatPrice(cartSubtotal)}</span>
            </div>
            <div className={styles['cart-summary-row']}>
              <span>Costo de domicilio</span>
              <span>{deliveryCost == null ? 'Calculando…' : formatPrice(deliveryCost)}</span>
            </div>
            <div className={styles['cart-summary-divider']} />
            <div className={[styles['cart-summary-row'], styles['cart-total-row']].join(' ')}>
              <span>Total</span>
              <span>{formatPrice(Math.round(animatedTotal))}</span>
            </div>
            <button
              type="button"
              className={[styles['btn-primary'], styles['btn-checkout']].join(' ')}
              onClick={onCheckout}
            >
              Realizar pedido →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CartDrawer(props) {
  if (!props.cartOpen) return null;
  return <CartDrawerContent {...props} />;
}
