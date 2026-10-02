import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { IconCheck, IconMapPin, IconTruck } from '../../components/Icons';
import styles from './Delivery.module.css';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const PICKUP_ADDRESS = import.meta.env.VITE_PICKUP_ADDRESS || 'Punto de recogida Aura Food';
const ACTIVE_STATUSES = new Set(['preparado', 'asignado']);

async function requestJson(path, options) {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Error ${response.status} al comunicarse con el servidor.`);
  }
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

function normalizeStatus(status) {
  return String(status || '').toLowerCase();
}

function getOrderList(payload) {
  const orders = Array.isArray(payload) ? payload : payload?.items;
  if (!Array.isArray(orders)) {
    throw new Error('La respuesta de pedidos no tiene el formato esperado.');
  }
  return orders;
}

async function fetchDeliveryOrders() {
  const orders = getOrderList(await requestJson('/api/orders'));
  return orders
    .filter(order => ACTIVE_STATUSES.has(normalizeStatus(order.status)))
    .sort((first, second) => second.id - first.id);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function OrderCard({ order, isUpdating, onMarkDelivered }) {
  const status = normalizeStatus(order.status);
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((total, item) => total + (Number(item.quantity) || 0), 0)
    : 0;
  const pickupAddress = order.pickup_address || order.pickup_location || PICKUP_ADDRESS;
  const deliveryAddress = order.delivery_address || order.address || 'Dirección no disponible';

  return (
    <article className={styles['order-card']}>
      <div className={styles['order-header']}>
        <div>
          <span className={styles['order-label']}>Pedido</span>
          <h2>#{order.id}</h2>
        </div>
        <span className={`${styles['status']} ${styles[`status-${status}`]}`}>
          {status === 'preparado' ? 'Preparado' : 'Asignado'}
        </span>
      </div>

      <div className={styles['route']}>
        <div className={styles['route-stop']}>
          <span className={`${styles['route-icon']} ${styles['pickup-icon']}`}>
            <IconMapPin size={18} />
          </span>
          <div>
            <span className={styles['route-label']}>Recoger en</span>
            <p>{pickupAddress}</p>
          </div>
        </div>
        <div className={styles['route-line']} />
        <div className={styles['route-stop']}>
          <span className={`${styles['route-icon']} ${styles['delivery-icon']}`}>
            <IconMapPin size={18} />
          </span>
          <div>
            <span className={styles['route-label']}>Entregar en</span>
            <p>{deliveryAddress}</p>
          </div>
        </div>
      </div>

      <div className={styles['order-meta']}>
        <span>{itemCount} {itemCount === 1 ? 'producto' : 'productos'}</span>
        <strong>{formatCurrency(order.total_price)}</strong>
      </div>

      <button
        className={styles['deliver-button']}
        type="button"
        onClick={() => onMarkDelivered(order.id)}
        disabled={isUpdating}
      >
        <IconCheck size={17} />
        {isUpdating ? 'Actualizando...' : 'Marcar como Entregado'}
      </button>
    </article>
  );
}

export default function DeliveryPage() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await fetchDeliveryOrders());
    } catch (loadError) {
      setError(`No fue posible cargar los pedidos. ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const markAsDelivered = async (orderId) => {
    setUpdatingOrderId(orderId);
    setError('');
    setNotice('');
    try {
      await requestJson(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'entregado' }),
      });
      setOrders(currentOrders => currentOrders.filter(order => order.id !== orderId));
      setNotice(`El pedido #${orderId} fue marcado como entregado.`);
    } catch (updateError) {
      setError(`No fue posible actualizar el pedido #${orderId}. ${updateError.message}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className={styles['delivery-page']}>
      <header className={styles['topbar']}>
        <div className={styles['brand']}>
          <span className={styles['brand-icon']}><IconTruck size={20} /></span>
          {import.meta.env.VITE_APP_NAME || 'Aura Food'} | Repartidor
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span className={styles['role-label']}>{user?.name}</span>
          <button onClick={logout} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className={styles['content']}>
        <div className={styles['page-heading']}>
          <div>
            <p className={styles['eyebrow']}>OPERACIÓN DE ENTREGAS</p>
            <h1>Pedidos por entregar</h1>
            <p className={styles['subtitle']}>Recoge los pedidos preparados y llévalos a su destino.</p>
          </div>
          <button className={styles['refresh-button']} type="button" onClick={loadOrders} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar pedidos'}
          </button>
        </div>

        {error && <p className={styles['feedback-error']} role="alert">{error}</p>}
        {notice && <p className={styles['feedback-success']} role="status">{notice}</p>}

        {loading ? (
          <div className={styles['empty-state']} role="status">Cargando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className={styles['empty-state']}>
            <span className={styles['empty-icon']}><IconTruck size={26} /></span>
            <h2>No hay pedidos pendientes</h2>
            <p>Los pedidos preparados o asignados aparecerán aquí.</p>
          </div>
        ) : (
          <section className={styles['orders-grid']} aria-label="Pedidos preparados y asignados">
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                isUpdating={updatingOrderId === order.id}
                onMarkDelivered={markAsDelivered}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
