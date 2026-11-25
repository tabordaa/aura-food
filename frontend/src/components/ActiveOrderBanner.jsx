import { Link } from 'react-router';
import useOrderStatus from '../hooks/useOrderStatus';
import { ORDER_STEPS, formatOrderId, isActiveOrder, stepIndex } from '../utils/orders';
import styles from '../pages/orders/Orders.module.css';

// Iconos alineados con la línea de tiempo del seguimiento
const STEP_ICONS = {
  pendiente: '🧺',
  preparado: '📦',
  asignado: '🛵',
  entregado: '✅',
};

// Aviso en la portada con el estado en vivo del último pedido (se oculta al terminar)
export default function ActiveOrderBanner({ orderId }) {
  const { order } = useOrderStatus(orderId);
  if (!order || !isActiveOrder(order.status)) return null;

  const current = stepIndex(order.status);
  const step = ORDER_STEPS[current];
  const icon = STEP_ICONS[order.status] || step.icon;

  return (
    <Link to={`/pedidos/${order.id}`} className={styles['active-banner']}>
      <span className={styles['active-banner-icon']} aria-hidden="true">{icon}</span>
      <div className={styles['active-banner-text']}>
        <div className={styles['active-banner-head']}>
          <strong>Tu pedido {formatOrderId(order.id)} • {step.label}</strong>
          <span className={styles['active-banner-live']}>
            <span className={styles['live-dot']} aria-hidden="true" />
            En vivo
          </span>
        </div>
        <span>{step.desc}</span>
        <div className={styles['active-banner-bar']} aria-hidden="true">
          {ORDER_STEPS.map((s, i) => (
            <span key={s.status} className={i <= current ? styles.filled : ''} />
          ))}
        </div>
      </div>
      <span className={styles['active-banner-cta']}>Ver seguimiento →</span>
    </Link>
  );
}
