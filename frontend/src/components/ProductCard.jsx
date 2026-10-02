import { useState } from 'react';
import { IconHeart, IconPlus } from './Icons';
import styles from '../pages/catalog/Catalog.module.css';

function formatPrice(n) {
  return '$' + n.toLocaleString('es-CO');
}

export default function ProductCard({ product, favorites, toggleFav, addToCart }) {
  const [imgError, setImgError] = useState(false);
  const isFav = favorites.includes(product.id);

  return (
    <div className={styles['product-card']}>
      <div className={styles['card-image-area']}>
        <span className={[styles['card-tag'], product.oldPrice ? styles['tag-deal'] : ''].join(' ')}>
          {product.tag}
        </span>
        {product.image_url && !imgError ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className={styles['product-img']} 
            style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }} 
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles['product-img-placeholder']} style={{ width: '100%', height: '100px', background: '#f0f0f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M8 10l2-2 4 4 2-2"/></svg>
          </div>
        )}
        <button 
          className={[styles['card-fav'], isFav ? styles.active : ''].join(' ')} 
          onClick={() => toggleFav(product.id)} 
          aria-label="Favorito"
        >
          <IconHeart size={14} filled={isFav} />
        </button>
      </div>
      <div className={styles['card-body']}>
        <p className={styles['card-origin']}>{product.origin}</p>
        <p className={styles['card-name']}>{product.name}</p>
        <p className={styles['card-unit']}>{product.unit}</p>
      </div>
      <div className={styles['card-footer']}>
        <div className={styles['card-price-group']}>
          <span className={styles['card-price-label']}>Precio</span>
          {product.oldPrice && <span className={styles['card-price-old']}>{formatPrice(product.oldPrice)}</span>}
          <span className={styles['card-price']}>{formatPrice(product.price)}</span>
        </div>
        <button className={styles['btn-add']} onClick={() => addToCart(product)}>
          Agregar <IconPlus size={13} />
        </button>
      </div>
    </div>
  );
}
