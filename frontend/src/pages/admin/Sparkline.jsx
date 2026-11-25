import { useId } from 'react';
import styles from './Admin.module.css';

// Mini gráfica de línea SVG sin librerías para resumir los últimos 7 días
export default function Sparkline({ values, label = 'Ventas últimos 7 días' }) {
  const gradientId = useId();
  if (!values || values.length < 2) return null;

  const max = Math.max(...values);
  if (max <= 0) return null;

  const width = 80;
  const height = 24;
  const padX = 3;
  const padY = 3;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = values.map((v, i) => ({
    x: Number((padX + (i / (values.length - 1)) * innerW).toFixed(1)),
    y: Number((padY + innerH - (v / max) * innerH).toFixed(1)),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = `M ${first.x} ${height - 1} ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${last.x} ${height - 1} Z`;

  return (
    <div className={styles.sparkline} title={label}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={label}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-mid)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary-light)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last.x} cy={last.y} r="2.7" fill="var(--primary)" />
      </svg>
      <span className={styles['sparkline-tag']}>7 días</span>
    </div>
  );
}
