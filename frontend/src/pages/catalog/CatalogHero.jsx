import { useRef, useState } from 'react';
import { IconBolt, IconCheck, IconPlus, IconTruck } from '../../components/Icons';
import { useAuth } from '../../hooks/useAuth';
import { formatPrice } from '../../utils/orders';
import { flyToCart } from '../../utils/motion';
import styles from './Catalog.module.css';

// Saludo cercano según la hora local del cliente
function getTimeGreeting(hour) {
  if (hour < 12) return { greeting: 'Buenos días', subtitle: 'empieza con productos frescos directo del campo.' };
  if (hour < 19) return { greeting: 'Buenas tardes', subtitle: 'recibe tu mercado fresco en minutos.' };
  return { greeting: 'Buenas noches', subtitle: 'haz tu pedido hoy y disfrútalo sin salir de casa.' };
}

export default function CatalogHero({ dealProduct, loading, inCart = 0, addToCart, changeQty }) {
  const { user } = useAuth();
  const [failedImgUrl, setFailedImgUrl] = useState(null);
  const [hour] = useState(() => new Date().getHours());
  const dealImgRef = useRef(null);

  const firstName = String(user?.name || '').trim().split(/\s+/)[0] || 'Invitado';
  const { greeting, subtitle } = getTimeGreeting(hour);

  const imgError = Boolean(dealProduct?.image_url) && failedImgUrl === dealProduct.image_url;
  const soldOut = dealProduct ? dealProduct.stock === 0 : false;
  const maxedOut = dealProduct ? !soldOut && inCart >= dealProduct.stock : false;
  const discountPct = dealProduct && dealProduct.old_price > dealProduct.price
    ? Math.round(((dealProduct.old_price - dealProduct.price) / dealProduct.old_price) * 100)
    : 0;

  const handleAddDeal = (e) => {
    if (!dealProduct || soldOut || maxedOut) return;
    flyToCart(dealImgRef.current || e.currentTarget, imgError ? null : dealProduct.image_url);
    addToCart(dealProduct);
  };

  return (
    <section className={styles['welcome-banner']} aria-label="Bienvenida y oferta del día">
      <div className={styles['banner-left']}>
        <div className={styles['banner-badge']}><IconTruck size={13} /> Domicilio a tu puerta</div>
        <h1>Hola, {firstName} 👋</h1>
        <p className={styles['hero-subtitle']}>
          <strong>{greeting}</strong>, {subtitle}
        </p>
        <div className={styles['banner-meta']}>
          <span><IconCheck size={13} /> 100% Calidad local</span>
          <span><IconBolt size={13} /> Entrega express 45 min</span>
        </div>
      </div>

      {loading ? (
        <div className={styles['hero-deal']} aria-hidden="true">
          <div className={styles['hero-deal-head']}>
            <div className={['skeleton', styles['skeleton-line'], styles['skeleton-w-45']].join(' ')} />
            <div className={['skeleton', styles['hero-deal-badge-skel']].join(' ')} />
          </div>
          <div className={styles['hero-deal-body']}>
            <div className={['skeleton', styles['hero-deal-thumb']].join(' ')} />
            <div className={styles['hero-deal-info']}>
              <div className={['skeleton', styles['skeleton-line-lg'], styles['skeleton-w-80']].join(' ')} />
              <div className={['skeleton', styles['skeleton-line'], styles['skeleton-w-45']].join(' ')} />
            </div>
          </div>
        </div>
      ) : dealProduct ? (
        <div className={styles['hero-deal']}>
          <div className={styles['hero-deal-head']}>
            <span className={styles['hero-deal-label']}>Oferta del día</span>
            {discountPct > 0 && (
              <span className={styles['hero-deal-badge']}>-{discountPct}%</span>
            )}
          </div>
          <div className={styles['hero-deal-body']}>
            <div ref={dealImgRef} className={styles['hero-deal-thumb']}>
              {dealProduct.image_url && !imgError ? (
                <img
                  src={dealProduct.image_url}
                  alt={dealProduct.name}
                  className={styles['hero-deal-img']}
                  onError={() => setFailedImgUrl(dealProduct.image_url)}
                />
              ) : (
                <div className={styles['hero-deal-placeholder']}>🥬</div>
              )}
            </div>
            <div className={styles['hero-deal-info']}>
              <p className={styles['hero-deal-name']}>{dealProduct.name}</p>
              <p className={styles['hero-deal-unit']}>{dealProduct.unit}</p>
              <div className={styles['hero-deal-prices']}>
                <span className={styles['hero-deal-old']}>{formatPrice(dealProduct.old_price)}</span>
                <span className={styles['hero-deal-price']}>{formatPrice(dealProduct.price)}</span>
              </div>
            </div>
          </div>
          <div className={styles['hero-deal-actions']}>
            {!soldOut && inCart > 0 && changeQty ? (
              <div className={[styles['card-stepper'], styles['hero-deal-stepper']].join(' ')}>
                <button
                  type="button"
                  className={styles['card-stepper-btn']}
                  onClick={() => changeQty(dealProduct.id, -1)}
                  aria-label={`Quitar una unidad de ${dealProduct.name}`}
                >
                  −
                </button>
                <span key={inCart} className={styles['card-stepper-qty']}>{inCart}</span>
                <button
                  type="button"
                  className={styles['card-stepper-btn']}
                  onClick={handleAddDeal}
                  disabled={maxedOut}
                  aria-label={`Agregar una unidad de ${dealProduct.name}`}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={[styles['btn-add'], styles['hero-deal-btn']].join(' ')}
                onClick={handleAddDeal}
                disabled={soldOut || maxedOut}
              >
                {soldOut ? 'Agotado' : <>Agregar oferta <IconPlus size={13} /></>}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={styles['banner-right']} aria-hidden="true">🥦🍅<br />🥑🍞</div>
      )}
    </section>
  );
}
