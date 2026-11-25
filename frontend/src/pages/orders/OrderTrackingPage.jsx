import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { IconMapPin, IconPhone, IconCheck } from '../../components/Icons';
import { OrderMap } from '../../components/maps/LazyMaps';
import useOrderStatus from '../../hooks/useOrderStatus';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { orderService } from '../../services/order.service';
import {
  CLOSED_STATUSES, ORDER_STEPS, DELIVERY_MINUTES, PAYMENT_LABELS, stepIndex, formatPrice, formatOrderId, parseServerDate,
} from '../../utils/orders';
import { toLocation } from '../../utils/location';
import { launchConfetti } from '../../utils/motion';
import OrdersTopbar from './OrdersTopbar';
import OrderTimeline from './OrderTimeline';
import styles from './Orders.module.css';

const formatTime = (date) => date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

function formatPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : phone;
}

// Iconos y mensajes cercanos por estado para la línea de tiempo viva
const TRACKING_META = {
  pendiente: {
    icon: '🧺',
    headline: 'Recibimos tu pedido',
    desc: 'La tienda ya recibió tu orden y pronto comenzará a prepararla',
  },
  preparado: {
    icon: '📦',
    headline: 'Estamos preparando tu pedido',
    desc: 'Empacamos tus productos frescos y buscamos un domiciliario',
  },
  asignado: {
    icon: '🛵',
    headline: 'Tu pedido va en camino 🛵',
    desc: 'Un domiciliario ya va rumbo a tu dirección',
  },
  entregado: {
    icon: '✅',
    headline: '¡Entregado! Que lo disfrutes',
    desc: 'Tu pedido llegó a su destino. ¡Buen provecho!',
  },
};

const TIMELINE_STEPS = ORDER_STEPS.map(step => ({
  ...step,
  icon: TRACKING_META[step.status]?.icon || step.icon,
}));

