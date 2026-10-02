import styles from '../pages/catalog/Catalog.module.css';

function formatPrice(n) {
  return '$' + n.toLocaleString('es-CO');
}

export default function CartDrawer({ 
  cartOpen, 
  setCartOpen, 
  cart, 
  cartCount, 
  cartSubtotal, 
  deliveryCost, 
  cartTotal, 
  changeQty,
  removeFromCart,
  onCheckout
}) {
  if (!cartOpen) return null;

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
          <button className={styles['cart-close-btn']} onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">✕</button>
        </div>

        {/* Items */}
        <div className={styles['cart-drawer-items']}>
          {cart.length === 0 ? (
            <div className={styles['cart-empty']}>
              <span className={styles['cart-empty-icon']}>🛒</span>
              <p>Tu carrito está vacío</p>
              <span>Agrega productos desde el catálogo</span>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className={styles['cart-item']}>
                <div className={styles['cart-item-image']}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', background: '#f0f0f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M8 10l2-2 4 4 2-2"/></svg>
                    </div>
                  )}
                </div>
                <div className={styles['cart-item-info']}>
                  <p className={styles['cart-item-name']}>{item.name}</p>
                  <p className={styles['cart-item-unit']}>{item.unit}</p>
                  <p className={styles['cart-item-price']}>{formatPrice(item.price * item.qty)}</p>
                </div>
                <div className={styles['cart-item-controls']}>
                  <button className={styles['qty-btn']} onClick={() => changeQty(item.id, -1)}>−</button>
                  <span className={styles['qty-value']}>{item.qty}</span>
                  <button className={styles['qty-btn']} onClick={() => changeQty(item.id, +1)}>+</button>
                </div>
                <button className={styles['cart-remove-btn']} onClick={() => removeFromCart(item.id)} aria-label="Eliminar">🗑</button>
              </div>
            ))
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
              <span>{formatPrice(deliveryCost)}</span>
            </div>
            <div className={styles['cart-summary-divider']} />
            <div className={[styles['cart-summary-row'], styles['cart-total-row']].join(' ')}>
              <span>Total</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>
            <button 
              className={styles['btn-primary']} 
              style={{ marginTop: '16px', marginBottom: 0 }}
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
