// Utilidades de animación sin librerías. Todas respetan prefers-reduced-motion.

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const BRAND_COLORS = ['#1B5E35', '#3D9970', '#E8F5EE', '#FFC94D', '#FF8A65'];

/** Lanza confeti en un canvas temporal a pantalla completa. */
export function launchConfetti({ particles = 140, duration = 2600 } = {}) {
  if (prefersReducedMotion()) return;
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '9999' });
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const pieces = Array.from({ length: particles }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 120,
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    size: Math.random() * 7 + 4,
    rot: Math.random() * Math.PI,
    vrot: (Math.random() - 0.5) * 0.3,
    color: BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)],
  }));

  const start = performance.now();
  const frame = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
    pieces.forEach(p => {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
    if (elapsed < duration) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** Hace "volar" una imagen (o un círculo verde) desde `fromEl` hasta el elemento con [data-cart-target]. */
export function flyToCart(fromEl, imageUrl) {
  const target = document.querySelector('[data-cart-target]');
  if (!fromEl || !target || prefersReducedMotion()) return;
  const from = fromEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = 56;

  const node = document.createElement(imageUrl ? 'img' : 'div');
  if (imageUrl) node.src = imageUrl;
  Object.assign(node.style, {
    position: 'fixed', left: `${from.left + from.width / 2 - size / 2}px`, top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`, height: `${size}px`, borderRadius: '50%', objectFit: 'cover', background: 'var(--primary-mid)',
    boxShadow: '0 6px 20px rgba(27,94,53,0.25)', zIndex: '9999', pointerEvents: 'none',
  });
  document.body.appendChild(node);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = node.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(0.7)`, opacity: 0.9, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0.3 },
    ],
    { duration: 700, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' },
  );
  animation.onfinish = () => {
    node.remove();
    target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 350, easing: 'ease-out' });
  };
}