export default function OrderTrackingPage() {
  const { id } = useParams();
  const { order, loading, notFound, error, updatedAt, replaceOrder } = useOrderStatus(id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');
  const [statusTracker, setStatusTracker] = useState({ orderId: null, status: null, poppedStatus: null });
  const prevStatusRef = useRef({ orderId: null, status: null });
  const celebratedOrderRef = useRef(null);
  const store = useStoreConfig()?.store;

  const orderId = order?.id ?? null;
  const orderStatus = order?.status ?? null;

  // Detecta cambios de estado durante el polling para animar el nuevo paso con af-pop
  if (orderId !== statusTracker.orderId || orderStatus !== statusTracker.status) {
    const changedLive = (
      orderId !== null
      && orderId === statusTracker.orderId
      && statusTracker.status !== null
      && orderStatus !== statusTracker.status
    );
    setStatusTracker({
      orderId,
      status: orderStatus,
      poppedStatus: changedLive ? orderStatus : null,
    });
  }

  // Si pasa a entregado mientras el usuario mira la pantalla, celebra con confeti una sola vez
  useEffect(() => {
    if (!orderId || !orderStatus) return;
    const prev = prevStatusRef.current;
    const becameDelivered = (
      prev.orderId === orderId
      && prev.status !== null
      && prev.status !== 'entregado'
      && orderStatus === 'entregado'
    );

    if (becameDelivered && celebratedOrderRef.current !== orderId) {
      celebratedOrderRef.current = orderId;
      launchConfetti();
    }

    prevStatusRef.current = { orderId, status: orderStatus };
  }, [orderId, orderStatus]);

  async function cancelOrder() {
    setCancelling(true);
    setActionError('');
    try {
      replaceOrder(await orderService.cancelOrder(order.id));
      setConfirmCancel(false);
    } catch (err) {
      setActionError(err instanceof TypeError ? 'Sin conexión con el servidor. Intenta de nuevo.' : err.message);
    } finally {
      setCancelling(false);
    }
  }

  let content;
  if (loading && !order) {
    content = (
      <div className={styles['skeleton-stack']} aria-busy="true" aria-label="Buscando tu pedido">
        <div className={styles['skeleton-hero']}>
          <div className={styles['skeleton-hero-main']}>
            <div className={['skeleton', styles['sk-meta']].join(' ')} />
            <div className={['skeleton', styles['sk-headline']].join(' ')} />
            <div className={['skeleton', styles['sk-sub']].join(' ')} />
          </div>
          <div className={['skeleton', styles['sk-eta']].join(' ')} />
        </div>
        <div className={['skeleton', styles['sk-timeline']].join(' ')} />
        <div className={styles.grid}>
          <div className={['skeleton', styles['sk-panel']].join(' ')} />
          <div className={['skeleton', styles['sk-panel']].join(' ')} />
        </div>
      </div>
    );
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
    const closed = CLOSED_STATUSES[order.status];
    const current = stepIndex(order.status);
    const meta = TRACKING_META[order.status];
    const step = closed || TIMELINE_STEPS[current];
    const headline = closed ? `Pedido ${closed.label.toLowerCase()}` : (meta?.headline || step.label);
    const description = order.status === 'rechazado' && order.rejection_reason
      ? order.rejection_reason
      : (closed ? closed.desc : (meta?.desc || step.desc));
    const delivered = order.status === 'entregado';
    const finished = delivered || Boolean(closed);
    const createdAt = parseServerDate(order.created_at);
    const eta = new Date(createdAt.getTime() + DELIVERY_MINUTES * 60000);
    const heroPopped = statusTracker.poppedStatus === order.status;

    const items = order.items.map(i => ({
      id: i.id,
      name: i.product_name || `Producto ${i.product_id}`,
      image: i.product_image_url,
      qty: i.quantity,
      price: i.price_at_purchase,
    }));
    const subtotal = items.reduce((acc, i) => acc + i.price * i.qty, 0);
    const deliveryFee = Number(order.delivery_fee) || 0;

    content = (
      <>
        {/* Estado actual */}
        <section className={[styles.hero, delivered ? styles.delivered : '', closed ? styles.closed : ''].filter(Boolean).join(' ')}>
          <div className={styles['hero-main']}>
            <p className={styles['hero-meta']}>
              Pedido <strong>{formatOrderId(order.id)}</strong> • Hecho a las {formatTime(createdAt)}
            </p>
            <div key={order.status} className={styles['hero-status']}>
              <span className={[styles['hero-icon'], heroPopped ? styles.popped : ''].filter(Boolean).join(' ')} aria-hidden="true">
                {step.icon}
              </span>
              <div>
                <h1>{headline}</h1>
                <p>{description}</p>
              </div>
            </div>
            <span className={styles.live}>
              {finished
                ? (closed ? <>Pedido {closed.label.toLowerCase()}</> : <><IconCheck size={12} /> Pedido finalizado</>)
                : <><span className={styles['live-dot']} aria-hidden="true" /> En vivo • actualizado {updatedAt ? formatTime(updatedAt) : ''}</>}
            </span>
            {error && <p className={styles['hero-error']}>{error}</p>}
          </div>
          <div className={styles.eta}>
            <small>{delivered ? 'Entregado' : closed ? 'Estado' : 'Llegada estimada'}</small>
            <strong>{delivered ? '✓' : closed ? step.icon : formatTime(eta)}</strong>
            {!finished && <span>{DELIVERY_MINUTES} min desde tu compra</span>}
          </div>
        </section>

        {/* Progreso (solo para pedidos que siguen el flujo normal) */}
        {!closed && (
          <OrderTimeline
            steps={TIMELINE_STEPS}
            current={current}
            delivered={delivered}
            poppedStatus={statusTracker.poppedStatus}
          />
        )}

        {/* Mapa: solo si el cliente marcó el punto de entrega y el pedido sigue activo */}
        {toLocation(order) && !finished && (
          <section className={styles.panel}>
            <h3>{order.status === 'asignado' ? 'Tu pedido va en camino a este punto' : 'Punto de entrega'}</h3>
            <OrderMap store={store} destination={toLocation(order)} />
          </section>
        )}

        <div className={styles.grid}>
          {/* Productos */}
          <section className={styles.panel}>
            <h3>Tu pedido</h3>
            <div className={styles.items}>
              {items.map(item => (
                <div key={item.id} className={styles.item}>
                  <span className={styles['item-emoji']}>{item.image ? <img src={item.image} alt="" /> : '🛒'}</span>
                  <span className={styles['item-name']}>{item.name} <em>x{item.qty}</em></span>
                  <span className={styles['item-price']}>{formatPrice(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            {deliveryFee > 0 && (
              <>
                <div className={styles.row}><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                <div className={styles.row}><span>Domicilio</span><span>{formatPrice(deliveryFee)}</span></div>
              </>
            )}
            <div className={[styles.row, styles['row-total']].join(' ')}><span>Total</span><span>{formatPrice(order.total_price)}</span></div>
          </section>

          {/* Entrega */}
          <section className={styles.panel}>
            <h3>Entrega</h3>
            <div className={styles.detail}>
              <span className={styles['detail-icon']}><IconMapPin size={16} /></span>
              <div><small>Dirección</small><p>{order.delivery_address}</p></div>
            </div>
            {order.phone && (
              <div className={styles.detail}>
                <span className={styles['detail-icon']}><IconPhone size={15} /></span>
                <div><small>Contacto</small><p>{formatPhone(order.phone)}</p></div>
              </div>
            )}
            {order.payment_method && (
              <div className={styles.detail}>
                <span className={styles['detail-icon']}>💳</span>
                <div><small>Pago</small><p>{PAYMENT_LABELS[order.payment_method] || order.payment_method}</p></div>
              </div>
            )}
            {order.courier && (
              <div className={styles.detail}>
                <span className={styles['detail-icon']}>🛵</span>
                <div><small>Domiciliario</small><p>{order.courier.name}</p></div>
              </div>
            )}
            {order.notes && (
              <div className={styles.detail}>
                <span className={styles['detail-icon']}>📝</span>
                <div><small>Indicaciones</small><p>{order.notes}</p></div>
              </div>
            )}
          </section>
        </div>

        {order.status === 'pendiente' && confirmCancel ? (
          <div className={styles.confirm}>
            <span>¿Seguro que quieres cancelar el pedido? Los productos vuelven a la tienda.</span>
            <button type="button" className={styles['btn-danger']} onClick={cancelOrder} disabled={cancelling}>
              {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
            </button>
            <button type="button" className={styles['btn-secondary']} onClick={() => setConfirmCancel(false)} disabled={cancelling}>
              No
            </button>
          </div>
        ) : (
          <div className={styles.actions}>
            <Link to="/catalog" className={styles['btn-primary']}>Seguir comprando</Link>
            <Link to="/pedidos" className={styles['btn-secondary']}>Ver todos mis pedidos</Link>
            {order.status === 'pendiente' && (
              <button type="button" className={styles['btn-cancel']} onClick={() => setConfirmCancel(true)}>
                Cancelar pedido
              </button>
            )}
          </div>
        )}
        {actionError && <p className={styles['action-error']} role="alert">{actionError}</p>}
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
