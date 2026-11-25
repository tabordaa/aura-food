import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CLOSED_STATUSES, formatOrderId, formatPrice, getStatusInfo, parseServerDate } from '../../utils/orders';
import { orderService } from '../../services/order.service';
import OrdersTopbar from './OrdersTopbar';
import styles from './Orders.module.css';

const SKELETON_ROWS = [0, 1, 2, 3];

function statusClass(status) {
  if (status === 'entregado') return styles['status-done'];
  if (CLOSED_STATUSES[status]) return styles['status-closed'];
  return '';
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    orderService.getMyOrders()
      .then(list => { if (!cancelled) setOrders(list); })
      .catch(() => { if (!cancelled) setError('No pudimos cargar tus pedidos. Intenta de nuevo en un momento.'); });
    return () => { cancelled = true; };
  }, []);

  let content;
  if (error) {
    content = <div className={styles['state-card']}><span className={styles['state-icon']}>📡</span><p>{error}</p></div>;
  } else if (!orders) {
    content = (
      <div className={styles.list} aria-busy="true" aria-label="Cargando tus pedidos">
        {SKELETON_ROWS.map(row => (
          <div key={row} className={styles['skeleton-row']}>
            <div className={['skeleton', styles['sk-thumbs']].join(' ')} />
            <div className={styles['sk-info']}>
              <div className={['skeleton', styles['sk-title']].join(' ')} />
              <div className={['skeleton', styles['sk-meta-line']].join(' ')} />
            </div>
            <div className={['skeleton', styles['sk-badge']].join(' ')} />
            <div className={['skeleton', styles['sk-total']].join(' ')} />
          </div>
        ))}
      </div>
    );
  } else if (orders.length === 0) {
    content = (
      <div className={[styles['state-card'], styles['empty-card']].join(' ')}>
        <span className={styles['empty-icon']} aria-hidden="true">📦</span>
        <h2>Aún no tienes pedidos</h2>
        <p>Cuando hagas tu primera compra podrás seguirla aquí en tiempo real.</p>
        <Link to="/catalog" className={styles['btn-primary']}>Ir al catálogo</Link>
      </div>
    );
  } else {
    content = (
      <div className={styles.list}>
        {orders.map((o, index) => {
          const step = getStatusInfo(o.status);
          const count = o.items.reduce((acc, i) => acc + i.quantity, 0);
          return (
            // Envoltorio separado para que la animación af-fade-up no bloquee el transform de :hover
            <div
              key={o.id}
              className={styles['order-item']}
              style={{ '--delay': `${Math.min(index, 8) * 55}ms` }}
            >
              <Link to={`/pedidos/${o.id}`} className={styles['order-row']}>
                <span className={styles['order-thumbs']}>
                  {o.items.slice(0, 3).map(i => (i.product_image_url
                    ? <img key={i.id} src={i.product_image_url} alt="" />
                    : <span key={i.id}>🛒</span>))}
                </span>
                <div className={styles['order-info']}>
                  <strong>Pedido {formatOrderId(o.id)}</strong>
                  <small>
                    {parseServerDate(o.created_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' • '}{count} producto{count !== 1 ? 's' : ''}
                  </small>
                </div>
                <span className={[styles.status, statusClass(o.status)].filter(Boolean).join(' ')}>
                  {step.icon} {step.label}
                </span>
                <span className={styles['order-total']}>{formatPrice(o.total_price)}</span>
                <span className={styles['order-arrow']} aria-hidden="true">→</span>
              </Link>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <OrdersTopbar />
      <main className={styles.container}>
        <div className={styles['list-head']}>
          <h1>Mis pedidos</h1>
          <p>Sigue el estado de tus compras en tiempo real</p>
        </div>
        {content}
      </main>
    </div>
  );
}
