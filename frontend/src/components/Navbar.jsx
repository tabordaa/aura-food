import { IconCart, IconSearch } from './Icons';
import styles from '../pages/catalog/Catalog.module.css';

export default function Navbar({ search, setSearch, cartCount, setCartOpen, navigate }) {
  return (
    <nav className={styles['navbar']}>
      <div className={styles['brand']}>
        <IconCart size={22} /> {import.meta.env.VITE_APP_NAME || 'Aura Food'}
      </div>
      <div className={styles['navbar-search']}>
        <span className={styles['search-icon']}><IconSearch size={16} /></span>
        <input 
          type="text" 
          placeholder="Buscar productos..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>
      <div className={styles['navbar-actions']}>
        <button className={styles['cart-btn']} aria-label="Carrito" onClick={() => setCartOpen(true)}>
          <IconCart size={22} />
          {cartCount > 0 && <span className={styles['cart-badge']}>{cartCount}</span>}
        </button>
        <button className={styles['user-btn']} onClick={() => navigate('/login')}>
          <div className={styles['user-avatar']}>M</div>
          María
        </button>
      </div>
    </nav>
  );
}
