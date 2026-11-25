import { useRef, useState } from 'react';
import { prefersReducedMotion } from '../../utils/motion';
import styles from './Auth.module.css';

/**
 * Botón primario de autenticación con efecto ripple al hacer clic.
 * Respeta prefers-reduced-motion y limpia cada onda al terminar su animación CSS.
 */
export default function RippleButton({
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...rest
}) {
  const [ripples, setRipples] = useState([]);
  const nextIdRef = useRef(0);

  const handleClick = (e) => {
    if (!disabled && !prefersReducedMotion()) {
      const rect = e.currentTarget.getBoundingClientRect();
      // Si se activó con teclado (clientX/Y en 0), centrar el ripple en el botón
      const isKeyboard = e.clientX === 0 && e.clientY === 0;
      const x = isKeyboard ? rect.width / 2 : e.clientX - rect.left;
      const y = isKeyboard ? rect.height / 2 : e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;
      nextIdRef.current += 1;
      const id = nextIdRef.current;
      setRipples(prev => [...prev, { id, x, y, size }]);
    }
    if (onClick) onClick(e);
  };

  const removeRipple = (id) => {
    setRipples(prev => prev.filter(r => r.id !== id));
  };

  return (
    <button
      type={type}
      className={[styles['btn-primary'], className].filter(Boolean).join(' ')}
      disabled={disabled}
      onClick={handleClick}
      {...rest}
    >
      {children}
      {ripples.map(r => (
        <span
          key={r.id}
          className={styles['btn-ripple']}
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
          onAnimationEnd={() => removeRipple(r.id)}
          aria-hidden="true"
        />
      ))}
    </button>
  );
}
