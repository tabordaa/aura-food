import { IconCheck } from '../../components/Icons';
import styles from './Orders.module.css';

// Línea de tiempo viva del pedido: horizontal en escritorio (scaleX) y vertical en móvil (scaleY)
export default function OrderTimeline({ steps, current, delivered, poppedStatus }) {
  const maxIndex = Math.max(1, steps.length - 1);
  const progressRatio = delivered ? 1 : current / maxIndex;

  return (
    <section className={styles.panel} aria-label="Progreso del pedido">
      <ol className={styles.progress} style={{ '--progress': progressRatio }}>
        {steps.map((step, index) => {
          const isDone = index < current || delivered;
          const isCurrent = index === current && !delivered;
          const isPopped = poppedStatus === step.status;

          return (
            <li
              key={step.status}
              className={[
                styles['progress-step'],
                isDone ? styles.done : '',
                isCurrent ? styles.current : '',
                isPopped ? styles.popped : '',
              ].filter(Boolean).join(' ')}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className={styles['progress-dot']} aria-hidden="true">
                {isDone ? <IconCheck size={16} /> : step.icon}
              </span>
              <div className={styles['progress-copy']}>
                <strong>{step.label}</strong>
                <small>{step.desc}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
