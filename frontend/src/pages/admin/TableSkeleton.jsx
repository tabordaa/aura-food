import styles from './Admin.module.css';

// Variaciones suaves de ancho para que las 5 filas de carga se vean naturales
const WIDTH_FACTORS = [1, 0.86, 0.94, 0.78, 0.9];

// 5 filas skeleton (.skeleton por celda) para las tablas del panel admin
export default function TableSkeleton({ columns, rows = 5 }) {
  return Array.from({ length: rows }, (_, rowIndex) => {
    const factor = WIDTH_FACTORS[rowIndex % WIDTH_FACTORS.length];
    return (
      <tr key={`skeleton-${rowIndex}`} className={styles['skeleton-row']} aria-hidden="true">
        {columns.map((col, colIndex) => {
          const width = Math.max(36, Math.round(col.width * factor));
          if (col.avatar) {
            return (
              <td key={colIndex}>
                <div className={styles['skeleton-media']}>
                  <span
                    className={`skeleton ${col.square ? styles['skeleton-thumb'] : styles['skeleton-avatar']}`}
                  />
                  <div className={styles['skeleton-stack']}>
                    <span className={`skeleton ${styles['skeleton-line']}`} style={{ width: `${width}px` }} />
                    <span className={`skeleton ${styles['skeleton-line-sm']}`} style={{ width: `${Math.round(width * 0.72)}px` }} />
                  </div>
                </div>
              </td>
            );
          }
          if (col.pill) {
            return (
              <td key={colIndex}>
                <span className={`skeleton ${styles['skeleton-pill']}`} style={{ width: `${width}px` }} />
              </td>
            );
          }
          if (col.twoLines) {
            return (
              <td key={colIndex}>
                <div className={styles['skeleton-stack']}>
                  <span className={`skeleton ${styles['skeleton-line']}`} style={{ width: `${width}px` }} />
                  <span className={`skeleton ${styles['skeleton-line-sm']}`} style={{ width: `${Math.round(width * 0.65)}px` }} />
                </div>
              </td>
            );
          }
          return (
            <td key={colIndex}>
              <span className={`skeleton ${styles['skeleton-line']}`} style={{ width: `${width}px` }} />
            </td>
          );
        })}
      </tr>
    );
  });
}
