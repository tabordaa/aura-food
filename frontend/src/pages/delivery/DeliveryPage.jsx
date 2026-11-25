import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import useCountUp from '../../hooks/useCountUp';
import { IconCheck, IconMapPin, IconPhone, IconTruck } from '../../components/Icons';
import { OrderMap } from '../../components/maps/LazyMaps';
import { directionsUrl, toLocation } from '../../utils/location';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { orderService } from '../../services/order.service';
import { formatOrderId, formatPrice, parseServerDate } from '../../utils/format';
import { prefersReducedMotion } from '../../utils/motion';
import SlideToDeliver from './SlideToDeliver';
import styles from './Delivery.module.css';

const PICKUP_ADDRESS = import.meta.env.VITE_PICKUP_ADDRESS || 'Punto de recogida Aura Food';
const REFRESH_MS = 20000;
const EXIT_ANIMATION_MS = 340;
const SKELETON_ITEMS = [0, 1];

const TABS = [
  { id: 'available', label: 'Disponibles' },
  { id: 'active',    label: 'En curso' },
  { id: 'history',   label: 'Historial' },
];

const STATUS_LABELS = {
  preparado: 'Listo para recoger',
  asignado:  'En camino',
  entregado: 'Entregado',
};

const EMPTY_STATES = {
  available: {
    title: 'Todo entregado por ahora 🎉',
    text: 'No hay pedidos esperando recogida. Tómate un respiro, aquí aparecerá el próximo en cuanto salga de tienda.',
  },
  active: {
    title: 'Todo entregado por ahora 🎉',
    text: 'No tienes entregas pendientes en tu ruta. Revisa “Disponibles” cuando quieras tomar un nuevo pedido.',
  },
  history: {
    title: 'Aún no tienes entregas registradas',
    text: 'Cada pedido que entregues quedará guardado aquí con su fecha y hora.',
  },
};

