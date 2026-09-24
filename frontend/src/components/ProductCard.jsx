import { IconHeart, IconPlus } from './Icons';
import styles from '../pages/catalog/Catalog.module.css';

function formatPrice(n) {
  return '$' + n.toLocaleString('es-CO');
}

export default function ProductCard({ product, favorites, toggleFav, addToCart }) {
  const isFav = favorites.includes(product.id);

  return (
    <div className={styles['product-card']}>
      <div className={styles['card-image-area']}>
        <span className={[styles['card-tag'], product.oldPrice ? styles['tag-deal'] : ''].join(' ')}>
          {product.tag}
        </span>
        <span className={styles['product-emoji']}>{product.emoji}</span>
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
