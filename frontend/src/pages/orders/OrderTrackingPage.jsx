import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconMapPin, IconPhone, IconCheck } from '../../components/Icons';
import useOrderStatus from '../../hooks/useOrderStatus';
import {
  ORDER_STEPS, DELIVERY_MINUTES, stepIndex, formatPrice, formatOrderId, getSavedOrder,
} from '../../utils/orders';
import OrdersTopbar from './OrdersTopbar';
import styles from './Orders.module.css';

// El backend guarda la fecha en UTC sin zona horaria
function parseServerDate(value) {
  return new Date(/(Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + 'Z');
}

const formatTime = (date) => date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

export default function OrderTrackingPage() {
  const { id } = useParams();
  const { order, loading, notFound, error, updatedAt } = useOrderStatus(id);
  const saved = useMemo(() => getSavedOrder(id), [id]);

  let content;
  if (loading && !order) {
    content = <div className={styles['state-card']}><span className={styles.spinner} /> Buscando tu pedido…</div>;
  } else if (notFound) {
    content = (
      <div className={styles['state-card']}>
        <span className={styles['state-icon']}>🔎</span>
        <h2>No encontramos el pedido {formatOrderId(id)}</h2>
        <p>Revisa el número o mira la lista de tus pedidos.</p>
        <Link to="/pedidos" className={styles['btn-primary']}>Ver mis pedidos</Link>
      </div>
    );
  } else if (!order) {
    content = <div className={styles['state-card']}><span className={styles['state-icon']}>📡</span><p>{error}</p></div>;
  } else {
    const current = stepIndex(order.status);
    const step = ORDER_STEPS[current];
    const delivered = order.status === 'entregado';
    const createdAt = parseServerDate(order.created_at);
    const eta = new Date(createdAt.getTime() + DELIVERY_MINUTES * 60000);

    const items = saved?.items ?? order.items.map(i => ({
      id: i.product_id, emoji: '🛒', name: `Producto ${i.product_id}`, qty: i.quantity, price: i.price_at_purchase,
    }));
    const total = saved?.total ?? order.total_price;

    content = (
      <>
        {/* Estado actual */}
        <section className={[styles.hero, delivered ? styles.delivered : ''].join(' ')}>
          <div className={styles['hero-main']}>
            <p className={styles['hero-meta']}>
              Pedido <strong>{formatOrderId(order.id)}</strong> • Hecho a las {formatTime(createdAt)}
            </p>
            <div className={styles['hero-status']}>
              <span className={styles['hero-icon']}>{step.icon}</span>
              <div>
                <h1>{step.label}</h1>
                <p>{step.desc}</p>
              </div>
            </div>
            <span className={styles.live}>
              {delivered
                ? <><IconCheck size={12} /> Pedido finalizado</>
                : <><span className={styles['live-dot']} /> En vivo • actualizado {updatedAt ? formatTime(updatedAt) : ''}</>}
            </span>
            {error && <p className={styles['hero-error']}>{error}</p>}
          </div>
          <div className={styles.eta}>
            <small>{delivered ? 'Entregado' : 'Llegada estimada'}</small>
            <strong>{delivered ? '✓' : formatTime(eta)}</strong>
            {!delivered && <span>{DELIVERY_MINUTES} min desde tu compra</span>}
          </div>
        </section>

        {/* Progreso */}
        <section className={styles.panel}>
          <ol className={styles.progress} style={{ '--progress': `${(current / (ORDER_STEPS.length - 1)) * 100}%` }}>
            {ORDER_STEPS.map((s, i) => (
              <li
                key={s.status}
                className={[
                  styles['progress-step'],
                  i < current || delivered ? styles.done : '',
                  i === current && !delivered ? styles.current : '',
                ].join(' ')}
              >
                <span className={styles['progress-dot']}>{i < current || delivered ? <IconCheck size={14} /> : s.icon}</span>
                <strong>{s.label}</strong>
                <small>{s.desc}</small>
              </li>
            ))}
          </ol>
        </section>

        <div className={styles.grid}>
          {/* Productos */}
          <section className={styles.panel}>
            <h3>Tu pedido</h3>
            <div className={styles.items}>
              {items.map(item => (
                <div key={item.id} className={styles.item}>
                  <span className={styles['item-emoji']}>{item.emoji}</span>
                  <span className={styles['item-name']}>{item.name} <em>x{item.qty}</em></span>
                  <span className={styles['item-price']}>{formatPrice(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            {saved && (
              <>
                <div className={styles.row}><span>Subtotal</span><span>{formatPrice(saved.subtotal)}</span></div>
                <div className={styles.row}><span>Domicilio</span><span>{formatPrice(saved.deliveryCost)}</span></div>
              </>
            )}
            <div className={[styles.row, styles['row-total']].join(' ')}><span>Total</span><span>{formatPrice(total)}</span></div>
          </section>

          {/* Entrega */}
          <section className={styles.panel}>
            <h3>Entrega</h3>
            <div className={styles.detail}>
              <span className={styles['detail-icon']}><IconMapPin size={16} /></span>
              <div><small>Dirección</small><p>{order.delivery_address}</p></div>
            </div>
            {saved?.phone && (
              <div className={styles.detail}>
                <span className={styles['detail-icon']}><IconPhone size={15} /></span>
                <div><small>Contacto</small><p>{saved.phone}</p></div>
              </div>
            )}
            {saved?.paymentLabel && (
              <div className={styles.detail}>
                <span className={styles['detail-icon']}>💳</span>
                <div>
                  <small>Pago</small>
                  <p>{saved.paymentLabel}{saved.change > 0 ? ` • cambio de ${formatPrice(saved.change)}` : ''}</p>
                </div>
              </div>
            )}
            {saved?.notes && (
              <div className={styles.detail}>
                <span className={styles['detail-icon']}>📝</span>
                <div><small>Indicaciones</small><p>{saved.notes}</p></div>
              </div>
            )}
          </section>
        </div>

        <div className={styles.actions}>
          <Link to="/catalog" className={styles['btn-primary']}>Seguir comprando</Link>
          <Link to="/pedidos" className={styles['btn-secondary']}>Ver todos mis pedidos</Link>
        </div>
      </>
    );
  }

  return (
    <div className={styles.page}>
      <OrdersTopbar />
      <main className={styles.container}>{content}</main>
    </div>
  );
}
