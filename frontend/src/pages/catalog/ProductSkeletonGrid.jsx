import styles from './Catalog.module.css';

const SKELETON_COUNT = 8;

// Grilla de carga con la misma silueta de ProductCard para evitar saltos de diseño
export default function ProductSkeletonGrid() {
  return (
    <div className={styles['product-grid']} role="status" aria-label="Cargando productos frescos">
      {Array.from({ length: SKELETON_COUNT }, (_, idx) => (
        <div key={idx} className={[styles['product-card'], styles['skeleton-card']].join(' ')} aria-hidden="true">
          <div className={styles['card-image-area']}>
            <div className={['skeleton', styles['skeleton-img']].join(' ')} />
          </div>
          <div className={styles['card-body']}>
            <div className={['skeleton', styles['skeleton-line'], styles['skeleton-w-45']].join(' ')} />
            <div className={['skeleton', styles['skeleton-line-lg'], styles['skeleton-w-80']].join(' ')} />
            <div className={['skeleton', styles['skeleton-line'], styles['skeleton-w-35']].join(' ')} />
          </div>
          <div className={styles['card-footer']}>
            <div className={['skeleton', styles['skeleton-price']].join(' ')} />
            <div className={['skeleton', styles['skeleton-btn']].join(' ')} />
          </div>
        </div>
      ))}
    </div>
  );
}