function formatDeliveredAt(value) {
  if (!value) return '';
  return parseServerDate(value).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function isDeliveredToday(value) {
  if (!value) return false;
  const date = parseServerDate(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function OrderCardSkeleton() {
  return (
    <article className={styles['skeleton-card']} aria-hidden="true">
      <div className={styles['order-header']}>
        <div className={styles['sk-stack']}>
          <span className={`skeleton ${styles['sk-label']}`} />
          <span className={`skeleton ${styles['sk-title']}`} />
        </div>
        <span className={`skeleton ${styles['sk-badge']}`} />
      </div>

      <div className={styles.route}>
        <div className={styles['route-stop']}>
          <span className={`skeleton ${styles['sk-circle']}`} />
          <div className={styles['sk-stack']}>
            <span className={`skeleton ${styles['sk-label']}`} />
            <span className={`skeleton ${styles['sk-address']}`} />
          </div>
        </div>
        <div className={styles['route-stop']}>
          <span className={`skeleton ${styles['sk-circle']}`} />
          <div className={styles['sk-stack']}>
            <span className={`skeleton ${styles['sk-label']}`} />
            <span className={`skeleton ${styles['sk-address']}`} />
          </div>
        </div>
      </div>

      <div className={styles['order-meta']}>
        <span className={`skeleton ${styles['sk-meta']}`} />
        <span className={`skeleton ${styles['sk-price']}`} />
      </div>

      <div className={`skeleton ${styles['sk-action']}`} />
    </article>
  );
}

function OrderCard({ order, mode, store, isUpdating, isExiting, onAction }) {
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
  const cash = order.payment_method === 'cash';
  const location = toLocation(order);
  const orderCode = formatOrderId(order.id);

  return (
    <div className={`${styles['order-slot']} ${isExiting ? styles['order-slot-exiting'] : ''}`}>
      <div className={styles['order-slot-inner']}>
        <article className={styles['order-card']}>
          <div className={styles['order-header']}>
            <div>
              <span className={styles['order-label']}>Pedido</span>
              <h2>{orderCode}</h2>
            </div>
            <span className={`${styles.status} ${styles[`status-${order.status}`]}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>

          <div className={styles.route}>
            <div className={styles['route-stop']}>
              <span className={`${styles['route-icon']} ${styles['pickup-icon']}`}>
                <IconMapPin size={18} />
              </span>
              <div>
                <span className={styles['route-label']}>Recoger en</span>
                <p>{store?.address || PICKUP_ADDRESS}</p>
              </div>
            </div>
            <div className={styles['route-line']} />
            <div className={styles['route-stop']}>
              <span className={`${styles['route-icon']} ${styles['delivery-icon']}`}>
                <IconMapPin size={18} />
              </span>
              <div>
                <span className={styles['route-label']}>Entregar en</span>
                <p>{order.delivery_address}</p>
              </div>
            </div>
          </div>

          {mode === 'active' && location && (
            <div className={styles['order-map']}>
              <OrderMap store={store} destination={location} height={180} />
              <a className={styles['directions-link']} href={directionsUrl(location)} target="_blank" rel="noreferrer">
                <IconMapPin size={14} /> Cómo llegar (Google Maps)
              </a>
            </div>
          )}

          {mode === 'active' && (order.phone || order.notes) && (
            <div className={styles['order-extra']}>
              {order.phone && (
                <a className={styles['phone-link']} href={`tel:${order.phone}`}>
                  <IconPhone size={14} /> {order.phone}
                </a>
              )}
              {order.notes && <p className={styles.notes}>“{order.notes}”</p>}
            </div>
          )}

          <div className={styles['order-meta']}>
            <span>
              {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
              {mode !== 'history' && (cash ? ' · Cobrar en efectivo' : ' · Ya pagado')}
            </span>
            <strong>{formatPrice(order.total_price)}</strong>
          </div>

          {mode === 'available' && (
            <button className={styles['deliver-button']} type="button" onClick={() => onAction(order)} disabled={isUpdating}>
              <IconTruck size={17} />
              {isUpdating ? 'Tomando...' : 'Tomar pedido'}
            </button>
          )}
          {mode === 'active' && (
            <SlideToDeliver
              onDeliver={() => onAction(order)}
              disabled={isUpdating || isExiting}
              orderLabel={orderCode}
            />
          )}
          {mode === 'history' && (
            <p className={styles['delivered-at']}>
              <IconCheck size={14} /> Entregado el {formatDeliveredAt(order.delivered_at)}
            </p>
          )}
        </article>
      </div>
    </div>
  );
}

export default function DeliveryPage() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState({ available: [], active: [], history: [] });
  const [tab, setTab] = useState('available');
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [exitingOrderId, setExitingOrderId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const exitTimerRef = useRef(null);
  const store = useStoreConfig()?.store;

  const loadOrders = useCallback(() => orderService.getCourierOrders()
    .then(data => { setGroups(data); setError(''); })
    .catch(loadError => setError(`No fue posible cargar los pedidos. ${loadError.message}`))
    .finally(() => {
      setLoading(false);
      setHasLoaded(true);
    }), []);

  // Carga inicial y refresco automático para ver los pedidos que la tienda va preparando
  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, REFRESH_MS);
    return () => {
      clearInterval(timer);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [loadOrders]);

  const refreshOrders = () => {
    setLoading(true);
    loadOrders();
  };

  const handleAction = async (order) => {
    const taking = tab === 'available';
    setUpdatingOrderId(order.id);
    setError('');
    setNotice('');
    try {
      if (taking) {
        await orderService.takeOrder(order.id);
        setNotice(`Tomaste el pedido ${formatOrderId(order.id)}. Lo encuentras en “En curso”.`);
        await loadOrders();
      } else {
        await orderService.deliverOrder(order.id);
        // La tarjeta sale con fade y colapso antes de desaparecer de la lista
        if (!prefersReducedMotion()) {
          setExitingOrderId(order.id);
          await new Promise(resolve => {
            exitTimerRef.current = setTimeout(resolve, EXIT_ANIMATION_MS);
          });
        }
        setNotice(`El pedido ${formatOrderId(order.id)} fue marcado como entregado.`);
        await loadOrders();
      }
      return true;
    } catch (actionError) {
      setError(`No fue posible actualizar el pedido ${formatOrderId(order.id)}. ${actionError.message}`);
      // Se recarga siempre: si otro domiciliario lo tomó primero, desaparece de "Disponibles"
      loadOrders();
      return false;
    } finally {
      setUpdatingOrderId(null);
      setExitingOrderId(null);
    }
  };

  const toDeliverCount = groups.active.length;
  const deliveredTodayCount = useMemo(
    () => groups.history.filter(order => isDeliveredToday(order.delivered_at)).length,
    [groups.history],
  );
  const animatedToDeliver = Math.round(useCountUp(toDeliverCount, 650));
  const animatedDeliveredToday = Math.round(useCountUp(deliveredTodayCount, 650));

  const orders = groups[tab];
  const empty = EMPTY_STATES[tab];

  return (
    <div className={styles['delivery-page']}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles['brand-icon']}><IconTruck size={20} /></span>
          {import.meta.env.VITE_APP_NAME || 'Aura Food'} | Repartidor
        </div>
        <div className={styles['topbar-actions']}>
          <span className={styles['role-label']}>{user?.name}</span>
          <button type="button" className={styles['logout-button']} onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles['page-heading']}>
          <div>
            <p className={styles.eyebrow}>OPERACIÓN DE ENTREGAS</p>
            <h1>Mis entregas</h1>
            <p className={styles.subtitle}>Toma los pedidos preparados, llévalos a su destino y desliza para entregar.</p>
          </div>
          <button className={styles['refresh-button']} type="button" onClick={refreshOrders} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar pedidos'}
          </button>
        </div>

        <section className={styles['summary-grid']} aria-label="Resumen de entregas">
          <div className={styles['summary-card']}>
            <div>
              <span className={styles['summary-label']}>Por entregar</span>
              {!hasLoaded ? (
                <span className={`skeleton ${styles['summary-skeleton']}`} aria-hidden="true" />
              ) : (
                <strong className={styles['summary-value']}>{animatedToDeliver}</strong>
              )}
              <span className={styles['summary-foot']}>
                {groups.available.length > 0
                  ? `${groups.available.length} disponibles para tomar`
                  : 'En tu ruta activa'}
              </span>
            </div>
            <span className={styles['summary-icon']} aria-hidden="true">
              <IconTruck size={20} />
            </span>
          </div>

          <div className={styles['summary-card']}>
            <div>
              <span className={styles['summary-label']}>Entregados hoy</span>
              {!hasLoaded ? (
                <span className={`skeleton ${styles['summary-skeleton']}`} aria-hidden="true" />
              ) : (
                <strong className={styles['summary-value']}>{animatedDeliveredToday}</strong>
              )}
              <span className={styles['summary-foot']}>
                {groups.history.length > 0
                  ? `${groups.history.length} en tu historial`
                  : 'Listo para tu primera entrega'}
              </span>
            </div>
            <span className={styles['summary-icon']} aria-hidden="true">
              <IconCheck size={20} />
            </span>
          </div>
        </section>

        <div className={styles.tabs} role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={[styles.tab, tab === t.id ? styles.active : ''].join(' ')}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'available' && groups.available.length > 0
                ? <b className={styles['tab-alert']}>{groups.available.length}</b>
                : <span className={styles['tab-count']}>({groups[t.id].length})</span>}
            </button>
          ))}
        </div>

        {error && <p className={styles['feedback-error']} role="alert">{error}</p>}
        {notice && <p className={styles['feedback-success']} role="status">{notice}</p>}

        {loading && orders.length === 0 ? (
          <section className={styles['orders-grid']} role="status" aria-busy="true" aria-label="Cargando pedidos">
            {SKELETON_ITEMS.map(item => <OrderCardSkeleton key={item} />)}
          </section>
        ) : orders.length === 0 ? (
          <div className={styles['empty-state']}>
            <span className={styles['empty-emoji']} aria-hidden="true">🛵</span>
            <h2>{empty.title}</h2>
            <p>{empty.text}</p>
          </div>
        ) : (
          <section key={tab} className={styles['orders-grid']} aria-label={TABS.find(t => t.id === tab).label}>
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                mode={tab}
                store={store}
                isUpdating={updatingOrderId === order.id}
                isExiting={exitingOrderId === order.id}
                onAction={handleAction}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
