import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ORDER_STEPS, fetchOrder, formatOrderId, formatPrice, getSavedOrders, stepIndex } from '../../utils/orders';
import OrdersTopbar from './OrdersTopbar';
import styles from './Orders.module.css';

export default function MyOrdersPage() {
  const [orders] = useState(getSavedOrders);
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(orders.map(o =>
      fetchOrder(o.id).then(r => [o.id, r ? r.status : 'missing']).catch(() => [o.id, null])
    )).then(entries => { if (!cancelled) setStatuses(Object.fromEntries(entries)); });
    return () => { cancelled = true; };
  }, [orders]);

  return (
    <div className={styles.page}>
      <OrdersTopbar />
      <main className={styles.container}>
        <div className={styles['list-head']}>
          <h1>Mis pedidos</h1>
          <p>Sigue el estado de tus compras en tiempo real</p>
        </div>

        {orders.length === 0 ? (
          <div className={styles['state-card']}>
            <span className={styles['state-icon']}>🛒</span>
            <h2>Aún no tienes pedidos</h2>
            <p>Cuando hagas tu primera compra la verás aquí.</p>
            <Link to="/catalog" className={styles['btn-primary']}>Ir a la tienda</Link>
          </div>
        ) : (
          <div className={styles.list}>
            {orders.map(o => {
              const status = statuses[o.id];
              const step = status && status !== 'missing' ? ORDER_STEPS[stepIndex(status)] : null;
              const count = o.items.reduce((acc, i) => acc + i.qty, 0);
              return (
                <Link key={o.id} to={`/pedidos/${o.id}`} className={styles['order-row']}>
                  <span className={styles['order-emojis']}>{o.items.slice(0, 3).map(i => i.emoji).join('')}</span>
                  <div className={styles['order-info']}>
                    <strong>Pedido {formatOrderId(o.id)}</strong>
                    <small>
                      {new Date(o.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                      {' • '}{count} producto{count !== 1 ? 's' : ''}
                    </small>
                  </div>
                  <span className={[styles.status, status === 'entregado' ? styles['status-done'] : ''].join(' ')}>
                    {step ? `${step.icon} ${step.label}` : status === 'missing' ? 'No disponible' : '…'}
                  </span>
                  <span className={styles['order-total']}>{formatPrice(o.total)}</span>
                  <span className={styles['order-arrow']}>→</span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
